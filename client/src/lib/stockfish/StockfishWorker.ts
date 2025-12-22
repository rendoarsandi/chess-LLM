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
export type BestMoveCallback = (move: string) => void;

interface AnalysisRequest {
  fen: string;
  depth: number;
  generation: number;
  onStart?: () => void;
  isBestMoveRequest?: boolean;
}

export class StockfishWorker {
  private worker: Worker | null = null;
  private onEvaluation: EngineCallback | null = null;
  private onBestMove: BestMoveCallback | null = null;
  private isTerminated: boolean = false;
  private multiPv: number = 3;
  
  // State Machine
  private isEngineReady: boolean = false;        // readyok received
  private isSearching: boolean = false;         // 'go' sent, waiting for 'bestmove'
  private isStopping: boolean = false;          // 'stop' sent, waiting for 'bestmove'
  
  private currentGeneration: number = 0;
  private lastExecutedGeneration: number = -1;
  private pendingRequest: AnalysisRequest | null = null;
  private currentSideToMove: 'w' | 'b' = 'w';

  constructor(callback: EngineCallback, multiPv: number = 3, onBestMove?: BestMoveCallback) {
    this.onEvaluation = callback;
    this.onBestMove = onBestMove || null;
    this.multiPv = multiPv;
    this.init();
  }

  private init() {
    console.log('[StockfishWorker] Initializing worker from /stockfish/stockfish.js');
    try {
      this.worker = new Worker('/stockfish/stockfish.js');
      
      this.worker.onerror = (err) => {
        console.error('[StockfishWorker] Worker error event:', err);
      };

      this.worker.onmessage = (e) => {
        if (this.isTerminated) return;
        // console.debug('[StockfishWorker] Raw message:', e.data);
        this.handleMessage(e.data);
      };
      
      this.sendMessage('uci');
    } catch (error) {
      console.error('[StockfishWorker] Critical failure during initialization:', error);
      this.isTerminated = true;
    }
  }

  private handleMessage = (message: string) => {
    if (typeof message !== 'string') return;

    if (message.startsWith('uciok')) {
      console.log('[StockfishWorker] Engine UCI ready');
      this.sendMessage('setoption name Threads value 1');
      this.sendMessage('setoption name Hash value 32'); 
      this.sendMessage(`setoption name MultiPV value ${this.multiPv}`);
      this.sendMessage('ucinewgame');
      this.sendMessage('isready');
      return;
    }

    if (message.startsWith('readyok')) {
      this.isEngineReady = true;
      this.processQueue();
      return;
    }

    if (message.startsWith('bestmove')) {
      this.isSearching = false;
      this.isStopping = false;
      const parts = message.split(' ');
      if (parts.length >= 2 && this.onBestMove && this.lastExecutedGeneration === this.currentGeneration) {
        this.onBestMove(parts[1]);
      }
      this.processQueue();
      return;
    }

    // Only process info messages that have a score AND a PV
    if (message.startsWith('info') && message.includes('score') && message.includes(' pv ')) {
      const evaluation = this.parseInfo(message);
      
      // Safety check: only emit evaluations for the most recent FEN request
      if (evaluation && this.onEvaluation && this.lastExecutedGeneration === this.currentGeneration) {
        this.onEvaluation(evaluation);
      }
    }
  }

  private processQueue() {
    if (this.isTerminated || !this.isEngineReady || this.isStopping || this.isSearching) {
      return;
    }

    if (this.pendingRequest) {
      const req = this.pendingRequest;
      this.pendingRequest = null;
      this.executeAnalysis(req);
    }
  }

  private executeAnalysis(req: AnalysisRequest) {
    this.lastExecutedGeneration = req.generation;
    this.isSearching = true;
    
    // Extract side to move from FEN for normalization
    const fenParts = req.fen.split(' ');
    if (fenParts.length > 1) {
      this.currentSideToMove = fenParts[1] === 'b' ? 'b' : 'w';
    }

    if (req.onStart) req.onStart();
    
    this.sendMessage(`position fen ${req.fen}`);
    this.sendMessage(`go depth ${req.depth}`);
  }

  private parseInfo = (message: string): EngineEvaluation | null => {
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
    if (!this.worker || this.isTerminated) return;

    this.currentGeneration++;
    
    const request: AnalysisRequest = {
      fen,
      depth,
      generation: this.currentGeneration,
      onStart
    };

    // If we are currently searching, we MUST stop first and wait for 'bestmove'
    if (this.isSearching || this.isStopping) {
      this.pendingRequest = request;
      if (!this.isStopping) {
        this.isStopping = true;
        this.sendMessage('stop');
      }
      return;
    }

    // If we are not initialized or ready, queue it
    if (!this.isEngineReady) {
      this.pendingRequest = request;
      return;
    }

    // Engine is idle and ready, execute immediately
    this.executeAnalysis(request);
  }

  public getBestMove(fen: string, depth: number = 18, onStart?: () => void) {
    if (!this.worker || this.isTerminated) return;

    this.currentGeneration++;
    
    const request: AnalysisRequest = {
      fen,
      depth,
      generation: this.currentGeneration,
      onStart,
      isBestMoveRequest: true
    };

    if (this.isSearching || this.isStopping) {
      this.pendingRequest = request;
      if (!this.isStopping) {
        this.isStopping = true;
        this.sendMessage('stop');
      }
      return;
    }

    if (!this.isEngineReady) {
      this.pendingRequest = request;
      return;
    }

    this.executeAnalysis(request);
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