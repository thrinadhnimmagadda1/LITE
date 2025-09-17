import React from 'react';
import { useLogs } from '../context/LogsContext';

const LiveLogs = () => {
  const { logs, isLogsVisible, toggleLogs, clearLogs } = useLogs();

  const getLogIcon = (type) => {
    switch (type) {
      case 'success':
        return (
          <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const getLogColor = (type) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  if (!isLogsVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={toggleLogs}
          className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex items-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span>Live Logs ({logs.length})</span>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 max-h-96">
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-white font-semibold">Live Logs</span>
            <span className="bg-white/20 text-white text-xs px-2 py-1 rounded-full">
              {logs.length}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={clearLogs}
              className="text-white/80 hover:text-white transition-colors p-1"
              title="Clear logs"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
            <button
              onClick={toggleLogs}
              className="text-white/80 hover:text-white transition-colors p-1"
              title="Minimize logs"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Logs Content */}
        <div className="max-h-80 overflow-y-auto p-3 space-y-2">
          {logs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <svg className="w-12 h-12 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p>No logs yet</p>
              <p className="text-sm">Start searching to see live activity</p>
            </div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className={`p-3 rounded-lg border ${getLogColor(log.type)} transition-all duration-200 hover:shadow-md`}
              >
                <div className="flex items-start space-x-2">
                  {getLogIcon(log.type)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium opacity-75">{log.timestamp}</span>
                      <span className="text-xs font-medium capitalize">{log.type}</span>
                    </div>
                    <p className="text-sm font-medium">{log.message}</p>
                    {log.details && (
                      <details className="mt-2">
                        <summary className="text-xs cursor-pointer hover:underline">Show details</summary>
                        <pre className="text-xs mt-2 p-2 bg-white/50 rounded border overflow-x-auto">
                          {typeof log.details === 'object' ? JSON.stringify(log.details, null, 2) : log.details}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-gray-50/50 border-t border-gray-200/50 text-xs text-gray-500 text-center">
          Real-time backend activity logs
        </div>
      </div>
    </div>
  );
};

export default LiveLogs;
