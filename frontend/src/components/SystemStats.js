import React, { useState, useEffect } from 'react';
import { Pie, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import axios from 'axios';

// Register Chart.js components
ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const SystemStats = () => {
  const [statistics, setStatistics] = useState({
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
  });
  const [functionsCount, setFunctionsCount] = useState(0);
  const [recentInvocations, setRecentInvocations] = useState([]);
  const [timeRange, setTimeRange] = useState('24h');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch system metrics when component mounts or timeRange changes
  useEffect(() => {
    const fetchSystemMetrics = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/metrics/system?timeRange=${timeRange}`);
        setStatistics(response.data.statistics);
        setFunctionsCount(response.data.functionsCount);
        setRecentInvocations(response.data.recentInvocations);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch system metrics. Please try again later.');
        setLoading(false);
        console.error('Error fetching system metrics:', err);
      }
    };

    fetchSystemMetrics();
  }, [timeRange]);

  // Data for virtualization type pie chart
  const virtualizationData = {
    labels: ['Docker', 'gVisor'],
    datasets: [
      {
        data: [
          statistics.virtualizationBreakdown.docker,
          statistics.virtualizationBreakdown.gvisor,
        ],
        backgroundColor: [
          'rgba(54, 162, 235, 0.6)',
          'rgba(255, 206, 86, 0.6)',
        ],
        borderColor: [
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  // Data for status breakdown pie chart
  const statusData = {
    labels: ['Success', 'Error', 'Timeout'],
    datasets: [
      {
        data: [
          statistics.statusBreakdown.success,
          statistics.statusBreakdown.error,
          statistics.statusBreakdown.timeout,
        ],
        backgroundColor: [
          'rgba(75, 192, 192, 0.6)',
          'rgba(255, 99, 132, 0.6)',
          'rgba(255, 159, 64, 0.6)',
        ],
        borderColor: [
          'rgba(75, 192, 192, 1)',
          'rgba(255, 99, 132, 1)',
          'rgba(255, 159, 64, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  // Chart options
  const pieOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom',
      },
    },
  };

  if (loading) {
    return <div className="text-center py-10">Loading system metrics...</div>;
  }

  if (error) {
    return <div className="text-center py-10 text-red-600">{error}</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">System Dashboard</h2>
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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="card">
          <h3 className="text-lg font-semibold mb-2">Total Functions</h3>
          <p className="text-3xl font-bold">{functionsCount}</p>
        </div>
        <div className="card">
          <h3 className="text-lg font-semibold mb-2">Total Invocations</h3>
          <p className="text-3xl font-bold">{statistics.totalInvocations}</p>
        </div>
        <div className="card">
          <h3 className="text-lg font-semibold mb-2">Avg. Execution Time</h3>
          <p className="text-3xl font-bold">{statistics.avgExecutionTime.toFixed(2)} ms</p>
        </div>
        <div className="card">
          <h3 className="text-lg font-semibold mb-2">Success Rate</h3>
          <p className="text-3xl font-bold">{statistics.successRate.toFixed(2)}%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="card">
          <h3 className="text-xl font-semibold mb-4 text-center">Virtualization Type</h3>
          <div className="h-64">
            <Pie data={virtualizationData} options={pieOptions} />
          </div>
        </div>
        <div className="card">
          <h3 className="text-xl font-semibold mb-4 text-center">Execution Status</h3>
          <div className="h-64">
            <Pie data={statusData} options={pieOptions} />
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="text-xl font-semibold mb-4">Recent Invocations</h3>
        {recentInvocations.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-100">
                  <th className="py-2 px-4 text-left">Function</th>
                  <th className="py-2 px-4 text-left">Timestamp</th>
                  <th className="py-2 px-4 text-left">Status</th>
                  <th className="py-2 px-4 text-left">Execution Time</th>
                  <th className="py-2 px-4 text-left">Virtualization</th>
                </tr>
              </thead>
              <tbody>
                {recentInvocations.map((invocation) => (
                  <tr key={invocation._id} className="border-b">
                    <td className="py-2 px-4">{invocation.functionId}</td>
                    <td className="py-2 px-4">{new Date(invocation.timestamp).toLocaleString()}</td>
                    <td className="py-2 px-4">
                      {invocation.status === 'success' ? (
                        <span className="inline-block bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">Success</span>
                      ) : invocation.status === 'error' ? (
                        <span className="inline-block bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs">Error</span>
                      ) : (
                        <span className="inline-block bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs">Timeout</span>
                      )}
                    </td>
                    <td className="py-2 px-4">{invocation.executionTime} ms</td>
                    <td className="py-2 px-4">{invocation.virtualizationType}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center py-4">No invocations recorded yet.</p>
        )}
      </div>

      <div className="card">
        <h3 className="text-xl font-semibold mb-4">Resource Usage</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="text-md font-semibold mb-1">Avg. Memory Usage</h4>
            <p className="text-xl">{(statistics.avgMemoryUsage / (1024 * 1024)).toFixed(2)} MB</p>
          </div>
          <div>
            <h4 className="text-md font-semibold mb-1">Avg. CPU Usage</h4>
            <p className="text-xl">{statistics.avgCpuUsage.toFixed(2)}%</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemStats;