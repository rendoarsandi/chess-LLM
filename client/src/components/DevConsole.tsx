import React, { useState, useEffect, useRef } from 'react';
import { Terminal, X, Copy, ChevronDown, ChevronUp, Trash2, Send, Table } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

interface LogEntry {
  id: string;
  type: 'error' | 'warn' | 'log' | 'info' | 'sql' | 'result';
  message: string;
  timestamp: Date;
  stack?: string;
}

export const DevConsole: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(true);
  const [sqlInput, setSqlInput] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
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

  const addLocalLog = (type: LogEntry['type'], message: string) => {
    const newEntry: LogEntry = {
      id: Math.random().toString(36).substring(2, 9),
      type,
      message,
      timestamp: new Date(),
    };
    setLogs((prev) => [...prev.slice(-100), newEntry]);
  };

  const handleExecuteSql = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!sqlInput.trim() || isExecuting) return;

    const query = sqlInput.trim();
    setSqlInput('');
    setIsExecuting(true);
    addLocalLog('sql', query);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/admin/db/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: query }),
      });

      const data = await response.json();
      if (data.success) {
        addLocalLog('result', JSON.stringify(data.result, null, 2));
      } else {
        addLocalLog('error', `DB Error: ${data.error}`);
      }
    } catch (err) {
      addLocalLog('error', `Fetch Error: ${(err as Error).message}`);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleShowTables = async () => {
    if (isExecuting) return;
    setIsExecuting(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/admin/db/tables`);
      const data = await response.json();
      if (data.success) {
        const tableNames = data.tables.map((t: { name: string }) => t.name).join(', ');
        addLocalLog('info', `Available Tables: ${tableNames}`);
      } else {
        addLocalLog('error', `DB Error: ${data.error}`);
      }
    } catch (err) {
      addLocalLog('error', `Fetch Error: ${(err as Error).message}`);
    } finally {
      setIsExecuting(false);
    }
  };

  const copyLogs = () => {
    const text = logs
      .map((l) => `[${l.timestamp.toISOString()}] [${l.type.toUpperCase()}] ${l.message}`)
      .join('\n');
    navigator.clipboard.writeText(text);
  };

  const copyErrors = () => {
    const text = logs
      .filter(l => l.type === 'error')
      .map((l) => `[${l.timestamp.toISOString()}] [ERROR] ${l.message}`)
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
        isMinimized ? "bottom-4 w-64 h-12" : "bottom-4 w-[450px] h-[600px] max-w-[95vw] max-h-[90vh]"
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
          <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-400 hover:text-white" onClick={handleShowTables} title="List Tables">
            <Table size={14} />
          </Button>
          {logs.filter(l => l.type === 'error').length > 0 && (
            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-950/30" onClick={copyErrors} title="Copy Errors Only">
              <Copy size={14} />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-white" onClick={copyLogs} title="Copy All Logs">
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
        <>
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
                    "group relative p-1 rounded-sm border-l-2 break-all pr-8",
                    log.type === 'error' ? "bg-red-950/30 border-red-500 text-red-200" :
                    log.type === 'warn' ? "bg-yellow-950/30 border-yellow-500 text-yellow-200" :
                    log.type === 'info' ? "bg-blue-950/30 border-blue-500 text-blue-200" :
                    log.type === 'sql' ? "bg-purple-950/30 border-purple-500 text-purple-200 font-bold" :
                    log.type === 'result' ? "bg-green-950/30 border-green-500 text-green-200 whitespace-pre-wrap" :
                    "border-slate-600 text-slate-300"
                  )}
                >
                  <span className="opacity-50 mr-2 text-[10px]">
                    {log.timestamp.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                  {log.type === 'sql' && <span className="mr-1 text-purple-400 italic">SQL&gt;</span>}
                  {log.message}
                  <button 
                    onClick={() => navigator.clipboard.writeText(log.message)}
                    className="absolute right-1 top-1 opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded transition-opacity"
                    title="Copy this log"
                  >
                    <Copy size={12} />
                  </button>
                </div>
              ))
            )}
          </div>
          
          {/* SQL Input Area */}
          <form onSubmit={handleExecuteSql} className="p-2 bg-slate-800 border-t border-slate-700 flex gap-2">
            <input 
              type="text"
              value={sqlInput}
              onChange={(e) => setSqlInput(e.target.value)}
              placeholder="Enter SQL (e.g. SELECT * FROM players)"
              className="flex-1 bg-black/40 border border-slate-600 rounded px-2 py-1 text-[11px] font-mono focus:outline-none focus:border-blue-500"
              disabled={isExecuting}
            />
            <Button 
              type="submit" 
              size="icon" 
              variant="secondary" 
              className="h-7 w-7 shrink-0"
              disabled={isExecuting || !sqlInput.trim()}
            >
              <Send size={14} className={isExecuting ? "animate-pulse" : ""} />
            </Button>
          </form>
        </>
      )}
    </div>
  );
};
