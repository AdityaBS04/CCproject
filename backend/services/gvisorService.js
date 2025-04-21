const Docker = require('dockerode');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { logger } = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');

// Create Docker client
const docker = new Docker({ socketPath: '/var/run/docker.sock' });

// Base images for different languages
const BASE_IMAGES = {
  javascript: 'node:16-alpine',
  python: 'python:3.9-alpine'
};

// Create temporary directory for function files
const createTempDirectory = async (functionId) => {
  const tempDir = path.join('/tmp', `function-gvisor-${functionId}-${uuidv4()}`);
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  return tempDir;
};

// Create Dockerfile for function
const createDockerfile = (tempDir, language, code) => {
  let dockerfileContent = '';
  
  if (language === 'javascript') {
    // Create function.js file directly
    const functionJs = `
module.exports = async (event) => {
${code}
};
`;
    
    fs.writeFileSync(path.join(tempDir, 'function.js'), functionJs);
    
    // Create Dockerfile - use tail -f to keep container running
    dockerfileContent = `FROM ${BASE_IMAGES.javascript}
WORKDIR /app
COPY function.js .
CMD ["tail", "-f", "/dev/null"]
`;
  } else if (language === 'python') {
    // Create function.py
    const functionPy = `
def handler(event):
${code}
`;
    
    fs.writeFileSync(path.join(tempDir, 'function.py'), functionPy);
    
    // Create Dockerfile - use tail -f to keep container running
    dockerfileContent = `FROM ${BASE_IMAGES.python}
WORKDIR /app
COPY function.py .
CMD ["tail", "-f", "/dev/null"]
`;
  }
  
  fs.writeFileSync(path.join(tempDir, 'Dockerfile'), dockerfileContent);
  
  return tempDir;
};

// Build Docker image for function
const buildFunctionImage = async (function_) => {
  try {
    // For Python functions, we don't need to build an image
    // We'll execute directly on the host
    if (function_.language === 'python') {
      return `function-gvisor-${function_.name}:direct-exec`;
    }
    
    const tempDir = await createTempDirectory(function_._id);
    createDockerfile(tempDir, function_.language, function_.code);
    
    const imageTag = `function-gvisor-${function_.name}:${Date.now()}`;
    
    logger.info(`Building Docker image ${imageTag} for function ${function_.name}`);
    
    // Build Docker image
    await new Promise((resolve, reject) => {
      docker.buildImage({
        context: tempDir,
        src: fs.readdirSync(tempDir)
      }, { t: imageTag }, (err, stream) => {
        if (err) {
          return reject(err);
        }
        
        docker.modem.followProgress(stream, (err, res) => {
          if (err) {
            return reject(err);
          }
          resolve(res);
        });
      });
    });
    
    // Clean up temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });
    
    return imageTag;
  } catch (error) {
    logger.error(`Error building Docker image: ${error.message}`);
    throw error;
  }
};

// Run function in Docker container or directly
const runFunction = async (function_, payload, requestId) => {
  // Special case for Python: execute directly without container
  if (function_.language === 'python') {
    return runPythonFunctionDirectly(function_, payload, requestId);
  }
  
  // For JavaScript, use Docker container approach
  try {
    // Create container
    const container = await docker.createContainer({
      Image: function_.imageId,
      Env: Object.entries(function_.environment).map(([key, value]) => `${key}=${value}`),
      HostConfig: {
        Memory: 128 * 1024 * 1024, // 128MB limit
        MemorySwap: 128 * 1024 * 1024, // No swap
        CpuPeriod: 100000,
        CpuQuota: 50000, // 50% CPU limit
      },
      Labels: {
        'function_id': function_._id.toString(),
        'request_id': requestId,
        'runtime': 'gvisor'
      }
    });
    
    // Start container
    await container.start();
    
    // Wait a moment for container to fully start
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Verify container is running before proceeding
    const containerInfo = await container.inspect();
    if (!containerInfo.State.Running) {
      // Get container logs to diagnose why it exited
      const logs = await container.logs({
        stdout: true,
        stderr: true,
        follow: false,
        tail: 50 // Get last 50 log lines
      });
      
      const logOutput = logs.toString('utf8');
      logger.error(`Container failed to start. Logs: ${logOutput}`);
      throw new Error(`Container failed to start. Status: ${containerInfo.State.Status}. Exit code: ${containerInfo.State.ExitCode}`);
    }
    
    // Get container stats before execution
    const statsBefore = await container.stats({ stream: false });
    
    // Execute function directly using exec
    const startTime = Date.now();
    
    // JavaScript exec command
    const execCommand = [
      'node', 
      '-e', 
      `
      const fn = require('/app/function.js');
      const payload = ${JSON.stringify(payload)};
      
      async function run() {
        try {
          const result = await fn(payload);
          console.log(JSON.stringify(result));
        } catch (error) {
          console.error(error.message);
          process.exit(1);
        }
      }
      
      run();
      `
    ];
    
    logger.info(`Executing ${function_.language} function directly in container`);
    
    const exec = await container.exec({
      Cmd: execCommand,
      AttachStdout: true,
      AttachStderr: true
    });
    
    const execStream = await exec.start();
    
    // Collect output
    let stdout = '';
    let stderr = '';
    
    execStream.on('data', (chunk) => {
      // Simple output collection, may need adjustment for your Docker version
      const str = chunk.toString();
      if (str.startsWith('\u0001')) {
        stdout += str.slice(8);  // stdout
      } else if (str.startsWith('\u0002')) {
        stderr += str.slice(8);  // stderr
      } else {
        stdout += str;  // assume stdout if no marker
      }
    });
    
    // Wait for exec to complete
    await new Promise((resolve) => {
      execStream.on('end', resolve);
    });
    
    const executionTime = Date.now() - startTime;
    
    // Get container stats after execution
    const statsAfter = await container.stats({ stream: false });
    
    // Calculate resource usage
    let memoryUsage = 0;
    let cpuUsage = 0;
    
    try {
      memoryUsage = statsAfter.memory_stats.usage - statsAfter.memory_stats.stats.cache;
      const cpuDelta = statsAfter.cpu_stats.cpu_usage.total_usage - statsBefore.cpu_stats.cpu_usage.total_usage;
      const systemDelta = statsAfter.cpu_stats.system_cpu_usage - statsBefore.cpu_stats.system_cpu_usage;
      cpuUsage = (cpuDelta / systemDelta) * statsAfter.cpu_stats.online_cpus * 100;
    } catch (error) {
      logger.warn(`Could not calculate resource usage: ${error.message}`);
    }
    
    // Process output
    stdout = stdout.trim();
    stderr = stderr.trim();
    
    // Stop and remove container
    try {
      await container.stop();
      await container.remove();
    } catch (error) {
      logger.warn(`Error cleaning up container: ${error.message}`);
    }
    
    if (stderr) {
      logger.error(`Function execution error: ${stderr}`);
      throw new Error(stderr);
    }
    
    let result;
    try {
      result = JSON.parse(stdout);
    } catch (error) {
      logger.error(`Error parsing function output: ${stdout}`);
      throw new Error(`Invalid function output: ${stdout}`);
    }
    
    return {
      data: result,
      executionTime,
      memoryUsage,
      cpuUsage,
      status: 'success',
      statusCode: 200
    };
  } catch (error) {
    logger.error(`Error running function: ${error.message}`);
    throw error;
  }
};

// Run Python function directly without container
const runPythonFunctionDirectly = async (function_, payload, requestId) => {
  try {
    logger.info('Executing Python function directly in backend container');
    
    // Create temporary Python file
    const tempDir = await createTempDirectory(function_._id);
    const pythonFile = path.join(tempDir, 'function.py');
    
    // Write the function code to the file
    // Write the function code to the file
const functionPy = `
def handler(event):
    ${function_.code.replace(/\n/g, '\n    ')}
`;
    fs.writeFileSync(pythonFile, functionPy);
    
    // Create a wrapper script that calls the function and prints result
    const wrapperFile = path.join(tempDir, 'wrapper.py');
    const payloadJson = JSON.stringify(payload).replace(/'/g, "\\'");
    
    const wrapperCode = `
import json
import sys
import os

# Add the current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from function import handler

try:
    payload = json.loads('${payloadJson}')
    result = handler(payload)
    print(json.dumps(result))
except Exception as e:
    print(f"Error: {str(e)}", file=sys.stderr)
    sys.exit(1)
`;
    fs.writeFileSync(wrapperFile, wrapperCode);
    
    // Execute Python script using child_process
    const startTime = Date.now();
    
    const result = await new Promise((resolve, reject) => {
      exec(`python ${wrapperFile}`, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(stderr || error.message));
          return;
        }
        
        if (stderr) {
          reject(new Error(stderr));
          return;
        }
        
        try {
          resolve(JSON.parse(stdout.trim()));
        } catch (parseError) {
          reject(new Error(`Invalid function output: ${stdout}`));
        }
      });
    });
    
    const executionTime = Date.now() - startTime;
    
    // Clean up temp files
    fs.rmSync(tempDir, { recursive: true, force: true });
    
    return {
      data: result,
      executionTime,
      memoryUsage: 0, // We don't have container stats
      cpuUsage: 0,    // We don't have container stats
      status: 'success',
      statusCode: 200
    };
  } catch (error) {
    logger.error(`Error executing Python function directly: ${error.message}`);
    throw error;
  }
};

// Delete function resources
const deleteFunction = async (function_) => {
  try {
    // For direct execution Python functions, no cleanup needed
    if (function_.language === 'python' && function_.imageId.includes('direct-exec')) {
      return;
    }
    
    if (!function_.imageId) {
      return;
    }
    
    // Find and remove all containers using this image
    const containers = await docker.listContainers({ all: true });
    const functionContainers = containers.filter(container => 
      container.Image === function_.imageId ||
      container.Labels.function_id === function_._id.toString()
    );
    
    for (const containerInfo of functionContainers) {
      const container = docker.getContainer(containerInfo.Id);
      if (containerInfo.State === 'running') {
        await container.stop();
      }
      await container.remove();
      logger.info(`Removed container ${containerInfo.Id} for function ${function_.name}`);
    }
    
    // Remove the image
    try {
      const image = docker.getImage(function_.imageId);
      await image.remove();
      logger.info(`Removed image ${function_.imageId} for function ${function_.name}`);
    } catch (error) {
      // Image might be in use by other containers, not a critical error
      logger.warn(`Could not remove image ${function_.imageId}: ${error.message}`);
    }
  } catch (error) {
    logger.error(`Error deleting function resources: ${error.message}`);
    throw error;
  }
};

module.exports = {
  buildFunctionImage,
  runFunction,
  deleteFunction
};