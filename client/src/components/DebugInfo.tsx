import React from 'react';

const DebugInfo: React.FC = () => {
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  const currentPath = window.location.pathname;
  const currentUrl = window.location.href;

  return (
    <div className="fixed bottom-4 right-4 bg-black bg-opacity-75 text-white p-4 rounded-lg text-xs max-w-sm z-50">
      <h3 className="font-bold mb-2">Debug Info</h3>
      <div className="space-y-1">
        <div><strong>API Base:</strong> {apiBase}</div>
        <div><strong>Current Path:</strong> {currentPath}</div>
        <div><strong>Current URL:</strong> {currentUrl}</div>
        <div><strong>User Agent:</strong> {navigator.userAgent.substring(0, 50)}...</div>
      </div>
    </div>
  );
};

export default DebugInfo; 