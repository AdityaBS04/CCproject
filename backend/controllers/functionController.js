const asyncHandler = require('express-async-handler');
const { v4: uuidv4 } = require('uuid');
const Function = require('../models/functionModel');
const executionService = require('../services/executionService');
const { logger } = require('../utils/logger');
const validators = require('../utils/validators');

// @desc    Get all functions
// @route   GET /api/functions
// @access  Public
const getFunctions = asyncHandler(async (req, res) => {
  const functions = await Function.find({}).sort({ createdAt: -1 });
  res.status(200).json(functions);
});

// @desc    Get function by ID
// @route   GET /api/functions/:id
// @access  Public
const getFunctionById = asyncHandler(async (req, res) => {
  const serverlessFunction = await Function.findById(req.params.id);
  
  if (!serverlessFunction) {
    res.status(404);
    throw new Error('Function not found');
  }
  
  res.status(200).json(serverlessFunction);
});

// @desc    Create new function
// @route   POST /api/functions
// @access  Public
const createFunction = asyncHandler(async (req, res) => {
  const { name, route, code, language, timeout, environment, virtualizationType } = req.body;
  
  // Validate required fields
  if (!name || !route || !code || !language) {
    res.status(400);
    throw new Error('Please provide all required fields');
  }
  
  // Validate field formats
  if (!validators.isValidFunctionName(name)) {
    res.status(400);
    throw new Error('Function name must contain only alphanumeric characters, hyphens, and underscores');
  }
  
  if (!validators.isValidRoute(route)) {
    res.status(400);
    throw new Error('Route must start with / and contain only alphanumeric characters, hyphens, and underscores');
  }
  
  if (timeout && !validators.isValidTimeout(timeout)) {
    res.status(400);
    throw new Error('Timeout must be a positive number less than 5 minutes (300000ms)');
  }
  
  if (!validators.isValidLanguage(language)) {
    res.status(400);
    throw new Error('Unsupported language. Currently supported: javascript, python');
  }
  
  if (environment && !validators.isValidEnvironment(environment)) {
    res.status(400);
    throw new Error('Environment variables must be key-value pairs with string values');
  }
  
  // Check if function name or route already exists
  const functionExists = await Function.findOne({ 
    $or: [{ name }, { route }] 
  });
  
  if (functionExists) {
    res.status(400);
    throw new Error('Function with this name or route already exists');
  }
  
  // Create function record
  const serverlessFunction = await Function.create({
    name,
    route,
    code,
    language,
    timeout: timeout || 30000,
    environment: environment || {},
    virtualizationType: virtualizationType || 'docker',
    status: 'creating',
  });
  
  // Deploy the function (build image)
  try {
    logger.info(`Deploying function ${serverlessFunction.name} with ${serverlessFunction.virtualizationType}`);
    const imageId = await executionService.deployFunction(serverlessFunction);
    
    // Update function record with imageId
    serverlessFunction.imageId = imageId;
    serverlessFunction.status = 'ready';
    serverlessFunction.deploymentCount = 1;
    await serverlessFunction.save();
    
    res.status(201).json(serverlessFunction);
  } catch (error) {
    // Update function status to error
    serverlessFunction.status = 'error';
    await serverlessFunction.save();
    
    logger.error(`Failed to deploy function ${serverlessFunction.name}: ${error.message}`);
    res.status(500);
    throw new Error(`Failed to deploy function: ${error.message}`);
  }
});

// @desc    Update function
// @route   PUT /api/functions/:id
// @access  Public
const updateFunction = asyncHandler(async (req, res) => {
  const { name, route, code, language, timeout, environment, virtualizationType } = req.body;
  
  // Find function
  const serverlessFunction = await Function.findById(req.params.id);
  
  if (!serverlessFunction) {
    res.status(404);
    throw new Error('Function not found');
  }
  
  // Check if name or route already exists (if changed)
  if (name !== serverlessFunction.name || route !== serverlessFunction.route) {
    const functionExists = await Function.findOne({
      _id: { $ne: req.params.id },
      $or: [
        { name: name || serverlessFunction.name },
        { route: route || serverlessFunction.route }
      ]
    });
    
    if (functionExists) {
      res.status(400);
      throw new Error('Function with this name or route already exists');
    }
  }
  
  // Update function fields
  serverlessFunction.name = name || serverlessFunction.name;
  serverlessFunction.route = route || serverlessFunction.route;
  serverlessFunction.code = code || serverlessFunction.code;
  serverlessFunction.language = language || serverlessFunction.language;
  serverlessFunction.timeout = timeout || serverlessFunction.timeout;
  serverlessFunction.environment = environment || serverlessFunction.environment;
  
  // If virtualization type changed or code updated, need to redeploy
  const needsRedeploy = virtualizationType !== serverlessFunction.virtualizationType ||
                        code !== serverlessFunction.code ||
                        language !== serverlessFunction.language;
  
  if (needsRedeploy) {
    serverlessFunction.virtualizationType = virtualizationType || serverlessFunction.virtualizationType;
    serverlessFunction.status = 'creating';
    
    // Save changes before redeploying
    await serverlessFunction.save();
    
    try {
      logger.info(`Redeploying function ${serverlessFunction.name} with ${serverlessFunction.virtualizationType}`);
      const imageId = await executionService.deployFunction(serverlessFunction);
      
      // Update function record with new imageId
      serverlessFunction.imageId = imageId;
      serverlessFunction.status = 'ready';
      serverlessFunction.deploymentCount += 1;
      
      await serverlessFunction.save();
    } catch (error) {
      // Update function status to error
      serverlessFunction.status = 'error';
      await serverlessFunction.save();
      
      logger.error(`Failed to redeploy function ${serverlessFunction.name}: ${error.message}`);
      res.status(500);
      throw new Error(`Failed to redeploy function: ${error.message}`);
    }
  } else {
    // Save changes if no redeploy needed
    await serverlessFunction.save();
  }
  
  res.status(200).json(serverlessFunction);
});

// @desc    Delete function
// @route   DELETE /api/functions/:id
// @access  Public
const deleteFunction = asyncHandler(async (req, res) => {
  const serverlessFunction = await Function.findById(req.params.id);
  
  if (!serverlessFunction) {
    res.status(404);
    throw new Error('Function not found');
  }
  
  // Remove container and image if they exist
  try {
    await executionService.deleteFunction(serverlessFunction);
    logger.info(`Deleted function resources for ${serverlessFunction.name}`);
  } catch (error) {
    logger.error(`Error deleting function resources: ${error.message}`);
    // Continue with deletion even if resource cleanup fails
  }
  
  // Remove from database
  await serverlessFunction.remove();
  
  res.status(200).json({ id: req.params.id, message: 'Function deleted successfully' });
});

// @desc    Invoke function
// @route   POST /api/functions/:id/invoke
// @access  Public
const invokeFunction = asyncHandler(async (req, res) => {
  const serverlessFunction = await Function.findById(req.params.id);
  
  if (!serverlessFunction) {
    res.status(404);
    throw new Error('Function not found');
  }
  
  // Generate a unique request ID
  const requestId = uuidv4();
  
  try {
    const payload = req.body || {};
    
    // Execute the function
    const result = await executionService.executeFunction(serverlessFunction, payload, requestId);
    
    // Update last invoked timestamp
    serverlessFunction.lastInvoked = Date.now();
    await serverlessFunction.save();
    
    res.status(200).json({ 
      requestId,
      result: result.data,
      executionTime: result.executionTime,
      status: 'success'
    });
  } catch (error) {
    logger.error(`Error invoking function ${serverlessFunction.name}: ${error.message}`);
    res.status(500);
    throw new Error(`Function execution failed: ${error.message}`);
  }
});

module.exports = {
  getFunctions,
  getFunctionById,
  createFunction,
  updateFunction,
  deleteFunction,
  invokeFunction,
};