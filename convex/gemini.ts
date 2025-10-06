const GEMINI_API_URL = (
  model: string,
  apiKey: string
) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

// A mapping from our internal model names to the actual Gemini model names
const MODEL_MAP: Record<string, string> = {
  "2.5-pro": "gemini-2.5-pro-latest",
  "2.5-flash": "gemini-2.5-flash-latest",
  "2.5-flash-lite": "gemini-2.5-flash-lite-latest",
};

export async function callGemini(
  model: string,
  fen: string,
  pgn: string,
  legalMoves: string[]
): Promise<{ move: string; reasoning: string; opening: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable not set!");
  }

  const geminiModel = MODEL_MAP[model] || "gemini-2.5-flash-latest";

  const prompt = `
    You are a world-class chess engine.
    Your task is to analyze the given chess position and choose the best possible move.

    Current game state:
    - FEN: ${fen}
    - PGN: ${pgn}

    Here is the list of all legal moves available to you:
    [${legalMoves.join(", ")}]

    Your instructions:
    1.  Analyze the position carefully.
    2.  Choose only ONE move from the list of legal moves provided.
    3.  Provide a brief, insightful reasoning for your chosen move (max 2-3 sentences).
    4.  If you recognize the opening being played from the PGN, state its common name.
    5.  You MUST respond in a valid JSON format.

    Output format:
    {
      "move": "<your chosen move in SAN>",
      "reasoning": "<your brief reasoning>",
      "opening": "<name of the opening, or 'Unknown'>"
    }
    `;

  const response = await fetch(GEMINI_API_URL(geminiModel, apiKey), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.4,
        topK: 1,
        topP: 1,
        maxOutputTokens: 2048,
        stopSequences: [],
      },
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      ],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Gemini API request failed with status ${response.status}: ${errorBody}`);
  }

  const data = await response.json();
  
  const text = data.candidates[0].content.parts[0].text;
  // Clean the text by removing markdown backticks and 'json' identifier
  const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
  
  try {
    return JSON.parse(cleanedText);
  } catch (e) {
    console.error("Failed to parse JSON from Gemini response:", cleanedText);
    throw new Error("Invalid JSON response from AI.");
  }
}
