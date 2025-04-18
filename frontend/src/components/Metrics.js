import React, { useState, useEffect } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import axios from 'axios';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const Metrics = ({ functionId }) => {
  const [metrics, setMetrics] = useState([]);
  const [statistics, setStatistics] = useState({
    totalInvocations: 0,
    avgExecutionTime: 0,
    avgMemoryUsage: 0,
    avgCpuUsage: 0,
    successRate: 0,
    coldStarts: 0,
    errorsCount: 0,
  });
  const [timeRange, setTimeRange] = useState('24h');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch metrics for this function when component mounts or timeRange changes
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/metrics/function/${functionId}?timeRange=${timeRange}`);
        setMetrics(response.data.metrics);
        setStatistics(response.data.statistics);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch metrics. Please try again later.');
        setLoading(false);
        console.error('Error fetching metrics:', err);
      }
    };

    fetchMetrics();
  }, [functionId, timeRange]);

  // Format date for charts
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Prepare data for execution time chart
  const executionTimeData = {
    labels: metrics.map(m => formatDate(m.timestamp)).reverse(),
    datasets: [
      {
        label: 'Execution Time (ms)',
        data: metrics.map(m => m.executionTime).reverse(),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
        tension: 0.2,
      },
    ],
  };

  // Prepare data for resource usage chart
  const resourceUsageData = {
    labels: metrics.map(m => formatDate(m.timestamp)).reverse(),
    datasets: [
      {
        label: 'Memory Usage (MB)',
        data: metrics.map(m => m.memoryUsage / (1024 * 1024)).reverse(), // Convert to MB
        borderColor: 'rgb(54, 162, 235)',
        backgroundColor: 'rgba(54, 162, 235, 0.5)',
        yAxisID: 'y',
      },
      {
        label: 'CPU Usage (%)',
        data: metrics.map(m => m.cpuUsage).reverse(),
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
        yAxisID: 'y1',
      },
    ],
  };

  // Chart options for execution time
  const executionTimeOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Function Execution Time',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Time (ms)',
        },
      },
    },
  };

  // Chart options for resource usage
  const resourceUsageOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Resource Usage',
      },
    },
    scales: {
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: {
          display: true,
          text: 'Memory (MB)',
        },
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        grid: {
          drawOnChartArea: false,
        },
        title: {
          display: true,
          text: 'CPU (%)',
        },
      },
    },
  };

  if (loading) {
    return <div className="text-center py-10">Loading metrics...</div>;
  }

  if (error) {
    return <div className="text-center py-10 text-red-600">{error}</div>;
  }

  if (metrics.length === 0) {
    return (
      <div className="text-center py-10">
        <p>No metrics available for this function yet.</p>
        <p className="text-gray-600 mt-2">Invoke the function to generate metrics.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold">Performance Metrics</h3>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="form-input w-auto"
        >
          <option value="1h">Last Hour</option>
          <option value="6h">Last 6 Hours</option>
          <option value="24h">Last 24 Hours</option>
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="card">
          <h4 className="text-lg font-semibold mb-2">Invocations</h4>
          <p className="text-3xl font-bold">{statistics.totalInvocations}</p>
        </div>
        <div className="card">
          <h4 className="text-lg font-semibold mb-2">Avg. Execution Time</h4>
          <p className="text-3xl font-bold">{statistics.avgExecutionTime.toFixed(2)} ms</p>
        </div>
        <div className="card">
          <h4 className="text-lg font-semibold mb-2">Success Rate</h4>
          <p className="text-3xl font-bold">{statistics.successRate.toFixed(2)}%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="card">
          <Line options={executionTimeOptions} data={executionTimeData} />
        </div>
        <div className="card">
          <Line options={resourceUsageOptions} data={resourceUsageData} />
        </div>
      </div>

      <div className="card">
        <h3 className="text-xl font-semibold mb-4">Detailed Statistics</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <h4 className="text-md font-semibold mb-1">Avg. Memory Usage</h4>
            <p className="text-xl">{(statistics.avgMemoryUsage / (1024 * 1024)).toFixed(2)} MB</p>
          </div>
          <div>
            <h4 className="text-md font-semibold mb-1">Avg. CPU Usage</h4>
            <p className="text-xl">{statistics.avgCpuUsage.toFixed(2)}%</p>
          </div>
          <div>
            <h4 className="text-md font-semibold mb-1">Cold Starts</h4>
            <p className="text-xl">{statistics.coldStarts}</p>
          </div>
          <div>
            <h4 className="text-md font-semibold mb-1">Errors</h4>
            <p className="text-xl">{statistics.errorsCount}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Metrics;