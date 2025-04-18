import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const FunctionList = () => {
  const [functions, setFunctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch all functions when component mounts
  useEffect(() => {
    const fetchFunctions = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/functions');
        setFunctions(response.data);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch functions. Please try again later.');
        setLoading(false);
        console.error('Error fetching functions:', err);
      }
    };

    fetchFunctions();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this function?')) {
      try {
        await axios.delete(`/api/functions/${id}`);
        setFunctions(functions.filter(fn => fn._id !== id));
      } catch (err) {
        setError('Failed to delete function. Please try again later.');
        console.error('Error deleting function:', err);
      }
    }
  };

  if (loading) {
    return <div className="text-center py-10">Loading functions...</div>;
  }

  if (error) {
    return <div className="text-center py-10 text-red-600">{error}</div>;
  }

  if (functions.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="mb-4">No functions found.</p>
        <Link to="/create" className="btn btn-primary">Create Your First Function</Link>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white">
        <thead>
          <tr className="bg-gray-100 text-left">
            <th className="py-3 px-4 font-semibold">Name</th>
            <th className="py-3 px-4 font-semibold">Route</th>
            <th className="py-3 px-4 font-semibold">Language</th>
            <th className="py-3 px-4 font-semibold">Virtualization</th>
            <th className="py-3 px-4 font-semibold">Status</th>
            <th className="py-3 px-4 font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {functions.map((fn) => (
            <tr key={fn._id} className="border-b hover:bg-gray-50">
              <td className="py-3 px-4">
                <Link to={`/function/${fn._id}`} className="text-blue-600 hover:underline">
                  {fn.name}
                </Link>
              </td>
              <td className="py-3 px-4">{fn.route}</td>
              <td className="py-3 px-4">{fn.language}</td>
              <td className="py-3 px-4">{fn.virtualizationType}</td>
              <td className="py-3 px-4">
                {fn.status === 'ready' ? (
                  <span className="inline-block bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">Ready</span>
                ) : fn.status === 'creating' ? (
                  <span className="inline-block bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs">Creating</span>
                ) : (
                  <span className="inline-block bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs">Error</span>
                )}
              </td>
              <td className="py-3 px-4">
                <div className="flex space-x-2">
                  <Link to={`/function/${fn._id}`} className="text-sm text-blue-600 hover:text-blue-800">View</Link>
                  <button 
                    onClick={() => handleDelete(fn._id)} 
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default FunctionList;