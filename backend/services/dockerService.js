const Docker = require('dockerode');
const fs = require('fs');
const path = require('path');
const { logger } = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const { exec } = require('child_process');

// Create Docker client
const docker = new Docker({ socketPath: '/var/run/docker.sock' });

// Base images for different languages
const BASE_IMAGES = {
  javascript: 'node:16-alpine',
  python: 'python:3.9-alpine'
};

// Create temporary directory for function files
const createTempDirectory = async (functionId) => {
  const tempDir = path.join('/tmp', `function-${functionId}-${uuidv4()}`);
  
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

// Build Docker image for function
const buildFunctionImage = async (function_) => {
  try {
    const tempDir = await createTempDirectory(function_._id);
    createDockerfile(tempDir, function_.language, function_.code);
    
    const imageTag = `function-${function_.name}:${Date.now()}`;
    
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

// Run function in Docker container
// Run function in Docker container
const runFunction = async (function_, payload, requestId) => {
  try {
    logger.info(`Executing function ${function_.name} using direct execution`);
    
    // Create temporary directory for function files
    const tempDir = await createTempDirectory(function_._id);
    
    // Start timing
    const startTime = Date.now();
    
    if (function_.language === 'javascript') {
      // Write the function code to a file
      const functionJs = `
module.exports = async (event) => {
${function_.code}
};
`;
      const functionFile = path.join(tempDir, 'function.js');
      fs.writeFileSync(functionFile, functionJs);
      
      // Create a wrapper script
      const wrapperJs = `
const fn = require('./function.js');
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
`;
      const wrapperFile = path.join(tempDir, 'wrapper.js');
      fs.writeFileSync(wrapperFile, wrapperJs);
      
      // Execute using Node.js
      const result = await new Promise((resolve, reject) => {
        exec(`node ${wrapperFile}`, (error, stdout, stderr) => {
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
      
      // Calculate execution time
      const executionTime = Date.now() - startTime;
      
      // Clean up temp files
      fs.rmSync(tempDir, { recursive: true, force: true });
      
      return {
        data: result,
        executionTime,
        memoryUsage: 0,
        cpuUsage: 0,
        status: 'success',
        statusCode: 200
      };
      
    } else if (function_.language === 'python') {
      // For Python functions
      // Write the function code to a file with proper indentation
      const functionPy = `
def handler(event):
    ${function_.code.replace(/\n/g, '\n    ')}
`;
      const functionFile = path.join(tempDir, 'function.py');
      fs.writeFileSync(functionFile, functionPy);
      
      // Create a wrapper script
      const payloadJson = JSON.stringify(payload).replace(/'/g, "\\'");
      
      const wrapperPy = `
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
      const wrapperFile = path.join(tempDir, 'wrapper.py');
      fs.writeFileSync(wrapperFile, wrapperPy);
      
      // Execute using Python
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
      
      // Calculate execution time
      const executionTime = Date.now() - startTime;
      
      // Clean up temp files
      fs.rmSync(tempDir, { recursive: true, force: true });
      
      return {
        data: result,
        executionTime,
        memoryUsage: 0,
        cpuUsage: 0,
        status: 'success',
        statusCode: 200
      };
    } else {
      throw new Error(`Unsupported language: ${function_.language}`);
    }
  } catch (error) {
    logger.error(`Error executing function: ${error.message}`);
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