import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navigation from './components/Navigation';
import Home from './pages/Home';
import CreateFunction from './pages/CreateFunction';
import FunctionDetail from './pages/FunctionDetail';
import SystemDashboard from './pages/SystemDashboard';

function App() {
  return (
    <Router>
      <div className="App">
        <Navigation />
        <main className="container mx-auto py-4 px-4">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/create" element={<CreateFunction />} />
            <Route path="/function/:id" element={<FunctionDetail />} />
            <Route path="/dashboard" element={<SystemDashboard />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;