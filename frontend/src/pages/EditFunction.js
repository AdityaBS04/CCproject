import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import FunctionForm from '../components/FunctionForm';

const EditFunction = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [function_, setFunction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchFunction = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/functions/${id}`);
        setFunction(response.data);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch function details');
        setLoading(false);
      }
    };

    fetchFunction();
  }, [id]);

  if (loading) return <div className="text-center py-10">Loading...</div>;
  if (error) return <div className="text-center py-10 text-red-600">{error}</div>;
  if (!function_) return <div className="text-center py-10">Function not found</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Edit Function: {function_.name}</h1>
      <FunctionForm 
        initialData={function_} 
        submitEndpoint={`/api/functions/${id}`} 
        method="put"
        submitButtonText="Update Function"
      />
    </div>
  );
};

export default EditFunction;