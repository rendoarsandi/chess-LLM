export interface EngineEvaluation {
  score: number; // in centipawns
  isMate: boolean;
  mateIn?: number;
  depth: number;
  multipv?: number;
  pv?: string;
  sideToMove?: 'w' | 'b';
}

export type EngineCallback = (evaluation: EngineEvaluation) => void;

export class StockfishWorker {
  private worker: Worker | null = null;
  private onEvaluation: EngineCallback | null = null;
  private isTerminated: boolean = false;
  private multiPv: number = 3;
  private isReady: boolean = false;
  private isSearching: boolean = false;
  private pendingFen: string | null = null;

  constructor(callback: EngineCallback, multiPv: number = 3) {
    this.onEvaluation = callback;
    this.multiPv = multiPv;
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
    } catch (error) {
      console.error('[StockfishWorker] Critical failure during initialization:', error);
      this.isTerminated = true;
    }
  }

  private currentSideToMove: 'w' | 'b' = 'w';

  private handleMessage = (message: string) => {
    if (typeof message !== 'string') return;

    if (message.startsWith('uciok')) {
      this.sendMessage('setoption name Threads value 1');
      this.sendMessage('setoption name Hash value 16'); // Reduced for stability
      this.sendMessage(`setoption name MultiPV value ${this.multiPv}`);
      this.sendMessage('ucinewgame');
      this.sendMessage('isready');
      return;
    }

    if (message.startsWith('readyok')) {
      this.isReady = true;
      if (this.pendingFen) {
        const fen = this.pendingFen;
        this.pendingFen = null;
        this.analyze(fen, 18);
      }
      return;
    }

    if (message.startsWith('bestmove')) {
      this.isSearching = false;
      return;
    }

    // Only process info messages that have a score AND a PV
    if (message.startsWith('info') && message.includes('score') && message.includes(' pv ')) {
      const evaluation = this.parseInfo(message);
      if (evaluation && this.onEvaluation) {
        this.onEvaluation(evaluation);
      }
    }
  }

  private parseInfo = (message: string): EngineEvaluation | null => {
    // Check for bounds (upperbound/lowerbound) - we skip these for accuracy
    if (message.includes('upperbound') || message.includes('lowerbound')) {
      return null;
    }

    const depthMatch = message.match(/depth (\d+)/);
    const scoreMatch = message.match(/score (cp|mate) (-?\d+)/);
    const multipvMatch = message.match(/multipv (\d+)/);
    const pvMatch = message.match(/ pv (.+)/);

    if (!depthMatch || !scoreMatch) return null;

    const depth = parseInt(depthMatch[1]);
    const type = scoreMatch[1];
    let value = parseInt(scoreMatch[2]);
    const multipv = multipvMatch ? parseInt(multipvMatch[1]) : 1;
    const pv = pvMatch ? pvMatch[1] : undefined;

    // Normalize score to White-relative
    // Stockfish CP is from the perspective of the side to move
    if (this.currentSideToMove === 'b') {
      value = -value;
    }

    return {
      score: type === 'cp' ? value : 0,
      isMate: type === 'mate',
      mateIn: type === 'mate' ? value : undefined,
      depth,
      multipv,
      pv,
      sideToMove: this.currentSideToMove
    };
  }

  public analyze(fen: string, depth: number = 15, onStart?: () => void) {
    if (!this.worker || this.isTerminated) {
      return;
    }

    // Extract side to move from FEN
    const fenParts = fen.split(' ');
    if (fenParts.length > 1) {
      this.currentSideToMove = fenParts[1] === 'b' ? 'b' : 'w';
    }

    if (!this.isReady) {
      this.pendingFen = fen;
      return;
    }

    if (this.isSearching) {
      this.sendMessage('stop');
    }

    if (onStart) onStart();
    this.isSearching = true;
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
