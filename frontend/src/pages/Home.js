import React from 'react';
import { Link } from 'react-router-dom';
import FunctionList from '../components/FunctionList';

const Home = () => {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Functions</h1>
        <Link to="/create" className="btn btn-primary">
          Create New Function
        </Link>
      </div>
      
      <FunctionList />
    </div>
  );
};

export default Home;