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
          <div className="max-w-md w-full space-y-6 p-8 bg-card rounded-2xl border border-destructive/20 shadow-2xl">
            <div className="flex justify-center">
              <div className="p-4 bg-destructive/10 rounded-full">
                <AlertTriangle className="h-12 w-12 text-destructive" />
              </div>
            </div>
            
            <div className="space-y-2">
              <h1 className="text-2xl font-black tracking-tight uppercase italic">Arena System Failure</h1>
              <p className="text-muted-foreground font-medium">
                The application encountered an unexpected state and had to be halted.
              </p>
            </div>

            <div className="bg-black/20 p-4 rounded-lg text-left overflow-auto max-h-40">
              <code className="text-xs text-red-400 font-mono break-all">
                {this.state.error?.toString()}
              </code>
            </div>

            <div className="pt-4 space-y-3">
              <Button 
                onClick={this.resetErrorBoundary}
                className="w-full flex items-center justify-center gap-2 font-black tracking-widest uppercase"
                variant="outline"
              >
                <RefreshCw size={16} />
                Attempt Recovery
              </Button>
              <Button 
                onClick={() => window.location.reload()}
                className="w-full flex items-center justify-center gap-2 font-black tracking-widest uppercase"
                variant="default"
              >
                <RefreshCw size={16} />
                Initialize System Recovery
              </Button>
            </div>
            
            <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest opacity-50">
              Check Dev Console for detailed logs
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
