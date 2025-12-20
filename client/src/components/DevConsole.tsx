import React, { useState, useEffect, useRef } from 'react';
import { Terminal, X, Copy, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

interface LogEntry {
  id: string;
  type: 'error' | 'warn' | 'log' | 'info';
  message: string;
  timestamp: Date;
  stack?: string;
}

export const DevConsole: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    const originalInfo = console.info;

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

    console.log = (...args) => {
      originalLog(...args);
      addLog('log', ...args);
    };
    console.error = (...args) => {
      originalError(...args);
      addLog('error', ...args);
    };
    console.warn = (...args) => {
      originalWarn(...args);
      addLog('warn', ...args);
    };
    console.info = (...args) => {
      originalInfo(...args);
      addLog('info', ...args);
    };

    const handleError = (event: ErrorEvent) => {
      addLog('error', `Uncaught Error: ${event.message} at ${event.filename}:${event.lineno}`);
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      addLog('error', `Unhandled Rejection: ${event.reason}`);
    };

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

  useEffect(() => {
    if (scrollRef.current && !isMinimized) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, isMinimized]);

  const copyLogs = () => {
    const text = logs
      .map((l) => `[${l.timestamp.toISOString()}] [${l.type.toUpperCase()}] ${l.message}`)
      .join('\n');
    navigator.clipboard.writeText(text);
  };

  const clearLogs = () => {
    setLogs([]);
  };

  if (!isOpen && logs.filter(l => l.type === 'error').length === 0) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-[9999] bg-slate-800 text-white p-2 rounded-full shadow-lg hover:bg-slate-700 transition-colors"
        title="Open Dev Console"
      >
        <Terminal size={20} />
      </button>
    );
  }

  if (!isOpen) {
     return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-[9999] bg-red-600 text-white p-2 rounded-full shadow-lg hover:bg-red-700 animate-pulse transition-colors flex items-center gap-2"
        title="Open Dev Console (Errors present)"
      >
        <Terminal size={20} />
        <span className="text-xs font-bold">{logs.filter(l => l.type === 'error').length}</span>
      </button>
    );
  }

  return (
    <div
      className={cn(
        "fixed right-4 z-[9999] bg-slate-900 text-slate-100 border border-slate-700 shadow-2xl rounded-lg flex flex-col transition-all duration-200 overflow-hidden",
        isMinimized ? "bottom-4 w-64 h-12" : "bottom-4 w-[400px] h-[500px] max-w-[90vw] max-h-[80vh]"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-2 bg-slate-800 border-b border-slate-700 shrink-0">
        <div className="flex items-center gap-2 px-1">
          <Terminal size={14} className="text-blue-400" />
          <span className="text-xs font-bold uppercase tracking-wider">Dev Console</span>
          {logs.filter(l => l.type === 'error').length > 0 && (
             <span className="bg-red-500 text-[10px] px-1 rounded-sm text-white font-bold">
               {logs.filter(l => l.type === 'error').length}
             </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-white" onClick={copyLogs} title="Copy Logs">
            <Copy size={14} />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-white" onClick={clearLogs} title="Clear Logs">
            <Trash2 size={14} />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-white" onClick={() => setIsMinimized(!isMinimized)}>
            {isMinimized ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-white" onClick={() => setIsOpen(false)}>
            <X size={14} />
          </Button>
        </div>
      </div>

      {/* Logs Area */}
      {!isMinimized && (
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-2 font-mono text-[11px] space-y-1 bg-black/20"
        >
          {logs.length === 0 ? (
            <div className="text-slate-500 italic p-4 text-center">No logs captured yet.</div>
          ) : (
            logs.map((log) => (
              <div 
                key={log.id} 
                className={cn(
                  "p-1 rounded-sm border-l-2 break-all",
                  log.type === 'error' ? "bg-red-950/30 border-red-500 text-red-200" :
                  log.type === 'warn' ? "bg-yellow-950/30 border-yellow-500 text-yellow-200" :
                  log.type === 'info' ? "bg-blue-950/30 border-blue-500 text-blue-200" :
                  "border-slate-600 text-slate-300"
                )}
              >
                <span className="opacity-50 mr-2 text-[10px]">
                  {log.timestamp.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
                {log.message}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
