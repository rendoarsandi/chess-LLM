import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// AI move generation using Google Generative AI
export const generateAIMove = action({
  args: {
    gameId: v.id("games"),
    fen: v.string(),
    pgn: v.string(),
    color: v.string(),
    aiModel: v.string(),
    legalMoves: v.array(v.string()),
    openingInfo: v.optional(v.object({
      name: v.string(),
      eco: v.string(),
    })),
  },
  handler: async (ctx, args) => {
    const startTime = Date.now();
    
    // Get API key from environment
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      throw new Error("GOOGLE_AI_API_KEY not configured");
    }

    // Map model names to Gemini API model names
    const modelMap: Record<string, string> = {
      "gemini-2.5-pro": "gemini-2.0-flash-exp",
      "gemini-2.5-flash": "gemini-2.0-flash-exp",
      "gemini-2.5-flash-lite": "gemini-2.0-flash-exp",
    };

    const modelName = modelMap[args.aiModel] || "gemini-2.0-flash-exp";

    // Construct the prompt
    const openingContext = args.openingInfo 
      ? `\n\nCurrent Opening: ${args.openingInfo.name} (${args.openingInfo.eco})`
      : "";

    const prompt = `You are a chess grandmaster AI. Analyze the current position and make the best move.

Current Position (FEN): ${args.fen}
Game History (PGN): ${args.pgn || "Game just started"}
Your Color: ${args.color}
Legal Moves Available: ${args.legalMoves.join(", ")}${openingContext}

Instructions:
1. Analyze the position carefully considering:
   - Material balance
   - King safety
   - Piece activity and development
   - Pawn structure
   - Tactical opportunities (checks, captures, threats)
   - Strategic plans

2. Consider the opening principles if in the opening phase
3. Evaluate at least 3-5 candidate moves
4. Choose the best move from the legal moves list

Respond in the following JSON format:
{
  "move": "e2e4",
  "reasoning": "Detailed explanation of why this move is best",
  "evaluation": "Position evaluation (e.g., '+0.5', '=', '-1.2')",
  "alternativeMoves": ["d2d4", "g1f3"],
  "plan": "Short-term strategic plan"
}

IMPORTANT: 
- The "move" must be in UCI format (e.g., "e2e4", "e7e5", "e1g1" for castling)
- The move MUST be one of the legal moves listed above
- Only respond with valid JSON, no additional text`;

    try {
      // Call Gemini API
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: prompt
              }]
            }],
            generationConfig: {
              temperature: 0.7,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 1024,
            },
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      // Extract the response text
      const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!responseText) {
        throw new Error("No response from Gemini API");
      }

      // Parse JSON from response (handle markdown code blocks)
      let jsonText = responseText.trim();
      if (jsonText.startsWith("```json")) {
        jsonText = jsonText.replace(/```json\n?/g, "").replace(/```\n?/g, "");
      } else if (jsonText.startsWith("```")) {
        jsonText = jsonText.replace(/```\n?/g, "");
      }

      const aiResponse = JSON.parse(jsonText);

      // Validate the move is in the legal moves list
      if (!args.legalMoves.includes(aiResponse.move)) {
        throw new Error(`AI suggested illegal move: ${aiResponse.move}`);
      }

      const thinkingTime = Date.now() - startTime;

      return {
        move: aiResponse.move,
        reasoning: aiResponse.reasoning || "No reasoning provided",
        evaluation: aiResponse.evaluation || "Unknown",
        alternativeMoves: aiResponse.alternativeMoves || [],
        plan: aiResponse.plan || "",
        thinkingTime,
      };

    } catch (error) {
      console.error("AI move generation error:", error);
      
      // Fallback: return a random legal move
      const randomMove = args.legalMoves[Math.floor(Math.random() * args.legalMoves.length)];
      
      return {
        move: randomMove,
        reasoning: `Error in AI analysis: ${error instanceof Error ? error.message : "Unknown error"}. Selected random legal move.`,
        evaluation: "Error",
        alternativeMoves: [],
        plan: "",
        thinkingTime: Date.now() - startTime,
      };
    }
  },
});

// Process AI vs AI game move
export const processAIvsAIMove = action({
  args: {
    gameId: v.id("games"),
  },
  handler: async (ctx, args) => {
    // This will be called by the scheduler or manually
    // Implementation will be in the game processing logic
    return { success: true };
  },
});

