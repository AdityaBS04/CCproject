import { metricsService } from './api';

// Format bytes to human-readable format
export const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

// Get metrics data for charts
export const getMetricsChartData = (metrics, type) => {
  if (!metrics || metrics.length === 0) {
    return {
      labels: [],
      datasets: [
        {
          label: 'No data',
          data: [],
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.5)',
        },
      ],
    };
  }
  
  // Reverse metrics to show oldest first
  const reversedMetrics = [...metrics].reverse();
  
  // Format date for x-axis
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  // Extract data based on type
  if (type === 'executionTime') {
    return {
      labels: reversedMetrics.map(m => formatDate(m.timestamp)),
      datasets: [
        {
          label: 'Execution Time (ms)',
          data: reversedMetrics.map(m => m.executionTime),
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.5)',
          tension: 0.2,
        },
      ],
    };
  } else if (type === 'memory') {
    return {
      labels: reversedMetrics.map(m => formatDate(m.timestamp)),
      datasets: [
        {
          label: 'Memory Usage (MB)',
          data: reversedMetrics.map(m => m.memoryUsage / (1024 * 1024)), // Convert to MB
          borderColor: 'rgb(54, 162, 235)',
          backgroundColor: 'rgba(54, 162, 235, 0.5)',
          tension: 0.2,
        },
      ],
    };
  } else if (type === 'cpu') {
    return {
      labels: reversedMetrics.map(m => formatDate(m.timestamp)),
      datasets: [
        {
          label: 'CPU Usage (%)',
          data: reversedMetrics.map(m => m.cpuUsage),
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.5)',
          tension: 0.2,
        },
      ],
    };
  }
  
  return {
    labels: [],
    datasets: [],
  };
};

// Get metrics for a function with caching
let metricsCache = {
  functionId: null,
  timeRange: null,
  timestamp: null,
  data: null,
};

export const getCachedFunctionMetrics = async (functionId, timeRange = '24h') => {
  const now = Date.now();
  
  // Check if we have cached metrics that are still fresh (less than 30 seconds old)
  if (
    metricsCache.functionId === functionId &&
    metricsCache.timeRange === timeRange &&
    metricsCache.timestamp &&
    now - metricsCache.timestamp < 30000 &&
    metricsCache.data
  ) {
    return metricsCache.data;
  }
  
  // Fetch new metrics
  try {
    const metricsData = await metricsService.getFunctionMetrics(functionId, timeRange);
    
    // Update cache
    metricsCache = {
      functionId,
      timeRange,
      timestamp: now,
      data: metricsData,
    };
    
    return metricsData;
  } catch (error) {
    throw error;
  }
};

export default {
  formatBytes,
  getMetricsChartData,
  getCachedFunctionMetrics,
};