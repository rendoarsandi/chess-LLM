import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode | ((error: Error | null, reset: () => void) => ReactNode);
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in component:', error, errorInfo);
  }

  private resetErrorBoundary = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        if (typeof this.props.fallback === 'function') {
          return this.props.fallback(this.state.error, this.resetErrorBoundary);
        }
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4 text-center">
          <div className="max-w-md w-full space-y-6 p-10 bg-card rounded-3xl border border-destructive/20 shadow-2xl shadow-destructive/5 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-destructive/50" />
            
            <div className="flex justify-center">
              <div className="p-5 bg-destructive/10 rounded-full ring-8 ring-destructive/5">
                <AlertTriangle className="h-12 w-12 text-destructive" />
              </div>
            </div>
            
            <div className="space-y-2">
              <h1 className="text-3xl font-black tracking-tighter uppercase italic">System Failure</h1>
              <p className="text-muted-foreground font-semibold text-sm">
                The application encountered an irrecoverable state.
              </p>
            </div>

            <div className="bg-muted/50 p-4 rounded-xl text-left overflow-auto max-h-40 border border-border/50">
              <code className="text-[10px] text-destructive font-mono break-all leading-relaxed">
                {this.state.error?.toString() || "Unknown critical error."}
              </code>
            </div>

            <div className="pt-4 space-y-3">
              <Button 
                onClick={this.resetErrorBoundary}
                className="w-full flex items-center justify-center gap-2 font-black tracking-widest uppercase text-xs h-11"
                variant="outline"
              >
                <RefreshCw size={14} className="animate-spin-slow" />
                Attempt Reset
              </Button>
              <Button 
                onClick={() => window.location.reload()}
                className="w-full flex items-center justify-center gap-2 font-black tracking-widest uppercase text-xs h-11"
                variant="default"
              >
                <RefreshCw size={14} />
                Hard Reload System
              </Button>
            </div>
            
            <p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest opacity-40">
              Technical diagnostics available in console
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
