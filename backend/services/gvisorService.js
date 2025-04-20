const Docker = require('dockerode');
const fs = require('fs');
const path = require('path');
const { logger } = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');

// Create Docker client
const docker = new Docker({ socketPath: '/var/run/docker.sock' });

// Base images for different languages with gVisor runtime
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

// Create Dockerfile for function with gVisor runtime
const createDockerfile = (tempDir, language, code) => {
  let dockerfileContent = '';
  
  if (language === 'javascript') {
    // Create package.json
    const packageJson = {
      name: 'serverless-function',
      version: '1.0.0',
      main: 'index.js',
      dependencies: {
        express: '^4.17.3'
      }
    };
    
    fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify(packageJson, null, 2));
    
    // Create index.js
    const indexJs = `
const express = require('express');
const app = express();

app.use(express.json());

// Function handler
const handler = async (event) => {
${code}
};

// Express endpoint
app.post('/', async (req, res) => {
  try {
    const result = await handler(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
});
`;
    
    fs.writeFileSync(path.join(tempDir, 'index.js'), indexJs);
    
    // Create Dockerfile
    dockerfileContent = `FROM ${BASE_IMAGES.javascript}
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 8080
CMD ["node", "index.js"]
`;
  } else if (language === 'python') {
    // Create requirements.txt
    const requirementsTxt = 'flask==2.0.1\ngunicorn==20.1.0';
    fs.writeFileSync(path.join(tempDir, 'requirements.txt'), requirementsTxt);
    
    // Create app.py
    const appPy = `
from flask import Flask, request, jsonify

app = Flask(__name__)

# Function handler
def handler(event):
${code}

@app.route('/', methods=['POST'])
def invoke():
    try:
        result = handler(request.json)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
`;
    
    fs.writeFileSync(path.join(tempDir, 'app.py'), appPy);
    
    // Create Dockerfile
    dockerfileContent = `FROM ${BASE_IMAGES.python}
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8080
CMD ["python", "app.py"]
`;
  }
  
  fs.writeFileSync(path.join(tempDir, 'Dockerfile'), dockerfileContent);
  
  return tempDir;
};

// Build Docker image for function with gVisor
const buildFunctionImage = async (function_) => {
  try {
    const tempDir = await createTempDirectory(function_._id);
    createDockerfile(tempDir, function_.language, function_.code);
    
    const imageTag = `function-gvisor-${function_.name}:${Date.now()}`;
    
    logger.info(`Building gVisor-enabled Docker image ${imageTag} for function ${function_.name}`);
    
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
    logger.error(`Error building gVisor Docker image: ${error.message}`);
    throw error;
  }
};

// Run function in Docker container with gVisor runtime
// Run function in Docker container with gVisor runtime
const runFunction = async (function_, payload, requestId) => {
  try {
    // Create container with gVisor runtime
    const container = await docker.createContainer({
      Image: function_.imageId,
      Env: Object.entries(function_.environment).map(([key, value]) => `${key}=${value}`),
      ExposedPorts: {
        '8080/tcp': {}
      },
      HostConfig: {
        PortBindings: {
          '8080/tcp': [{ HostPort: '0' }] // Dynamically assign port
        },
        Memory: 128 * 1024 * 1024, // 128MB limit
        MemorySwap: 128 * 1024 * 1024, // No swap
        CpuPeriod: 100000,
        CpuQuota: 50000, // 50% CPU limit
        Runtime: 'runsc' // gVisor runtime
      },
      Labels: {
        'function_id': function_._id.toString(),
        'request_id': requestId,
        'runtime': 'gvisor'
      }
    });
    
    // Start container
    await container.start();
    
    // Get container port mapping
    const containerInfo = await container.inspect();
    const port = containerInfo.NetworkSettings.Ports['8080/tcp'][0].HostPort;
    
    // Wait for container to be ready (simple delay for now)
    await new Promise(resolve => setTimeout(resolve, 1500)); // Slightly longer for gVisor
    
    // Get container stats before execution
    const statsBefore = await container.stats({ stream: false });
    
    // Execute function using host.docker.internal
    const startTime = Date.now();
    
    logger.info(`Connecting to gVisor container at host.docker.internal:${port}`);
    
    const response = await axios.post(`http://host.docker.internal:${port}`, payload, {
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    const executionTime = Date.now() - startTime;
    
    // Get container stats after execution
    const statsAfter = await container.stats({ stream: false });
    
    // Calculate resource usage
    const memoryUsage = statsAfter.memory_stats.usage - statsAfter.memory_stats.stats.cache;
    const cpuDelta = statsAfter.cpu_stats.cpu_usage.total_usage - statsBefore.cpu_stats.cpu_usage.total_usage;
    const systemDelta = statsAfter.cpu_stats.system_cpu_usage - statsBefore.cpu_stats.system_cpu_usage;
    const cpuUsage = (cpuDelta / systemDelta) * statsAfter.cpu_stats.online_cpus * 100;
    
    // Parse response
    const result = response.data;
    
    // Stop and remove container
    await container.stop();
    await container.remove();
    
    return {
      data: result,
      executionTime,
      memoryUsage,
      cpuUsage,
      status: response.status >= 200 && response.status < 300 ? 'success' : 'error',
      statusCode: response.status
    };
  } catch (error) {
    logger.error(`Error running function in gVisor: ${error.message}`);
    throw error;
  }
};

// Delete function resources
const deleteFunction = async (function_) => {
  try {
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
      logger.info(`Removed gVisor container ${containerInfo.Id} for function ${function_.name}`);
    }
    
    // Remove the image
    try {
      const image = docker.getImage(function_.imageId);
      await image.remove();
      logger.info(`Removed gVisor image ${function_.imageId} for function ${function_.name}`);
    } catch (error) {
      // Image might be in use by other containers, not a critical error
      logger.warn(`Could not remove gVisor image ${function_.imageId}: ${error.message}`);
    }
  } catch (error) {
    logger.error(`Error deleting gVisor function resources: ${error.message}`);
    throw error;
  }
};

module.exports = {
  buildFunctionImage,
  runFunction,
  deleteFunction
};