export class StockfishPlayerService {
  private worker: Worker | null = null;
  private isEngineReady: boolean = false;
  private pendingRequest: { resolve: (move: string) => void; fen: string; depth: number } | null = null;
  private isSearching: boolean = false;
  private isTerminated: boolean = false;

  constructor() {
    this.init();
  }

  private init() {
    console.log('[StockfishPlayerService] Initializing worker. Origin:', window.location.origin, 'Path:', window.location.pathname);
    console.log('[StockfishPlayerService] Initializing worker from /stockfish/stockfish.js');
    if (typeof Worker === 'undefined') {
      console.error('[StockfishPlayerService] Web Workers are not supported in this environment.');
      this.isTerminated = true;
      return;
    }
    try {
      console.log('[StockfishPlayerService] Attempting to create Worker...');
      const workerUrl = new URL('/stockfish/stockfish-17.1-lite-single-03e3232.js', window.location.origin).href;

      // Pre-flight check to see if the script is accessible
      fetch(workerUrl, { method: 'HEAD' })
        .then(resp => {
          console.log('[StockfishPlayerService] Pre-flight check status:', resp.status, resp.statusText);
          if (!resp.ok) console.error('[StockfishPlayerService] Worker script might not be accessible!');
        })
        .catch(err => console.error('[StockfishPlayerService] Pre-flight check failed:', err));

      this.worker = new Worker(workerUrl);
      console.log('[StockfishPlayerService] Worker object created successfully');
      
      this.worker.onerror = (err) => {
        console.error('[StockfishPlayerService] Worker error event:', err);
        const errorMsg = `[StockfishPlayerService] Worker.onerror: ${err.message || 'Unknown message'} at ${err.filename || 'unknown'}:${err.lineno || 0}`;
        console.error(errorMsg);
        if (err.error) console.error('[StockfishPlayerService] Error object:', err.error);
      };
      this.worker.onmessage = (e) => this.handleMessage(e.data);
      
      // Small delay before first command
      setTimeout(() => {
        this.sendMessage('uci');
      }, 100);
    } catch (error) {
      console.error('[StockfishPlayerService] Failed to initialize worker:', error);
      this.isTerminated = true;
    }
  }

  private handleMessage(message: string) {
    if (this.isTerminated || typeof message !== 'string') return;

    if (message.startsWith('uciok')) {
      console.log('[StockfishPlayerService] Engine UCI ready');
      this.sendMessage('setoption name Threads value 1');
      this.sendMessage('setoption name Hash value 32');
      this.sendMessage('ucinewgame');
      this.sendMessage('isready');
    } else if (message.startsWith('readyok')) {
      console.log('[StockfishPlayerService] Engine Ready (readyok)');
      this.isEngineReady = true;
      this.processQueue();
    } else if (message.startsWith('bestmove')) {
      const parts = message.split(' ');
      if (parts.length >= 2 && this.pendingRequest) {
        const move = parts[1];
        this.isSearching = false;
        this.pendingRequest.resolve(move);
        this.pendingRequest = null;
      }
    }
  }

  private sendMessage(command: string) {
    if (this.worker && !this.isTerminated) {
      try {
        this.worker.postMessage(command);
      } catch (e) {
        console.error('[StockfishPlayerService] Failed to send message:', e);
        this.terminate();
      }
    }
  }

  private processQueue() {
    if (!this.isEngineReady || this.isSearching || !this.pendingRequest) return;
    
    const { fen, depth } = this.pendingRequest;
    this.isSearching = true;
    this.sendMessage(`position fen ${fen}`);
    this.sendMessage(`go depth ${depth}`);
  }

  public calculateMove(fen: string, depth: number = 18): Promise<string> {
    return new Promise((resolve) => {
      // If there was a pending request, we might want to reject it or just overwrite it
      // For the Player role, we expect only one REQUEST_MOVE at a time from the server.
      if (this.pendingRequest) {
        console.warn('[StockfishPlayerService] Overwriting pending move request');
      }
      
      this.pendingRequest = { resolve, fen, depth };
      this.processQueue();
    });
  }

  public terminate() {
    this.isTerminated = true;
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}
