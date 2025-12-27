import React, { useState, useEffect, useRef } from 'react';
import { Terminal, X, Copy, ChevronDown, ChevronUp, Trash2, Send, Table } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { useConsoleInterception } from '@/hooks/useConsoleInterception';

export const DevConsole: React.FC = () => {
  const { logs, setLogs, addLog } = useConsoleInterception();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(true);
  const [sqlInput, setSqlInput] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current && !isMinimized) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    // Auto-expand if minimized and new logs arrive (optional, but helpful for visibility)
    if (isMinimized && logs.length > 0 && logs[logs.length - 1].type === 'error') {
      setIsMinimized(false);
    }
  }, [logs, isMinimized]);

  const handleDbAction = async (endpoint: string, method: string = 'GET', body?: object) => {
    if (isExecuting) return;
    setIsExecuting(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/admin/db/${endpoint}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await response.json();
      if (data.success) {
        if (endpoint === 'execute') addLog('result', JSON.stringify(data.result, null, 2));
        else if (endpoint === 'tables') addLog('info', `Available Tables: ${data.tables.map((t: any) => t.name).join(', ')}`);
      } else {
        addLog('error', `DB Error: ${data.error}`);
      }
    } catch (err) {
      addLog('error', `Fetch Error: ${(err as Error).message}`);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleExecuteSql = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!sqlInput.trim()) return;
    const query = sqlInput.trim();
    setSqlInput('');
    addLog('sql', query);
    handleDbAction('execute', 'POST', { sql: query });
  };

  const copyLogs = (onlyErrors = false) => {
    const filtered = onlyErrors ? logs.filter(l => l.type === 'error') : logs;
    const text = filtered.map((l) => `[${l.timestamp.toISOString()}] [${l.type.toUpperCase()}] ${l.message}`).join('\n');
    navigator.clipboard.writeText(text);
  };

  const errorCount = logs.filter(l => l.type === 'error').length;

  if (!isOpen && errorCount === 0) {
    return <button onClick={() => setIsOpen(true)} className="fixed bottom-4 right-4 z-[10000] bg-slate-800 text-white p-2 rounded-full shadow-lg hover:bg-slate-700 transition-colors pointer-events-auto" title="Open Dev Console"><Terminal size={20} /></button>;
  }

  if (!isOpen) {
    return <button onClick={() => setIsOpen(true)} className="fixed bottom-4 right-4 z-[10000] bg-red-600 text-white p-2 rounded-full shadow-lg hover:bg-red-700 animate-pulse transition-colors flex items-center gap-2 pointer-events-auto" title="Open Dev Console (Errors present)"><Terminal size={20} /><span className="text-xs font-bold">{errorCount}</span></button>;
  }

  return (
    <div className={cn(
        "fixed right-4 z-[10000] bg-slate-900 text-slate-100 border border-slate-700 shadow-2xl rounded-lg flex flex-col transition-all duration-200 overflow-hidden pointer-events-auto",
        isMinimized ? "bottom-4 w-64 h-12" : "bottom-4 w-[450px] h-[600px] max-w-[95vw] max-h-[90vh]"
      )}>
      <div 
        className="flex items-center justify-between p-2 bg-slate-800 border-b border-slate-700 shrink-0 cursor-pointer hover:bg-slate-700 active:bg-slate-600 transition-colors"
        onClick={() => setIsMinimized(!isMinimized)}
      >
        <div className="flex items-center gap-2 px-1">
          <Terminal size={14} className="text-blue-400" />
          <span className="text-[10px] font-black uppercase tracking-widest">Dev Console</span>
          {errorCount > 0 && <span className="bg-red-500 text-[10px] px-1 rounded-sm text-white font-bold">{errorCount}</span>}
        </div>
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-400" onClick={() => handleDbAction('tables')} title="List Tables"><Table size={14} /></Button>
          {errorCount > 0 && <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400" onClick={() => copyLogs(true)} title="Copy Errors"><Copy size={14} /></Button>}
          <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400" onClick={() => copyLogs(false)} title="Copy Logs"><Copy size={14} /></Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400" onClick={() => setLogs([])} title="Clear"><Trash2 size={14} /></Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400" onClick={() => setIsMinimized(!isMinimized)}>{isMinimized ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400" onClick={() => setIsOpen(false)}><X size={14} /></Button>
        </div>
      </div>

      {!isMinimized && (
        <>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-2 font-mono text-[11px] space-y-1 bg-black/20">
            {logs.length === 0 ? <div className="text-slate-500 italic p-4 text-center">No logs.</div> : logs.map((log) => (
              <div key={log.id} className={cn("group relative p-1 rounded-sm border-l-2 break-all pr-8", log.type === 'error' ? "bg-red-950/30 border-red-500 text-red-200" : log.type === 'warn' ? "bg-yellow-950/30 border-yellow-500 text-yellow-200" : log.type === 'info' ? "bg-blue-950/30 border-blue-500 text-blue-200" : log.type === 'sql' ? "bg-purple-950/30 border-purple-500 text-purple-200 font-bold" : log.type === 'result' ? "bg-green-950/30 border-green-500 text-green-200 whitespace-pre-wrap" : "border-slate-600 text-slate-300")}>
                <span className="opacity-50 mr-2 text-[10px]">{log.timestamp.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                {log.type === 'sql' && <span className="mr-1 text-purple-400 italic">SQL&gt;</span>}
                {log.message}
                <button onClick={() => navigator.clipboard.writeText(log.message)} className="absolute right-1 top-1 opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded transition-opacity"><Copy size={12} /></button>
              </div>
            ))}
          </div>
          <form onSubmit={handleExecuteSql} className="p-2 bg-slate-800 border-t border-slate-700 flex gap-2">
            <input type="text" value={sqlInput} onChange={(e) => setSqlInput(e.target.value)} placeholder="Enter SQL..." className="flex-1 bg-black/40 border border-slate-600 rounded px-2 py-1 text-[11px] font-mono focus:outline-none" disabled={isExecuting} />
            <Button type="submit" size="icon" variant="secondary" className="h-7 w-7" disabled={isExecuting || !sqlInput.trim()}><Send size={14} className={isExecuting ? "animate-pulse" : ""} /></Button>
          </form>
        </>
      )}
    </div>
  );
};