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
    You are a grandmaster-level chess engine with deep strategic understanding.
    Your task is to analyze the current chess position and provide the best move with comprehensive reasoning.

    Current game PGN:
    ${pgn}

    Current game FEN:
    ${fen}

    Analysis Instructions:
    1. Evaluate the position using these criteria:
       - Material balance (piece count and value)
       - King safety (castling, pawn shield, attack threats)
       - Piece activity (mobility, coordination, outposts)
       - Pawn structure (weaknesses, passed pawns, chains)
       - Center control (e4, d4, e5, d5 squares)
       - Tactical opportunities (pins, forks, skewers, discovered attacks)

    2. Calculate candidate moves (at least 3-5 options):
       - Consider forcing moves first (checks, captures, threats)
       - Evaluate positional improvements
       - Look for tactical combinations

    3. Choose the best move based on:
       - Immediate tactical gain
       - Long-term strategic advantage
       - Risk assessment

    4. Provide your reasoning in this format:
       - Position evaluation (who's better and why)
       - Candidate moves considered
       - Why this move is best (tactical and strategic justification)
       - Expected opponent responses

    Return your response as a JSON object with two keys: "move" and "reasoning".

    Example format:
    {
      "move": "Nf3",
      "reasoning": "Position: Roughly equal. White has slight initiative. Candidates: Nf3 (development), e4 (center), d4 (center). Best: Nf3 develops knight to ideal square, controls e5 and d4, prepares kingside castle. Doesn't commit pawns early. Expected: Black likely responds d5 or Nf6."
    }

    CRITICAL: Return ONLY valid moves in Standard Algebraic Notation (SAN). Double-check the move is legal in the current position.
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = await response.text();

    // Clean up the response text - remove markdown code blocks if present
    text = text.trim();
    if (text.startsWith("```json")) {
      text = text.slice(7); // Remove ```json
    } else if (text.startsWith("```")) {
      text = text.slice(3); // Remove ```
    }
    if (text.endsWith("```")) {
      text = text.slice(0, -3); // Remove closing ```
    }
    text = text.trim();

    const jsonResponse = JSON.parse(text);

    // Validate the response has required fields
    if (!jsonResponse.move || !jsonResponse.reasoning) {
      throw new Error("Invalid response format from AI");
    }

    return jsonResponse;
  } catch (error) {
    console.error("Error getting AI move from Gemini:", error);
    console.error("Raw response text:", error);

    // In case of an error, suggest a default move to avoid a crash
    return {
      move: "e4", // A safe default move
      reasoning: "Error communicating with the AI. Defaulting to a safe move.",
    };
  }
}