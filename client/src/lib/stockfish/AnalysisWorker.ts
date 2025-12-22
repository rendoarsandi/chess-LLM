export interface PVLine {
  multipv: number;
  depth: number;
  cp?: number;
  mate?: number;
  pv: string;
}

export interface AnalysisResult {
  bestMove: string;
  pvs: PVLine[];
}

export class AnalysisWorker {
  private worker: Worker | null = null;
  private isEngineReady: boolean = false;
  private isTerminated: boolean = false;
  private currentAnalysis: {
    resolve: (result: AnalysisResult) => void;
    pvs: PVLine[];
    depth: number;
  } | null = null;

  constructor() {
    this.init();
  }

  private init() {
    if (typeof Worker === 'undefined') {
      this.isTerminated = true;
      return;
    }
    try {
      this.worker = new Worker('/stockfish/stockfish.js');
      this.worker.onmessage = (e) => this.handleMessage(e.data);
      this.sendMessage('uci');
    } catch (error) {
      console.error('[AnalysisWorker] Failed to initialize worker:', error);
      this.isTerminated = true;
    }
  }

  private handleMessage(message: string) {
    if (this.isTerminated || typeof message !== 'string') return;

    if (message.startsWith('uciok')) {
      this.sendMessage('setoption name Threads value 1');
      this.sendMessage('setoption name Hash value 32');
      this.sendMessage('ucinewgame');
      this.sendMessage('isready');
    } else if (message.startsWith('readyok')) {
      this.isEngineReady = true;
    } else if (message.startsWith('info') && this.currentAnalysis) {
      const parsed = this.parseInfoLine(message);
      if (parsed) {
        // Only keep the highest depth info for each multipv
        const existingIdx = this.currentAnalysis.pvs.findIndex(p => p.multipv === parsed.multipv);
        if (existingIdx >= 0) {
          if (parsed.depth >= this.currentAnalysis.pvs[existingIdx].depth) {
            this.currentAnalysis.pvs[existingIdx] = parsed;
          }
        } else {
          this.currentAnalysis.pvs.push(parsed);
        }
      }
    } else if (message.startsWith('bestmove')) {
      if (this.currentAnalysis) {
        const parts = message.split(' ');
        const bestMove = parts[1];
        // Sort PVs by multipv number
        const pvs = [...this.currentAnalysis.pvs].sort((a, b) => a.multipv - b.multipv);
        this.currentAnalysis.resolve({ bestMove, pvs });
        this.currentAnalysis = null;
      }
    }
  }

  private parseInfoLine(line: string): PVLine | null {
    if (!line.includes(' pv ')) return null;

    const parts = line.split(' ');
    const depthIdx = parts.indexOf('depth');
    const multipvIdx = parts.indexOf('multipv');
    const scoreIdx = parts.indexOf('score');
    const pvIdx = parts.indexOf('pv');

    if (depthIdx === -1 || multipvIdx === -1 || scoreIdx === -1 || pvIdx === -1) return null;

    const depth = parseInt(parts[depthIdx + 1]);
    const multipv = parseInt(parts[multipvIdx + 1]);
    const pv = parts.slice(pvIdx + 1).join(' ');

    const scoreType = parts[scoreIdx + 1]; // 'cp' or 'mate'
    const scoreValue = parseInt(parts[scoreIdx + 2]);

    const result: PVLine = { depth, multipv, pv };
    if (scoreType === 'cp') {
      result.cp = scoreValue;
    } else if (scoreType === 'mate') {
      result.mate = scoreValue;
    }

    return result;
  }

  private sendMessage(command: string) {
    if (this.worker && !this.isTerminated) {
      this.worker.postMessage(command);
    }
  }

  public async analyzePosition(fen: string, depth: number = 20, multipv: number = 3): Promise<AnalysisResult> {
    if (this.isTerminated) throw new Error('Worker terminated');
    
    // Wait for engine to be ready with a timeout (10 seconds)
    const startWait = Date.now();
    while (!this.isEngineReady && !this.isTerminated) {
      if (Date.now() - startWait > 10000) {
        throw new Error('Engine initialization timed out');
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return new Promise((resolve, reject) => {
      if (this.isTerminated) {
        reject(new Error('Worker terminated during wait'));
        return;
      }
      this.currentAnalysis = { resolve, pvs: [], depth };
      this.sendMessage(`setoption name MultiPV value ${multipv}`);
      this.sendMessage(`position fen ${fen}`);
      this.sendMessage(`go depth ${depth}`);
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
