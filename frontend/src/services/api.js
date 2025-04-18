import axios from 'axios';

// Create an axios instance with default config
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Function service
export const functionService = {
  // Get all functions
  getFunctions: async () => {
    try {
      const response = await api.get('/functions');
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // Get function by ID
  getFunctionById: async (id) => {
    try {
      const response = await api.get(`/functions/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // Create new function
  createFunction: async (functionData) => {
    try {
      const response = await api.post('/functions', functionData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // Update function
  updateFunction: async (id, functionData) => {
    try {
      const response = await api.put(`/functions/${id}`, functionData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // Delete function
  deleteFunction: async (id) => {
    try {
      const response = await api.delete(`/functions/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // Invoke function
  invokeFunction: async (id, payload) => {
    try {
      const response = await api.post(`/functions/${id}/invoke`, payload);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

// Metrics service
export const metricsService = {
  // Get function metrics
  getFunctionMetrics: async (id, timeRange = '24h') => {
    try {
      const response = await api.get(`/metrics/function/${id}?timeRange=${timeRange}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // Get system metrics
  getSystemMetrics: async (timeRange = '24h') => {
    try {
      const response = await api.get(`/metrics/system?timeRange=${timeRange}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

export default api;