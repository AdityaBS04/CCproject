import React from 'react';

const Loading = ({ message = 'Loading...' }) => {
  return (
    <div className="loading">
      <div className="loading-spinner"></div>
      <span className="loading-text">{message}</span>
    </div>
  );
};

export default Loading;