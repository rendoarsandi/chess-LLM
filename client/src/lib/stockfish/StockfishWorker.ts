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
  private isReady: boolean = false;

  constructor(callback: EngineCallback) {
    this.onEvaluation = callback;
    this.init();
  }

  private init() {
    try {
      this.worker = new Worker('/stockfish/stockfish.js');
      this.worker.onmessage = (e) => this.handleMessage(e.data);
      
      this.sendMessage('uci');
      this.sendMessage('isready');
      this.sendMessage('setoption name UCI_AnalyseMode value true');
    } catch (error) {
      console.error('Failed to initialize Stockfish worker:', error);
    }
  }

  private handleMessage(message: string) {
    if (message === 'readyok') {
      this.isReady = true;
      return;
    }

    if (message.startsWith('info') && message.includes('score')) {
      const evaluation = this.parseInfo(message);
      if (evaluation && this.onEvaluation) {
        this.onEvaluation(evaluation);
      }
    }
  }

  private parseInfo(message: string): EngineEvaluation | null {
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

  public analyze(fen: string, timeLimitMs: number = 2000) {
    if (!this.worker) return;

    this.sendMessage('stop');
    this.sendMessage(`position fen ${fen}`);
    this.sendMessage(`go movetime ${timeLimitMs}`);
  }

  private sendMessage(command: string) {
    if (this.worker) {
      this.worker.postMessage(command);
    }
  }

  public terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}
