import { Chess } from 'chess.js';
import { getAiMove } from './gemini';

// Environment variables for the Worker.
interface Env {
  GAME_SESSIONS: DurableObjectNamespace;
  GEMINI_API_KEY: string;
}

// The Durable Object class for a single game session.
export class GameSession {
  state: DurableObjectState;
  env: Env;
  chess: Chess;
  sessions: WebSocket[];
  errorCount: number;
  gameMode?: 'human-vs-ai' | 'ai-vs-ai';
  players?: {
    w: 'human' | 'ai';
    b: 'human' | 'ai';
  };
  lastAiReasoning?: string;
  openingName?: string;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
    this.sessions = [];
    this.errorCount = 0;

    // Initialize the game state from storage.
    this.state.blockConcurrencyWhile(async () => {
      const [fen, errorCount, gameMode, players, lastAiReasoning, openingName] =
        await Promise.all([
          this.state.storage.get<string>('currentFen'),
          this.state.storage.get<number>('errorCount'),
          this.state.storage.get<'human-vs-ai' | 'ai-vs-ai'>('gameMode'),
          this.state.storage.get<{ w: 'human' | 'ai'; b: 'human' | 'ai' }>(
            'players',
          ),
          this.state.storage.get<string>('lastAiReasoning'),
          this.state.storage.get<string>('openingName'),
        ]);
      this.chess = new Chess(fen || undefined);
      this.errorCount = errorCount || 0;
      this.gameMode = gameMode;
      this.players = players;
      this.lastAiReasoning = lastAiReasoning;
      this.openingName = openingName;
    });
  }

  // The fetch handler is called for HTTP requests to the Durable Object.
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // This Durable Object only supports WebSocket connections.
    if (url.pathname.endsWith('/websocket')) {
      if (request.headers.get('Upgrade') !== 'websocket') {
        return new Response('Expected Upgrade: websocket', { status: 426 });
      }
      const [client, server] = Object.values(new WebSocketPair());
      await this.handleSession(server);
      return new Response(null, { status: 101, webSocket: client });
    }
    return new Response('Not found', { status: 404 });
  }

  // handleSession manages a new WebSocket connection.
  async handleSession(ws: WebSocket) {
    this.sessions.push(ws);

    // Set up event listeners for the WebSocket.
    ws.addEventListener('message', async (msg) => {
      try {
        const message = JSON.parse(msg.data as string);

        // Route message to the appropriate handler based on its type.
        switch (message.type) {
          case 'init':
            await this.handleInit(message.payload);
            break;
          case 'move':
            await this.handleMove(message.payload, ws);
            break;
          case 'start':
            await this.triggerAiMove();
            break;
          default:
            ws.send(
              JSON.stringify({
                type: 'error',
                payload: { message: 'Unknown message type' },
              }),
            );
            await this.incrementErrorCount();
            break;
        }
        this.broadcastGameState();
      } catch (error) {
        const errorMessage = {
          type: 'error',
          payload: {
            message:
              error instanceof Error
                ? error.message
                : 'An unknown error occurred.',
          },
        };
        ws.send(JSON.stringify(errorMessage));
        await this.incrementErrorCount();
        this.broadcastGameState();
      }
    });

    ws.addEventListener('close', () => {
      this.sessions = this.sessions.filter((session) => session !== ws);
    });
    ws.addEventListener('error', (err) => console.error('WebSocket error:', err));
    this.broadcastGameState(ws);
  }

  // Initializes the game settings.
  async handleInit(payload: {
    gameMode: 'human-vs-ai' | 'ai-vs-ai';
    players: { w: 'human' | 'ai'; b: 'human' | 'ai' };
  }) {
    this.gameMode = payload.gameMode;
    this.players = payload.players;
    await Promise.all([
      this.state.storage.put('gameMode', this.gameMode),
      this.state.storage.put('players', this.players),
    ]);
  }

  isGameOver(): boolean {
    return this.chess.isGameOver() || this.errorCount >= 5;
  }

  async incrementErrorCount() {
    if (this.isGameOver()) return;
    this.errorCount++;
    await this.state.storage.put('errorCount', this.errorCount);
  }

  broadcastGameState(ws?: WebSocket) {
    const gameState = {
      fen: this.chess.fen(),
      pgn: this.chess.pgn(),
      turn: this.chess.turn(),
      gameOver: this.isGameOver(),
      errorCount: this.errorCount,
      gameMode: this.gameMode,
      players: this.players,
      lastAiReasoning: this.lastAiReasoning,
      openingName: this.openingName,
    };
    const message = { type: 'update', payload: gameState };
    if (ws) {
      ws.send(JSON.stringify(message));
    } else {
      this.broadcast(message);
    }
  }

  async handleMove(
    move: string | { from: string; to: string; promotion?: string },
    ws: WebSocket,
  ) {
    if (this.isGameOver()) {
      ws.send(JSON.stringify({ type: 'error', payload: { message: 'Game is over' } }));
      return;
    }
    // A move message is only valid if it's a human's turn.
    if (this.players?.[this.chess.turn()] !== 'human') {
      ws.send(JSON.stringify({ type: 'error', payload: { message: "It's not your turn" } }));
      return;
    }

    try {
      const result = this.chess.move(move);
      if (result === null) {
        ws.send(JSON.stringify({ type: 'error', payload: { message: 'Invalid move' } }));
        await this.incrementErrorCount();
        this.broadcastGameState();
        return;
      }
      await this.state.storage.put('currentFen', this.chess.fen());
      this.broadcastGameState();
      await this.triggerAiMove(); // See if the AI should move next.
    } catch (e) {
      const errorMessage = {
        type: 'error',
        payload: { message: e instanceof Error ? e.message : 'An error occurred while processing the move.' },
      };
      ws.send(JSON.stringify(errorMessage));
      await this.incrementErrorCount();
      this.broadcastGameState();
    }
  }

  async triggerAiMove() {
    if (this.isGameOver() || !this.players || this.players[this.chess.turn()] !== 'ai') {
      return;
    }
    // Add a small delay to make the AI's move feel more natural.
    await new Promise(resolve => setTimeout(resolve, 500));

    try {
      const turn = this.chess.turn();
      const aiResponse = await getAiMove(
        this.chess.pgn(),
        this.chess.fen(),
        turn,
        this.env.GEMINI_API_KEY,
        // TODO: Select model based on this.players[turn].model
      );
      const result = this.chess.move(aiResponse.move);

      if (result === null) {
        console.error('AI returned an invalid move:', aiResponse.move);
        await this.incrementErrorCount();
        this.broadcastGameState();
        return;
      }

      // AI move was valid. Store the reasoning and new state.
      this.lastAiReasoning = aiResponse.reasoning;
      if (aiResponse.opening && !this.openingName) {
        this.openingName = aiResponse.opening;
      }

      await Promise.all([
        this.state.storage.put('currentFen', this.chess.fen()),
        this.state.storage.put('lastAiReasoning', this.lastAiReasoning),
        this.state.storage.put('openingName', this.openingName),
      ]);

      this.broadcastGameState();
      // After a successful AI move, recursively call this function to see if the next turn is also AI.
      await this.triggerAiMove();
    } catch (error) {
      console.error('Error during AI move generation:', error);
      await this.incrementErrorCount();
      this.broadcastGameState();
    }
  }

  // broadcast sends a message to all connected WebSocket clients.
  broadcast(message: object) {
    const messageString = JSON.stringify(message);
    this.sessions.forEach((session) => {
      try {
        session.send(messageString);
      } catch (error) {
        // The session might have closed. We'll remove it on the 'close' event.
        console.error('Failed to send message to a session:', error);
      }
    });
  }
}

// This is the default export for the Worker, which handles routing.
// It's responsible for finding and forwarding requests to the correct Durable Object.
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname.split('/');

    // We expect a path like /game/[gameId]/websocket
    if (path[1] === 'game' && path[2]) {
      const gameId = path[2];

      // Get the Durable Object ID from its name.
      const doId = env.GAME_SESSIONS.idFromName(gameId);

      // Get the stub for the Durable Object.
      const stub = env.GAME_SESSIONS.get(doId);

      // Forward the request to the Durable Object.
      // The Durable Object's constructor will receive the `env` object.
      return stub.fetch(request);
    }

    return new Response('Not found', { status: 404 });
  },
};