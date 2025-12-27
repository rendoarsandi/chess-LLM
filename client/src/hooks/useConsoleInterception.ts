import { useState, useEffect } from 'react';

export interface LogEntry {
  id: string;
  type: 'error' | 'warn' | 'log' | 'info' | 'sql' | 'result';
  message: string;
  timestamp: Date;
  stack?: string;
}

export function useConsoleInterception() {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const addLog = (type: LogEntry['type'], ...args: unknown[]) => {
    const message = args
      .map((arg) => (typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)))
      .join(' ');
    
    const newEntry: LogEntry = {
      id: Math.random().toString(36).substring(2, 9),
      type,
      message,
      timestamp: new Date(),
      stack: type === 'error' ? new Error().stack : undefined,
    };

    setLogs((prev) => [...prev.slice(-100), newEntry]);
  };

  useEffect(() => {
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    const originalInfo = console.info;

    console.log = (...args) => { originalLog(...args); addLog('log', ...args); };
    console.error = (...args) => { originalError(...args); addLog('error', ...args); };
    console.warn = (...args) => { originalWarn(...args); addLog('warn', ...args); };
    console.info = (...args) => { originalInfo(...args); addLog('info', ...args); };

    const handleError = (event: ErrorEvent) => addLog('error', `Uncaught Error: ${event.message} at ${event.filename}:${event.lineno}`);
    const handleRejection = (event: PromiseRejectionEvent) => addLog('error', `Unhandled Rejection: ${event.reason}`);

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
      console.info = originalInfo;
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  return { logs, setLogs, addLog };
}
