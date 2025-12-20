import React, { useState, useEffect } from 'react';

export const ErrorOverlay: React.FC = () => {
  const [logs, setLogs] = useState<{ type: 'error' | 'warn' | 'log' | 'debug'; message: string; timestamp: string }[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const addLog = (type: 'error' | 'warn' | 'log' | 'debug', ...args: any[]) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      
      setLogs(prev => [{
        type,
        message,
        timestamp: new Date().toLocaleTimeString()
      }, ...prev].slice(0, 50)); // Keep last 50 logs
    };

    // Intercept console methods
    const originalError = console.error;
    const originalWarn = console.warn;
    const originalLog = console.log;
    const originalDebug = console.debug;

    console.error = (...args) => {
      addLog('error', ...args);
      originalError.apply(console, args);
    };

    console.warn = (...args) => {
      addLog('warn', ...args);
      originalWarn.apply(console, args);
    };

    console.log = (...args) => {
      addLog('log', ...args);
      originalLog.apply(console, args);
    };

    console.debug = (...args) => {
      addLog('debug', ...args);
      originalDebug.apply(console, args);
    };

    // Catch global window errors
    const handleError = (event: ErrorEvent) => {
      addLog('error', 'Global Error:', event.message, 'at', event.filename, ':', event.lineno);
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      addLog('error', 'Unhandled Rejection:', event.reason);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      console.error = originalError;
      console.warn = originalWarn;
      console.log = originalLog;
      console.debug = originalDebug;
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  if (logs.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] max-w-[90vw]">
      {!isOpen ? (
        <button 
          onClick={() => setIsOpen(true)}
          className="bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg animate-pulse"
        >
          {logs.length} Log Errors (Tap to view)
        </button>
      ) : (
        <div className="bg-black border-2 border-red-600 rounded-lg shadow-2xl p-4 w-[350px] max-h-[400px] overflow-hidden flex flex-col">
          <div className="flex justify-between items-center mb-2 border-bottom border-neutral-800 pb-2">
            <h3 className="text-red-500 font-bold text-sm">Debug Logs</h3>
            <div className="flex gap-2">
                <button 
                  onClick={() => {
                    const text = logs.map(l => `[${l.timestamp}] ${l.message}`).join('\n');
                    navigator.clipboard.writeText(text);
                    alert('Logs copied to clipboard');
                  }} 
                  className="text-[10px] text-neutral-400 hover:text-white"
                >
                  Copy All
                </button>
                <button onClick={() => setLogs([])} className="text-[10px] text-neutral-400 hover:text-white">Clear</button>
                <button onClick={() => setIsOpen(false)} className="text-[10px] text-neutral-400 hover:text-white font-bold">Close</button>
            </div>
          </div>
          <div className="overflow-y-auto space-y-2 flex-1 font-mono">
            {logs.map((log, i) => (
              <div key={i} className={`text-[10px] p-2 rounded ${
                log.type === 'error' ? 'bg-red-950 text-red-200' : 
                log.type === 'warn' ? 'bg-orange-950 text-orange-200' :
                log.type === 'debug' ? 'bg-neutral-950 text-neutral-400' :
                'bg-neutral-900 text-neutral-200'
              }`}>
                <span className="opacity-50 mr-1">[{log.timestamp}]</span>
                {log.message}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
