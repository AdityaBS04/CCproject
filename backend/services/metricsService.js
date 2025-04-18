const { logger } = require('../utils/logger');

// Get start date based on time range
const getStartDateFromTimeRange = (timeRange) => {
  const now = new Date();
  
  switch (timeRange) {
    case '1h':
      return new Date(now.getTime() - 60 * 60 * 1000);
    case '6h':
      return new Date(now.getTime() - 6 * 60 * 60 * 1000);
    case '24h':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    default:
      // Default to 24 hours if not specified
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }
};

// Calculate statistics for a function's metrics
const calculateMetricsStatistics = (metrics) => {
  if (!metrics || metrics.length === 0) {
    return {
      totalInvocations: 0,
      avgExecutionTime: 0,
      avgMemoryUsage: 0,
      avgCpuUsage: 0,
      successRate: 0,
      coldStarts: 0,
      errorsCount: 0,
    };
  }
  
  const totalInvocations = metrics.length;
  const successfulInvocations = metrics.filter(m => m.status === 'success').length;
  const coldStarts = metrics.filter(m => m.coldStart).length;
  const errorsCount = metrics.filter(m => m.status === 'error').length;
  
  const executionTimes = metrics.map(m => m.executionTime);
  const memoryUsages = metrics.map(m => m.memoryUsage);
  const cpuUsages = metrics.map(m => m.cpuUsage);
  
  const avgExecutionTime = executionTimes.reduce((sum, time) => sum + time, 0) / totalInvocations || 0;
  const avgMemoryUsage = memoryUsages.reduce((sum, mem) => sum + mem, 0) / totalInvocations || 0;
  const avgCpuUsage = cpuUsages.reduce((sum, cpu) => sum + cpu, 0) / totalInvocations || 0;
  const successRate = (successfulInvocations / totalInvocations) * 100 || 0;
  
  // Find fastest and slowest execution times
  const fastestExecution = Math.min(...executionTimes);
  const slowestExecution = Math.max(...executionTimes);
  
  return {
    totalInvocations,
    avgExecutionTime,
    avgMemoryUsage,
    avgCpuUsage,
    successRate,
    coldStarts,
    errorsCount,
    fastestExecution,
    slowestExecution,
  };
};

// Calculate system-wide statistics
const calculateSystemStatistics = (metrics) => {
  if (!metrics || metrics.length === 0) {
    return {
      totalInvocations: 0,
      avgExecutionTime: 0,
      avgMemoryUsage: 0,
      avgCpuUsage: 0,
      successRate: 0,
      virtualizationBreakdown: {
        docker: 0,
        gvisor: 0
      },
      statusBreakdown: {
        success: 0,
        error: 0,
        timeout: 0
      }
    };
  }
  
  const totalInvocations = metrics.length;
  const successfulInvocations = metrics.filter(m => m.status === 'success').length;
  const dockerInvocations = metrics.filter(m => m.virtualizationType === 'docker').length;
  const gvisorInvocations = metrics.filter(m => m.virtualizationType === 'gvisor').length;
  
  const successInvocations = metrics.filter(m => m.status === 'success').length;
  const errorInvocations = metrics.filter(m => m.status === 'error').length;
  const timeoutInvocations = metrics.filter(m => m.status === 'timeout').length;
  
  const executionTimes = metrics.map(m => m.executionTime);
  const memoryUsages = metrics.map(m => m.memoryUsage);
  const cpuUsages = metrics.map(m => m.cpuUsage);
  
  const avgExecutionTime = executionTimes.reduce((sum, time) => sum + time, 0) / totalInvocations || 0;
  const avgMemoryUsage = memoryUsages.reduce((sum, mem) => sum + mem, 0) / totalInvocations || 0;
  const avgCpuUsage = cpuUsages.reduce((sum, cpu) => sum + cpu, 0) / totalInvocations || 0;
  const successRate = (successfulInvocations / totalInvocations) * 100 || 0;
  
  return {
    totalInvocations,
    avgExecutionTime,
    avgMemoryUsage,
    avgCpuUsage,
    successRate,
    virtualizationBreakdown: {
      docker: dockerInvocations,
      gvisor: gvisorInvocations
    },
    statusBreakdown: {
      success: successInvocations,
      error: errorInvocations,
      timeout: timeoutInvocations
    }
  };
};

module.exports = {
  getStartDateFromTimeRange,
  calculateMetricsStatistics,
  calculateSystemStatistics
};