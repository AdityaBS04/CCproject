import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { docco } from 'react-syntax-highlighter/dist/esm/styles/hljs';

const FunctionForm = ({ 
  initialData = null,
  submitEndpoint = '/api/functions',
  method = 'post',
  submitButtonText = 'Create Function',
  title = 'Create New Function'
}) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    route: '/',
    code: '',
    language: 'javascript',
    timeout: 30000,
    virtualizationType: 'docker',
    environment: {}
  });
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [envVars, setEnvVars] = useState([{ key: '', value: '' }]);
  
  // Initialize form with initialData if provided (for editing)
  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        route: initialData.route || '/',
        code: initialData.code || '',
        language: initialData.language || 'javascript',
        timeout: initialData.timeout || 30000,
        virtualizationType: initialData.virtualizationType || 'docker',
        environment: initialData.environment || {}
      });
      
      // Set up environment variables for the form
      if (initialData.environment) {
        const envArray = Object.entries(initialData.environment).map(([key, value]) => ({ key, value }));
        if (envArray.length > 0) {
          setEnvVars(envArray);
        }
      }
    }
  }, [initialData]);
  
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };
  
  const handleCodeChange = (e) => {
    setFormData({
      ...formData,
      code: e.target.value
    });
  };
  
  const handleEnvChange = (index, field, value) => {
    const newEnvVars = [...envVars];
    newEnvVars[index][field] = value;
    setEnvVars(newEnvVars);
    
    // Update environment object in formData
    const newEnv = {};
    newEnvVars.forEach(env => {
      if (env.key && env.value) {
        newEnv[env.key] = env.value;
      }
    });
    
    setFormData({
      ...formData,
      environment: newEnv
    });
  };
  
  const addEnvVar = () => {
    setEnvVars([...envVars, { key: '', value: '' }]);
  };
  
  const removeEnvVar = (index) => {
    const newEnvVars = [...envVars];
    newEnvVars.splice(index, 1);
    setEnvVars(newEnvVars);
    
    // Update environment object in formData
    const newEnv = {};
    newEnvVars.forEach(env => {
      if (env.key && env.value) {
        newEnv[env.key] = env.value;
      }
    });
    
    setFormData({
      ...formData,
      environment: newEnv
    });
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setSubmitting(true);
      setError(null);
      
      // Validate form
      if (!formData.name || !formData.route || !formData.code) {
        throw new Error('Please fill in all required fields');
      }
      
      // Submit function
      let response;
      if (method === 'post') {
        response = await axios.post(submitEndpoint, formData);
      } else if (method === 'put') {
        response = await axios.put(submitEndpoint, formData);
      }
      
      // Redirect to function details page
      navigate(`/function/${response.data._id}`);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save function');
      setSubmitting(false);
      console.error('Error saving function:', err);
    }
  };
  
  const getTemplate = () => {
    if (formData.language === 'javascript') {
      return `// Write your function code here
// The function should return a value or a promise
// Example:
return {
  message: "Hello from serverless function!",
  timestamp: new Date().toISOString(),
  event: event
};`;
    } else if (formData.language === 'python') {
      return `# Write your function code here
# The function should return a value
# Example:
import json
from datetime import datetime

return {
  "message": "Hello from serverless function!",
  "timestamp": datetime.now().isoformat(),
  "event": event
}`;
    }
  };
  
  return (
    <div className="card">
      <h2 className="text-2xl font-bold mb-6">{title}</h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name" className="form-label">Function Name*</label>
          <input
            type="text"
            id="name"
            name="name"
            className="form-input"
            value={formData.name}
            onChange={handleChange}
            placeholder="my-function"
            required
          />
          <p className="text-sm text-gray-500 mt-1">Use only alphanumeric characters, hyphens, and underscores</p>
        </div>
        
        <div className="form-group">
          <label htmlFor="route" className="form-label">Route*</label>
          <input
            type="text"
            id="route"
            name="route"
            className="form-input"
            value={formData.route}
            onChange={handleChange}
            placeholder="/my-function"
            required
          />
          <p className="text-sm text-gray-500 mt-1">Must start with / and contain only alphanumeric characters, hyphens, and underscores</p>
        </div>
        
        <div className="form-group">
          <label htmlFor="language" className="form-label">Language*</label>
          <select
            id="language"
            name="language"
            className="form-input"
            value={formData.language}
            onChange={handleChange}
            required
          >
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
          </select>
        </div>
        
        <div className="form-group">
          <label htmlFor="virtualizationType" className="form-label">Virtualization Type*</label>
          <select
            id="virtualizationType"
            name="virtualizationType"
            className="form-input"
            value={formData.virtualizationType}
            onChange={handleChange}
            required
          >
            <option value="docker">Docker</option>
            <option value="gvisor">gVisor</option>
          </select>
          <p className="text-sm text-gray-500 mt-1">Docker is faster but less isolated. gVisor provides better security isolation but with performance overhead.</p>
        </div>
        
        <div className="form-group">
          <label htmlFor="timeout" className="form-label">Timeout (ms)</label>
          <input
            type="number"
            id="timeout"
            name="timeout"
            className="form-input"
            value={formData.timeout}
            onChange={handleChange}
            min="1000"
            max="300000"
          />
          <p className="text-sm text-gray-500 mt-1">Maximum execution time allowed (1-300 seconds)</p>
        </div>
        
        <div className="form-group">
          <label className="form-label">Environment Variables</label>
          {envVars.map((env, index) => (
            <div key={index} className="flex items-center space-x-2 mb-2">
              <input
                type="text"
                className="form-input w-1/3"
                placeholder="KEY"
                value={env.key}
                onChange={(e) => handleEnvChange(index, 'key', e.target.value)}
              />
              <input
                type="text"
                className="form-input w-1/3"
                placeholder="VALUE"
                value={env.value}
                onChange={(e) => handleEnvChange(index, 'value', e.target.value)}
              />
              <button
                type="button"
                onClick={() => removeEnvVar(index)}
                className="btn btn-danger"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addEnvVar}
            className="btn btn-secondary mt-2"
          >
            Add Environment Variable
          </button>
        </div>
        
        <div className="form-group">
          <label htmlFor="code" className="form-label">Function Code*</label>
          <textarea
            id="code"
            name="code"
            className="form-input font-mono h-64"
            value={formData.code || getTemplate()}
            onChange={handleCodeChange}
            placeholder="Write your function code here..."
            required
          />
          {formData.code && (
            <div className="mt-4">
              <h3 className="text-lg font-semibold mb-2">Code Preview</h3>
              <SyntaxHighlighter
                language={formData.language === 'javascript' ? 'javascript' : 'python'}
                style={docco}
                className="p-4 border rounded-md"
              >
                {formData.code}
              </SyntaxHighlighter>
            </div>
          )}
        </div>
        
        <div className="flex items-center justify-end space-x-3 mt-6">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="btn btn-secondary"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
          >
            {submitting ? 'Saving...' : submitButtonText}
          </button>
        </div>
      </form>
    </div>
  );
};

export default FunctionForm;