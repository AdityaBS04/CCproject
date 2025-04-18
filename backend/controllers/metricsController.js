const asyncHandler = require('express-async-handler');
const Metrics = require('../models/metricsModel');
const Function = require('../models/functionModel');
const metricsService = require('../services/metricsService');
const { logger } = require('../utils/logger');

// @desc    Get metrics for a function
// @route   GET /api/metrics/function/:id
// @access  Public
const getFunctionMetrics = asyncHandler(async (req, res) => {
  const functionId = req.params.id;
  
  // Validate function exists
  const functionExists = await Function.findById(functionId);
  if (!functionExists) {
    res.status(404);
    throw new Error('Function not found');
  }
  
  // Get time range from query params
  const { timeRange } = req.query;
  const startDate = metricsService.getStartDateFromTimeRange(timeRange);
  
  // Fetch metrics
  const metrics = await Metrics.find({
    functionId,
    timestamp: { $gte: startDate }
  }).sort({ timestamp: -1 });
  
  // Get statistics
  const stats = metricsService.calculateMetricsStatistics(metrics);
  
  res.status(200).json({
    metrics,
    statistics: stats
  });
});

// @desc    Get system-wide metrics
// @route   GET /api/metrics/system
// @access  Public
const getSystemMetrics = asyncHandler(async (req, res) => {
  // Get time range from query params
  const { timeRange } = req.query;
  const startDate = metricsService.getStartDateFromTimeRange(timeRange);
  
  // Get metrics aggregated by virtualization type
  const metrics = await Metrics.find({
    timestamp: { $gte: startDate }
  }).sort({ timestamp: -1 });
  
  // Get functions count
  const functionsCount = await Function.countDocuments();
  
  // Calculate system statistics
  const stats = metricsService.calculateSystemStatistics(metrics);
  
  res.status(200).json({
    statistics: stats,
    functionsCount,
    recentInvocations: metrics.slice(0, 10) // Return 10 most recent invocations
  });
});

// @desc    Create metrics for a function invocation
// @route   POST /api/metrics
// @access  Internal (not exposed to API)
const createMetrics = asyncHandler(async (metrics) => {
  try {
    const createdMetrics = await Metrics.create(metrics);
    logger.debug(`Created metrics for function ${metrics.functionId}, requestId: ${metrics.requestId}`);
    return createdMetrics;
  } catch (error) {
    logger.error(`Error creating metrics: ${error.message}`);
    throw error;
  }
});

module.exports = {
  getFunctionMetrics,
  getSystemMetrics,
  createMetrics
};