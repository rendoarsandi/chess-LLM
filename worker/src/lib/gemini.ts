import { GoogleGenerativeAI } from "@google/generative-ai";

interface GeminiResponse {
  move: string;
  reasoning: string;
}

export async function getAiMove(
  pgn: string,
  fen: string,
  aiModel: string,
  apiKey: string
): Promise<GeminiResponse> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: aiModel });

  const prompt = `
    You are a world-class chess engine.
    Your task is to analyze the current chess position and provide the best move.

    Current game PGN:
    ${pgn}

    Current game FEN:
    ${fen}

    Analyze the position carefully and provide the best move in SAN (Standard Algebraic Notation).
    Also, provide a brief reasoning for your move.

    Return your response as a JSON object with two keys: "move" and "reasoning".
    For example: { "move": "e4", "reasoning": "This move controls the center and opens lines for my pieces." }
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = await response.text();
    const jsonResponse = JSON.parse(text);
    return jsonResponse;
  } catch (error) {
    console.error("Error getting AI move from Gemini:", error);
    // In case of an error, suggest a default move to avoid a crash
    return {
      move: "e4", // A safe default move
      reasoning: "Error communicating with the AI. Defaulting to a safe move.",
    };
  }
}