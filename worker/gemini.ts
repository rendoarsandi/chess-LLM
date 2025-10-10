import { FEN, PGN } from 'chess.js';

// This is the prompt that will be sent to the Gemini model.
// It's designed to be precise and give the AI all the context it needs.
const getSystemPrompt = (pgn: PGN, fen: FEN, turn: 'w' | 'b'): string => {
  const color = turn === 'w' ? 'White' : 'Black';
  return `You are a world-class chess AI playing as ${color}. Your role is to analyze a chess game and determine the best next move.

Current Game State:
- PGN (Portable Game Notation): ${pgn}
- FEN (Forsyth-Edwards Notation): ${fen}

Your Task:
1.  Analyze the position thoroughly from the perspective of the ${color} player.
2.  Determine the single best move to make.
3.  Provide your reasoning, including any tactical or strategic considerations.
4.  If the current moves correspond to a known opening, identify it.

Response Format:
You MUST respond in a valid JSON format. Do not include any text or markdown formatting (like \`\`\`json) before or after the JSON object. The JSON object should have the following structure:
{
  "move": "e2e4", // Your best move in UCI format (e.g., "e2e4", "g1f3", "e7e8q" for promotion).
  "reasoning": "This move controls the center and opens lines for my queen and bishop. It is a strong, standard opening move.",
  "opening": "King's Pawn Opening" // The name of the opening, if applicable. Otherwise, use an empty string "".
}`;
};

// Defines the structure of the expected response from the Gemini API.
export interface GeminiResponse {
  move: string;
  reasoning: string;
  opening: string;
}

const modelMap = {
  'pro': 'gemini-1.5-pro-latest',
  'flash': 'gemini-1.5-flash-latest',
  'flash-lite': 'gemini-1.5-flash-latest', // Assuming flash-lite maps to flash for now
};

/**
 * Gets a move suggestion from the Gemini AI.
 *
 * @param pgn The PGN of the current game.
 * @param fen The FEN of the current game.
 * @param turn The current player's turn ('w' or 'b').
 * @param apiKey The Google AI API key.
 * @param model The Gemini model to use.
 * @returns A promise that resolves to a GeminiResponse object.
 */
export async function getAiMove(
  pgn: PGN,
  fen: FEN,
  turn: 'w' | 'b',
  apiKey: string,
  model: 'pro' | 'flash' | 'flash-lite' = 'flash',
): Promise<GeminiResponse> {
  const apiModel = modelMap[model] || modelMap.flash;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${apiModel}:generateContent?key=${apiKey}`;

  const systemPrompt = getSystemPrompt(pgn, fen, turn);
  const requestBody = {
    contents: [{ parts: [{ text: systemPrompt }] }],
    generationConfig: {
      response_mime_type: "application/json",
      temperature: 0.7, // A bit of creativity but still deterministic
    },
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Gemini API request failed with status ${response.status}: ${errorBody}`);
    }

    const responseData = await response.json();

    if (!responseData.candidates || !responseData.candidates[0].content.parts[0].text) {
      throw new Error('Invalid response structure from Gemini API');
    }

    const jsonText = responseData.candidates[0].content.parts[0].text;

    // The response is a JSON string, so we need to parse it.
    const parsedResponse: GeminiResponse = JSON.parse(jsonText);

    return parsedResponse;

  } catch (error) {
    console.error('Error calling Gemini API:', error);
    // Re-throw the error to be handled by the GameSession
    throw error;
  }
}