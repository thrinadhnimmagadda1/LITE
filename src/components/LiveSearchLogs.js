import React, { useState, useEffect } from 'react';
import { useLogs } from '../context/LogsContext';

const LiveSearchLogs = ({ isSearching, searchQuery, optionalKeywords }) => {
  const { logs } = useLogs();
  const [searchLogs, setSearchLogs] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);

  // Filter logs related to the current search
  useEffect(() => {
    if (isSearching && searchQuery) {
      const relevantLogs = logs.filter(log => 
        log.message.includes(searchQuery) || 
        log.message.includes('Search') ||
        log.message.includes('API') ||
        log.message.includes('Loading') ||
        log.message.includes('Backend')
      );
      setSearchLogs(relevantLogs);
    }
  }, [logs, isSearching, searchQuery]);

  // Simulate search steps for better UX
  useEffect(() => {
    if (isSearching) {
      const steps = [
        { message: 'Initializing search...', icon: '🔍', color: 'text-blue-600' },
        { message: 'Connecting to backend...', icon: '🔗', color: 'text-indigo-600' },
        { message: 'Processing search query...', icon: '⚙️', color: 'text-purple-600' },
        { message: 'Fetching research papers...', icon: '📚', color: 'text-green-600' },
        { message: 'Analyzing results...', icon: '📊', color: 'text-cyan-600' }
      ];

      let stepIndex = 0;
      const stepInterval = setInterval(() => {
        if (stepIndex < steps.length) {
          setCurrentStep(stepIndex);
          stepIndex++;
        } else {
          clearInterval(stepInterval);
        }
      }, 800);

      return () => clearInterval(stepInterval);
    }
  }, [isSearching]);

  if (!isSearching) {
    return null;
  }

  return (
    <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-2xl border border-blue-200/50 shadow-lg">
      <div className="text-center mb-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-2">Live Search Progress</h3>
        <p className="text-gray-600">Real-time backend activity for: <span className="font-medium text-indigo-600">"{searchQuery}"</span></p>
        {optionalKeywords && (
          <p className="text-sm text-gray-500 mt-1">With keywords: <span className="font-medium">{optionalKeywords}</span></p>
        )}
      </div>

      {/* Search Steps Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-gray-700">Search Progress</span>
          <span className="text-sm text-indigo-600 font-medium">
            Step {currentStep + 1} of 5
          </span>
        </div>
        
        <div className="space-y-3">
          {[
            { message: 'Initializing search...', icon: '🔍', color: 'text-blue-600' },
            { message: 'Connecting to backend...', icon: '🔗', color: 'text-indigo-600' },
            { message: 'Processing search query...', icon: '⚙️', color: 'text-purple-600' },
            { message: 'Fetching research papers...', icon: '📚', color: 'text-green-600' },
            { message: 'Analyzing results...', icon: '📊', color: 'text-cyan-600' }
          ].map((step, index) => (
            <div key={index} className={`flex items-center space-x-3 p-3 rounded-xl transition-all duration-300 ${
              index <= currentStep 
                ? 'bg-white/80 border border-blue-200 shadow-sm' 
                : 'bg-gray-100/50 border border-gray-200'
            }`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-lg ${
                index <= currentStep ? 'bg-blue-100' : 'bg-gray-200'
              }`}>
                {index < currentStep ? '✅' : step.icon}
              </div>
              <span className={`flex-1 text-sm font-medium ${
                index <= currentStep ? step.color : 'text-gray-500'
              }`}>
                {step.message}
              </span>
              {index === currentStep && (
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Real-time Backend Logs */}
      <div className="bg-white/80 rounded-xl border border-gray-200 p-4 max-h-48 overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-gray-700">Backend Activity Logs</h4>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
            {searchLogs.length} logs
          </span>
        </div>
        
        {searchLogs.length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-2">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-sm">Waiting for backend activity...</p>
          </div>
        ) : (
          <div className="space-y-2">
            {searchLogs.slice(-5).map((log, index) => (
              <div key={log.id} className="flex items-start space-x-2 p-2 bg-gray-50 rounded-lg">
                <div className={`w-2 h-2 rounded-full mt-2 ${
                  log.type === 'success' ? 'bg-green-500' :
                  log.type === 'warning' ? 'bg-yellow-500' :
                  log.type === 'error' ? 'bg-red-500' : 'bg-blue-500'
                }`}></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-600">{log.timestamp}</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      log.type === 'success' ? 'bg-green-100 text-green-700' :
                      log.type === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                      log.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {log.type}
                    </span>
                  </div>
                  <p className="text-sm text-gray-800">{log.message}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Status Indicator */}
      <div className="mt-4 flex items-center justify-center space-x-2 text-sm text-gray-600">
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
        <span>Live backend monitoring active</span>
      </div>
    </div>
  );
};

export default LiveSearchLogs;
