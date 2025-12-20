import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { Player } from './player.interface';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class StockfishPlayer implements Player {
  private child: ChildProcess | null = null;
  private isReady: boolean = false;
  private resolveReady?: () => void;
  private resolveMove?: (move: string | null) => void;
  private initPromise: Promise<void> | null = null;

  constructor(private skillLevel: number = 20, private targetElo?: number, private depth: number = 15) {
    this.ensureProcess();
  }

  private ensureProcess() {
    if (this.child && this.isReady) return;

    // If already initializing, return that promise
    if (this.initPromise) return;

    this.initPromise = new Promise((resolve) => {
      this.resolveReady = resolve;
      
      const stockfishPath = path.resolve(__dirname, '../../../node_modules/stockfish/src/stockfish-17.1-single-a496a04.js');
      
      console.log(`[Stockfish] Spawning new process at skill ${this.skillLevel}`);
      this.child = spawn('node', [stockfishPath]);
      
      this.child.on('exit', (code) => {
        console.error(`[Stockfish] Process exited with code ${code}. Ready to respawn.`);
        this.isReady = false;
        this.child = null;
        this.initPromise = null;
      });

      this.child.on('error', (err) => {
        console.error(`[Stockfish] Process error:`, err);
        this.isReady = false;
        this.child = null;
        this.initPromise = null;
      });

      this.child.stdout?.on('data', (data) => {
        const lines = data.toString().split('\n');
        for (const line of lines) {
          this.handleLine(line);
        }
      });

      this.sendCommand('uci');
      this.sendCommand(`setoption name Skill Level value ${this.skillLevel}`);
      this.sendCommand('setoption name Hash value 128');
      this.sendCommand('setoption name Threads value 2');
      
      if (this.targetElo) {
        this.sendCommand('setoption name UCI_LimitStrength value true');
        this.sendCommand(`setoption name UCI_Elo value ${this.targetElo}`);
      }
      
      this.sendCommand('ucinewgame');
      this.sendCommand('isready');
    });
  }

  private handleLine(line: string) {
    const trimmed = line.trim();
    if (!trimmed) return;

    if (trimmed === 'readyok') {
      this.isReady = true;
      if (this.resolveReady) {
        this.resolveReady();
        this.resolveReady = undefined;
        this.initPromise = null;
      }
    } else if (trimmed.startsWith('bestmove')) {
      const parts = trimmed.split(' ');
      const move = parts[1];
      if (this.resolveMove) {
        this.resolveMove(move === '(none)' ? null : move);
        this.resolveMove = undefined;
      }
    }
  }

  private sendCommand(command: string) {
    if (this.child && this.child.stdin) {
      this.child.stdin.write(`${command}\n`);
    }
  }

  async makeMove(fen: string): Promise<string | null> {
    this.ensureProcess();
    if (this.initPromise) await this.initPromise;

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        if (this.resolveMove === resolve) {
          console.error(`[Stockfish] Move request timed out for FEN: ${fen}`);
          this.resolveMove = undefined;
          resolve(null);
        }
      }, 40000);

      this.resolveMove = (move) => {
        clearTimeout(timeout);
        resolve(move);
      };

      this.sendCommand(`position fen ${fen}`);
      this.sendCommand(`go depth ${this.depth} movetime 8000`);
    });
  }
}
