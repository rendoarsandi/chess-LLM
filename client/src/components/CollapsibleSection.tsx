import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  className?: string;
}

export function CollapsibleSection({ title, children, defaultExpanded = false, className }: CollapsibleSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className={cn("border border-border rounded-lg bg-card overflow-hidden", className)}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
      >
        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{title}</span>
        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      <div className={cn(
        "transition-all duration-300 ease-in-out",
        isExpanded ? "max-h-[1000px] opacity-100 p-4 pt-0" : "max-h-0 opacity-0 overflow-hidden"
      )}>
        {children}
      </div>
    </div>
  );
}
