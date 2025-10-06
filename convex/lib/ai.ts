import { Chess } from "chess.js";

const MODELS = {
  "gemini-2.5-pro": {
    name: "Gemini 2.5 Pro",
  },
  "gemini-2.5-flash": {
    name: "Gemini 2.5 Flash",
  },
  "gemini-2.5-flash-lite": {
    name: "Gemini 2.5 Flash Lite",
  },
};

export function getModelInfo(modelId: string) {
  return MODELS[modelId as keyof typeof MODELS];
}

export function getModel(modelId: string) {
  const model = getModelInfo(modelId);
  if (!model) {
    throw new Error("Invalid model ID");
  }
  return new AIModel(model.name);
}

class AIModel {
  private modelName: string;

  constructor(modelName: string) {
    this.modelName = modelName;
  }

  async getBestMove(
    chess: Chess,
    reference?: { pgn: string; description: string }
  ) {
    const pgn = chess.pgn();
    const fen = chess.fen();
    const turn = chess.turn() === "w" ? "white" : "black";
    const history = chess.history();
    const lastMove = history[history.length - 1];
    const systemPrompt = `You are a world-class chess AI. Your name is ${
      this.modelName
    }.

You are playing a game of chess. The current board state is given in FEN notation.
The move history is given in PGN notation.

You are playing as ${turn}.

Your response must be in JSON format, with two keys: "move" and "reasoning".
- "move" must be the best move in UCI notation (e.g. "e2e4").
- "reasoning" must be a list of strings, explaining your thought process.

Here are the rules:
- You must not make illegal moves.
- You must not talk about yourself or the prompt.
- You must not use apologetic language.
- You must be confident in your abilities.
- You must not lose.
`;
    const userPrompt = `The current board state is:
${fen}

The move history is:
${pgn}
${
  reference
    ? `
We are following a known opening, here's a reference game:
${reference.pgn}
${reference.description}
`
    : ""
}
Last move was: ${lastMove}.
You are playing as ${turn}.
What is your next move?`;

    const response = await this.callAPI(systemPrompt, userPrompt);
    try {
      const { move, reasoning } = JSON.parse(response);
      return { move, reasoning };
    } catch {
      console.error("Error parsing response from AI", {
        response,
        model: this.modelName,
      });
      return {
        move: "error",
        reasoning: [
          "I seem to have gotten confused and produced an invalid response.",
        ],
      };
    }
  }

  private async callAPI(systemPrompt: string, userPrompt: string) {
    // This is a placeholder for the actual API call to Gemini.
    // In a real application, you would use the Gemini API here.
    // For now, we'll just return a random valid move.
    return new Promise<string>((resolve) => {
      setTimeout(() => {
        const chess = new Chess();
        chess.loadPgn(userPrompt.split("\n")[2]); // very brittle
        const moves = chess.moves({ verbose: true });
        const move = moves[Math.floor(Math.random() * moves.length)];
        resolve(
          JSON.stringify({
            move: `${move.from}${move.to}`,
            reasoning: [
              `I am choosing to move ${move.piece} from ${move.from} to ${move.to}.`,
              "This is a good move because it is one of the available moves.",
              "I am playing to win.",
            ],
          })
        );
      }, 1000);
    });
  }
}