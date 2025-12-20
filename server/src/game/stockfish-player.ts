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

  constructor(private skillLevel: number = 20, private targetElo?: number, private depth: number = 15) {
    const stockfishPath = path.resolve(__dirname, '../../../node_modules/stockfish/src/stockfish-17.1-single-a496a04.js');
    
    this.child = spawn('node', [stockfishPath]);
    
    this.child.on('exit', (code) => {
      console.error(`[Stockfish] Process exited with code ${code}`);
      this.isReady = false;
    });

    this.child.on('error', (err) => {
      console.error(`[Stockfish] Process error:`, err);
    });

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
    if (!trimmed) return;

    if (trimmed === 'readyok') {
      this.isReady = true;
      if (this.resolveReady) {
        this.resolveReady();
        this.resolveReady = undefined; // Only resolve once
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
    this.child.stdin?.write(`${command}\n`);
  }

  async makeMove(fen: string): Promise<string | null> {
    await this.initPromise;

    return new Promise((resolve) => {
      // Set a timeout to prevent hanging the game loop if Stockfish fails
      const timeout = setTimeout(() => {
        if (this.resolveMove === resolve) {
          console.error(`[Stockfish] Move request timed out for FEN: ${fen}`);
          this.resolveMove = undefined;
          resolve(null);
        }
      }, 30000); // 30 second timeout

      this.resolveMove = (move) => {
        clearTimeout(timeout);
        resolve(move);
      };

      this.sendCommand('ucinewgame');
      this.sendCommand(`position fen ${fen}`);
      this.sendCommand(`go depth ${this.depth}`);
    });
  }
}