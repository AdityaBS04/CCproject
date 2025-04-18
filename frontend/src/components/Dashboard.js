import React from 'react';
import SystemStats from './SystemStats';

const Dashboard = () => {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">System Dashboard</h1>
      <SystemStats />
    </div>
  );
};

export default Dashboard;