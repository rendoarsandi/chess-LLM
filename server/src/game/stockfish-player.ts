import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { Player } from './player.interface';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class StockfishPlayer implements Player {
  private child: ChildProcess;
  private isReady: boolean = false;
  private initPromise: Promise<void>;
  private resolveReady?: () => void;
  private resolveMove?: (move: string | null) => void;

  constructor(private skillLevel: number = 20, private targetElo?: number) {
    // Path to the stockfishjs entry point
    const stockfishPath = path.resolve(__dirname, '../../../node_modules/stockfish/src/stockfish-17.1-single-a496a04.js');
    
    this.child = spawn('node', [stockfishPath]);
    
    this.initPromise = new Promise((resolve) => {
      this.resolveReady = resolve;
    });

    this.child.stdout?.on('data', (data) => {
      const lines = data.toString().split('\n');
      for (const line of lines) {
        this.handleLine(line);
      }
    });

    this.sendCommand('uci');
    this.sendCommand(`setoption name Skill Level value ${this.skillLevel}`);
    if (this.targetElo) {
      this.sendCommand('setoption name UCI_LimitStrength value true');
      this.sendCommand(`setoption name UCI_Elo value ${this.targetElo}`);
    }
    this.sendCommand('isready');
  }

  private handleLine(line: string) {
    const trimmed = line.trim();
    if (trimmed === 'readyok') {
      this.isReady = true;
      this.resolveReady?.();
    } else if (trimmed.startsWith('bestmove')) {
      const move = trimmed.split(' ')[1];
      this.resolveMove?.(move === '(none)' ? null : move);
    }
  }

  private sendCommand(command: string) {
    this.child.stdin?.write(`${command}\n`);
  }

  async makeMove(fen: string): Promise<string | null> {
    await this.initPromise;

    return new Promise((resolve) => {
      this.resolveMove = resolve;
      this.sendCommand(`position fen ${fen}`);
      const moveTime = this.skillLevel < 10 ? 100 : 500;
      this.sendCommand(`go movetime ${moveTime}`);
    });
  }
}
