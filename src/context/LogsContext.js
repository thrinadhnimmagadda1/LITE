import React, { createContext, useContext, useState, useCallback } from 'react';

const LogsContext = createContext();

export const useLogs = () => {
  const context = useContext(LogsContext);
  if (!context) {
    throw new Error('useLogs must be used within a LogsProvider');
  }
  return context;
};

export const LogsProvider = ({ children }) => {
  const [logs, setLogs] = useState([]);
  const [isLogsVisible, setIsLogsVisible] = useState(false);

  const addLog = useCallback((log) => {
    setLogs(prevLogs => [
      {
        id: Date.now(),
        timestamp: new Date().toLocaleTimeString(),
        message: log.message,
        type: log.type || 'info', // 'info', 'success', 'warning', 'error'
        details: log.details || null,
        ...log
      },
      ...prevLogs.slice(0, 99) // Keep only last 100 logs
    ]);
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  const toggleLogs = useCallback(() => {
    setIsLogsVisible(prev => !prev);
  }, []);

  const value = {
    logs,
    addLog,
    clearLogs,
    isLogsVisible,
    toggleLogs
  };

  return (
    <LogsContext.Provider value={value}>
      {children}
    </LogsContext.Provider>
  );
};
