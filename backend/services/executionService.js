const dockerService = require('./dockerService');
const gvisorService = require('./gvisorService');
const metricsController = require('../controllers/metricsController');
const { logger } = require('../utils/logger');

// Deploy function by building container image
const deployFunction = async (function_) => {
  try {
    let imageId;
    
    if (function_.virtualizationType === 'docker') {
      imageId = await dockerService.buildFunctionImage(function_);
    } else if (function_.virtualizationType === 'gvisor') {
      imageId = await gvisorService.buildFunctionImage(function_);
    } else {
      throw new Error(`Unsupported virtualization type: ${function_.virtualizationType}`);
    }
    
    logger.info(`Successfully built image ${imageId} for function ${function_.name}`);
    return imageId;
  } catch (error) {
    logger.error(`Error deploying function ${function_.name}: ${error.message}`);
    throw error;
  }
};

// Execute function
const executeFunction = async (function_, payload, requestId) => {
  try {
    // Check if function is ready
    if (function_.status !== 'ready') {
      throw new Error(`Function ${function_.name} is not ready (status: ${function_.status})`);
    }
    
    // Check if image exists
    if (!function_.imageId) {
      throw new Error(`Function ${function_.name} has no associated image`);
    }
    
    logger.info(`Executing function ${function_.name} with ${function_.virtualizationType}`);
    
    let result;
    const startTime = Date.now();
    const coldStart = !function_.lastInvoked;
    
    try {
      // Execute function based on virtualization type
      if (function_.virtualizationType === 'docker') {
        result = await dockerService.runFunction(function_, payload, requestId);
      } else if (function_.virtualizationType === 'gvisor') {
        result = await gvisorService.runFunction(function_, payload, requestId);
      } else {
        throw new Error(`Unsupported virtualization type: ${function_.virtualizationType}`);
      }
      
      logger.info(`Function ${function_.name} executed successfully in ${result.executionTime}ms`);
      
      // Record metrics
      await metricsController.createMetrics({
        functionId: function_._id,
        timestamp: new Date(),
        executionTime: result.executionTime,
        memoryUsage: result.memoryUsage,
        cpuUsage: result.cpuUsage,
        status: result.status,
        statusCode: result.statusCode,
        virtualizationType: function_.virtualizationType,
        requestId,
        coldStart
      });
      
      return result;
    } catch (error) {
      logger.error(`Error executing function ${function_.name}: ${error.message}`);
      
      // Record error metrics
      await metricsController.createMetrics({
        functionId: function_._id,
        timestamp: new Date(),
        executionTime: Date.now() - startTime,
        memoryUsage: 0,
        cpuUsage: 0,
        status: 'error',
        errorMessage: error.message,
        virtualizationType: function_.virtualizationType,
        requestId,
        coldStart
      });
      
      throw error;
    }
  } catch (error) {
    logger.error(`Error in executeFunction for ${function_.name}: ${error.message}`);
    throw error;
  }
};

// Delete function resources
const deleteFunction = async (function_) => {
  try {
    if (function_.virtualizationType === 'docker') {
      await dockerService.deleteFunction(function_);
    } else if (function_.virtualizationType === 'gvisor') {
      await gvisorService.deleteFunction(function_);
    } else {
      throw new Error(`Unsupported virtualization type: ${function_.virtualizationType}`);
    }
  } catch (error) {
    logger.error(`Error deleting function ${function_.name}: ${error.message}`);
    throw error;
  }
};

module.exports = {
  deployFunction,
  executeFunction,
  deleteFunction
};