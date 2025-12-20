export interface EngineEvaluation {
  score: number; // in centipawns
  isMate: boolean;
  mateIn?: number;
  depth: number;
}

export type EngineCallback = (evaluation: EngineEvaluation) => void;

export class StockfishWorker {
  private worker: Worker | null = null;
  private onEvaluation: EngineCallback | null = null;
  private isTerminated: boolean = false;

  constructor(callback: EngineCallback) {
    this.onEvaluation = callback;
    this.init();
  }

  private init() {
    try {
      this.worker = new Worker('/stockfish/stockfish.js');
      
      this.worker.onerror = (err) => {
        console.error('[StockfishWorker] Worker error event:', err);
      };

      this.worker.onmessage = (e) => {
        if (this.isTerminated) return;
        this.handleMessage(e.data);
      };
      
      this.sendMessage('uci');
      this.sendMessage('setoption name Threads value 1');
      this.sendMessage('ucinewgame');
      this.sendMessage('isready');
    } catch (error) {
      console.error('[StockfishWorker] Critical failure during initialization:', error);
      this.isTerminated = true;
    }
  }

  private handleMessage = (message: string) => {
    if (typeof message !== 'string') return;

    if (message === 'readyok') {
      return;
    }

    if (message.startsWith('uciok')) {
      return;
    }

    // Capture ANY info message to see if engine is even thinking
    if (message.startsWith('info')) {
      if (message.includes('score')) {
        const evaluation = this.parseInfo(message);
        if (evaluation && this.onEvaluation) {
          this.onEvaluation(evaluation);
        }
      }
    }
  }

  private parseInfo = (message: string): EngineEvaluation | null => {
    const depthMatch = message.match(/depth (\d+)/);
    const scoreMatch = message.match(/score (cp|mate) (-?\d+)/);

    if (!depthMatch || !scoreMatch) return null;

    const depth = parseInt(depthMatch[1]);
    const type = scoreMatch[1];
    const value = parseInt(scoreMatch[2]);

    return {
      score: type === 'cp' ? value : 0,
      isMate: type === 'mate',
      mateIn: type === 'mate' ? value : undefined,
      depth,
    };
  }

  public analyze(fen: string, depth: number = 18) {
    if (!this.worker || this.isTerminated) {
      return;
    }

    this.sendMessage('stop');
    this.sendMessage(`position fen ${fen}`);
    this.sendMessage(`go depth ${depth}`);
  }

  private sendMessage(command: string) {
    if (this.worker && !this.isTerminated) {
      try {
        this.worker.postMessage(command);
      } catch (e) {
        console.error('[StockfishWorker] Failed to send message:', e);
        this.terminate();
      }
    }
  }

  public terminate() {
    this.isTerminated = true;
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}
