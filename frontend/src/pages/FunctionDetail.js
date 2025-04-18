import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { docco } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import Metrics from '../components/Metrics';

const FunctionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [function_, setFunction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showMetrics, setShowMetrics] = useState(false);
  const [invokePayload, setInvokePayload] = useState('{\n  \n}');
  const [invokeResult, setInvokeResult] = useState(null);
  const [invoking, setInvoking] = useState(false);

  // Fetch function details when component mounts
  useEffect(() => {
    const fetchFunction = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/functions/${id}`);
        setFunction(response.data);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch function details. Please try again later.');
        setLoading(false);
        console.error('Error fetching function:', err);
      }
    };

    fetchFunction();
  }, [id]);

  const handleInvokePayloadChange = (e) => {
    setInvokePayload(e.target.value);
  };

  const handleInvoke = async () => {
    try {
      setInvoking(true);
      setInvokeResult(null);
      
      // Parse payload
      let payload;
      try {
        payload = JSON.parse(invokePayload);
      } catch (err) {
        throw new Error('Invalid JSON payload. Please check the format.');
      }
      
      // Invoke function
      const response = await axios.post(`/api/functions/${id}/invoke`, payload);
      
      // Display result
      setInvokeResult({
        status: 'success',
        data: response.data.result,
        executionTime: response.data.executionTime,
        requestId: response.data.requestId
      });
      
      setInvoking(false);
      
      // Refresh metrics
      setShowMetrics(true);
    } catch (err) {
      setInvokeResult({
        status: 'error',
        error: err.response?.data?.message || err.message || 'Function invocation failed'
      });
      setInvoking(false);
      console.error('Error invoking function:', err);
    }
  };

  if (loading) {
    return <div className="text-center py-10">Loading function details...</div>;
  }

  if (error) {
    return <div className="text-center py-10 text-red-600">{error}</div>;
  }

  if (!function_) {
    return <div className="text-center py-10">Function not found.</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{function_.name}</h1>
        <div className="flex space-x-3">
          <button
            onClick={() => navigate('/')}
            className="btn btn-secondary"
          >
            Back to Functions
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Function Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <h3 className="text-md font-semibold mb-1">Route</h3>
                <p className="bg-gray-100 p-2 rounded">{function_.route}</p>
              </div>
              <div>
                <h3 className="text-md font-semibold mb-1">Language</h3>
                <p className="bg-gray-100 p-2 rounded">{function_.language}</p>
              </div>
              <div>
                <h3 className="text-md font-semibold mb-1">Virtualization</h3>
                <p className="bg-gray-100 p-2 rounded">{function_.virtualizationType}</p>
              </div>
              <div>
                <h3 className="text-md font-semibold mb-1">Timeout</h3>
                <p className="bg-gray-100 p-2 rounded">{function_.timeout} ms</p>
              </div>
              <div>
                <h3 className="text-md font-semibold mb-1">Status</h3>
                <p className="bg-gray-100 p-2 rounded">
                  {function_.status === 'ready' ? (
                    <span className="inline-block bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">Ready</span>
                  ) : function_.status === 'creating' ? (
                    <span className="inline-block bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs">Creating</span>
                  ) : (
                    <span className="inline-block bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs">Error</span>
                  )}
                </p>
              </div>
              <div>
                <h3 className="text-md font-semibold mb-1">Last Invoked</h3>
                <p className="bg-gray-100 p-2 rounded">
                  {function_.lastInvoked ? new Date(function_.lastInvoked).toLocaleString() : 'Never'}
                </p>
              </div>
            </div>
            
            <div className="mb-4">
              <h3 className="text-md font-semibold mb-1">Environment Variables</h3>
              {Object.entries(function_.environment || {}).length > 0 ? (
                <div className="bg-gray-100 p-2 rounded">
                  {Object.entries(function_.environment || {}).map(([key, value]) => (
                    <div key={key} className="mb-1">
                      <span className="font-semibold">{key}: </span>
                      <span>{value}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="bg-gray-100 p-2 rounded">No environment variables</p>
              )}
            </div>
            
            <div>
              <h3 className="text-md font-semibold mb-1">Function Code</h3>
              <SyntaxHighlighter
                language={function_.language === 'javascript' ? 'javascript' : 'python'}
                style={docco}
                className="p-4 border rounded-md"
              >
                {function_.code}
              </SyntaxHighlighter>
            </div>
          </div>
        </div>
        
        <div className="lg:col-span-1">
          <div className="card mb-6">
            <h2 className="text-xl font-semibold mb-4">Invoke Function</h2>
            <div className="mb-4">
              <label htmlFor="payload" className="form-label">Payload (JSON)</label>
              <textarea
                id="payload"
                className="form-input font-mono h-32"
                value={invokePayload}
                onChange={handleInvokePayloadChange}
                placeholder='{ "key": "value" }'
              />
            </div>
            <button
              onClick={handleInvoke}
              className="btn btn-primary w-full"
              disabled={invoking || function_.status !== 'ready'}
            >
              {invoking ? 'Invoking...' : 'Invoke Function'}
            </button>
            
            {function_.status !== 'ready' && (
              <p className="text-yellow-600 mt-2 text-sm">
                Function must be in "Ready" state to invoke.
              </p>
            )}
            
            {invokeResult && (
              <div className="mt-4">
                <h3 className="text-md font-semibold mb-1">Result</h3>
                <div className={`p-3 rounded-md ${invokeResult.status === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  {invokeResult.status === 'success' ? (
                    <>
                      <div className="text-sm text-gray-500 mb-1">
                        Execution time: {invokeResult.executionTime}ms | Request ID: {invokeResult.requestId}
                      </div>
                      <SyntaxHighlighter
                        language="json"
                        style={docco}
                        className="text-sm"
                      >
                        {JSON.stringify(invokeResult.data, null, 2)}
                      </SyntaxHighlighter>
                    </>
                  ) : (
                    <div className="text-red-600">
                      {invokeResult.error}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Metrics</h2>
          <button
            onClick={() => setShowMetrics(!showMetrics)}
            className="btn btn-secondary"
          >
            {showMetrics ? 'Hide Metrics' : 'Show Metrics'}
          </button>
        </div>
        
        {showMetrics && (
          <Metrics functionId={id} />
        )}
      </div>
    </div>
  );
};

export default FunctionDetail;