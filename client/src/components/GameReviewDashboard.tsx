import React from 'react';
import type { GameReview, MoveAnalysis, Player } from '@/api';
import { Zap, Star, CheckCheck, Check, Info, AlertTriangle, XCircle, Search, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';

interface GameReviewDashboardProps {
  review: (GameReview & { analyses?: MoveAnalysis[] }) | null;
  whitePlayer?: Player;
  blackPlayer?: Player;
  onRetry?: () => void;
}

export const GameReviewDashboard: React.FC<GameReviewDashboardProps> = ({
  review,
  whitePlayer,
  blackPlayer,
  onRetry
}) => {
  const isLocalWorkerActive = review?.workerId?.startsWith('worker-');

  if (!review) return null;

  const isCompleted = review.status === 'completed';
  const isProcessing = review.status === 'processing';
  const isFailed = review.status === 'failed';
  const progress = review.progressTotal > 0 ? (review.progressCurrent / review.progressTotal) * 100 : 0;

  const getClassificationCounts = (playerColor: 'white' | 'black') => {
    if (!review.analyses) return {};
    const counts: Record<string, number> = {};
    review.analyses.forEach((analysis) => {
      if (analysis.playerColor === playerColor) {
        counts[analysis.classification] = (counts[analysis.classification] || 0) + 1;
      }
    });
    return counts;
  };

  const calculateAccuracy = (playerColor: 'white' | 'black') => {
    if (!review.analyses) return 0;
    let totalWeight = 0;
    let count = 0;
    review.analyses.forEach((analysis) => {
      if (analysis.playerColor === playerColor) {
        // Non-linear weights to punish blunders and mistakes more heavily
        const weights: Record<string, number> = {
          brilliant: 100,
          great: 95,
          best: 100,
          excellent: 90,
          good: 75,
          book: 100,
          inaccuracy: 40,
          mistake: 15,
          blunder: 0,
          miss: 10
        };
        totalWeight += weights[analysis.classification] ?? 70;
        count++;
      }
    });
    // In very short games, accuracy drops faster if you blunder early
    return count > 0 ? Math.round(totalWeight / count) : 0;
  };

  const ClassificationStat = ({ type, count }: { type: string, count: number }) => {
    const iconMap: Record<string, { icon: React.ComponentType<{ className?: string }>, color: string, label: string }> = {
      brilliant: { icon: Zap, color: "text-cyan-400", label: "!!" },
      great: { icon: Star, color: "text-blue-400", label: "!" },
      best: { icon: CheckCheck, color: "text-green-400", label: "★" },
      excellent: { icon: Check, color: "text-green-500", label: "" },
      good: { icon: Check, color: "text-slate-400", label: "" },
      book: { icon: Info, color: "text-orange-400", label: "📖" },
      inaccuracy: { icon: Info, color: "text-yellow-400", label: "?!" },
      mistake: { icon: AlertTriangle, color: "text-orange-500", label: "?" },
      blunder: { icon: XCircle, color: "text-red-500", label: "??" },
      miss: { icon: Search, color: "text-purple-400", label: "X" },
    };
    const cfg = iconMap[type];
    if (!cfg || !count) return null;
    const Icon = cfg.icon;

    return (
      <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-tighter py-1 border-b border-border/50 last:border-0">
        <div className="flex items-center gap-2">
          <div className={cn("p-1 rounded bg-muted/50", cfg.color)}>
            <Icon className="w-3 h-3" />
          </div>
          <span className="text-muted-foreground">{type}</span>
        </div>
        <span className="text-foreground">{count}</span>
      </div>
    );
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="p-4 bg-muted/50 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
          <Search className="w-4 h-4 text-primary" />
          Game Review
        </h3>
        {isProcessing && (
          <div className="flex items-center gap-2 text-[10px] font-black text-primary animate-pulse">
            <Loader2 className="w-3 h-3 animate-spin" />
            ANALYZING...
          </div>
        )}
        {isCompleted && (
          <div className="text-[10px] font-black text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">
            COMPLETED
          </div>
        )}
      </div>

      {isProcessing && (
        <div className="px-4 py-1 bg-primary/5 border-b border-border flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest text-muted-foreground">
            <div className={cn("w-1.5 h-1.5 rounded-full", isLocalWorkerActive ? "bg-primary animate-pulse" : "bg-muted")} />
            {isLocalWorkerActive ? "Your browser is analyzing" : "Remote worker active"}
          </div>
          <div className="text-[6px] font-mono text-muted-foreground opacity-50">
            Worker ID: {review.workerId}
          </div>
        </div>
      )}

      <div className="p-6 space-y-6">
        {isFailed && (
          <div className="py-8 text-center space-y-4">
            <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mx-auto">
              <XCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold uppercase tracking-widest text-red-500">Analysis Failed</p>
              <p className="text-xs text-muted-foreground">The worker encountered an error while analyzing this game.</p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="font-black text-[10px] tracking-widest uppercase h-8"
              onClick={onRetry}
            >
              RETRY ANALYSIS
            </Button>
          </div>
        )}

        {(!isCompleted && !isProcessing && !isFailed) && (
          <div className="py-8 text-center space-y-4">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary mx-auto">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold uppercase tracking-widest">In Queue</p>
              <p className="text-xs text-muted-foreground">Waiting for an available worker to start analysis...</p>
            </div>
          </div>
        )}

        {isProcessing && (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                <span>Progress</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden border border-border">
                <div 
                  className="h-full bg-primary transition-all duration-500 ease-out shadow-[0_0_10px_rgba(var(--primary),0.5)]" 
                  style={{ width: `${progress}%` }} 
                />
              </div>
            </div>
            <p className="text-[10px] text-center text-muted-foreground uppercase font-bold tracking-widest animate-pulse">
              Analyzing move {review.progressCurrent} of {review.progressTotal}...
            </p>
          </div>
        )}

        {isCompleted && (
          <div className="grid grid-cols-2 gap-8">
            {/* White Player Stats */}
            <div className="space-y-4">
              <div className="text-center space-y-1">
                <div className="text-2xl font-black text-primary leading-none">{calculateAccuracy('white')}%</div>
                <div className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Accuracy</div>
                <div className="text-[10px] font-bold truncate mt-2">{whitePlayer?.name || 'White'}</div>
              </div>
              <div className="bg-muted/30 p-3 rounded-lg border border-border/50">
                {Object.entries(getClassificationCounts('white')).map(([type, count]) => (
                  <ClassificationStat key={type} type={type} count={count} />
                ))}
              </div>
            </div>

            {/* Black Player Stats */}
            <div className="space-y-4">
              <div className="text-center space-y-1">
                <div className="text-2xl font-black text-foreground leading-none">{calculateAccuracy('black')}%</div>
                <div className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Accuracy</div>
                <div className="text-[10px] font-bold truncate mt-2">{blackPlayer?.name || 'Black'}</div>
              </div>
              <div className="bg-muted/30 p-3 rounded-lg border border-border/50">
                {Object.entries(getClassificationCounts('black')).map(([type, count]) => (
                  <ClassificationStat key={type} type={type} count={count} />
                ))}
              </div>
            </div>
          </div>
        )}

        {isCompleted && (
          <div className="text-center text-[10px] font-black text-muted-foreground uppercase tracking-widest bg-muted/30 py-2 rounded border border-border/50">
            ANALYSIS SUMMARY ONLY
          </div>
        )}
      </div>
    </div>
  );
};
