# Track Specification: Gemini LLM Integration

## Overview

Implement a pluggable Gemini LLM player for the ChessLLM platform. This will allow games to be played by Google's Gemini models (2.5 Flash, 2.5 Flash Lite, and 3.0 Flash), expanding the system beyond the initial `RandomPlayer` bot.

## Functional Requirements

- **Model Support:** Support for `gemini-2.0-flash`, `gemini-2.0-flash-lite`, and the upcoming `gemini-3.0-flash` (or current stable equivalents).
- **Prompting Engine:**
  - The system will construct a prompt containing the current board state (FEN) and the full move history (PGN).
  - The model will be instructed to return a single move in Standard Algebraic Notation (SAN).
- **Credential Management:** Securely access API keys via environment variables (`GOOGLE_GENERATIVE_AI_API_KEY`).
- **Validation & Retries:**
  - If the model returns an invalid move, the system will retry up to 3 times.
  - Each retry prompt will include the specific error (e.g., "Illegal move") and a list of currently legal moves to guide the model.

## Non-Functional Requirements

- **Latency:** The integration should handle API timeouts gracefully without crashing the main game loop.
- **Type Safety:** Ensure the `GeminiPlayer` implements the same interface/pattern as the existing `RandomPlayer`.

## Acceptance Criteria

- [ ] A `GeminiPlayer` class exists that can be instantiated with a specific model ID.
- [ ] The `GameLoopService` can successfully request a move from Gemini and apply it to the database.
- [ ] Games can proceed from start to finish using Gemini models for one or both sides.
- [ ] Invalid moves are handled by the retry logic before falling back to an error state.

## Out of Scope

- Implementation of other LLM providers (OpenAI, Anthropic).
- Fine-tuning models specifically for chess.
