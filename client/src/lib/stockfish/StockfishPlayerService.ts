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
    console.log('[StockfishPlayerService] Initializing worker from /stockfish/stockfish.js');
    try {
      this.worker = new Worker('/stockfish/stockfish.js');
      this.worker.onmessage = (e) => this.handleMessage(e.data);
      this.sendMessage('uci');
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
