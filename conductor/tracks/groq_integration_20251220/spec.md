# Track Specification: Groq Provider & Models Integration

## Overview
This track involves integrating the Groq AI provider into the ChessLLM platform and adding several new models (Kimi, GPT-OSS, Qwen) to the arena. This will increase the variety of AI opponents and allow for performance comparisons across different architectures.

## Functional Requirements
1.  **Groq Provider Integration:**
    *   Implement a `GroqPlayer` class in `server/src/game/groq-player.ts` that implements the `Player` interface.
    *   Configure `GroqPlayer` to use the Groq API for move generation.
    *   Manage the Groq API key via the `GROQ_API_KEY` environment variable in the root `.env` file.
2.  **Model Registration:**
    *   Register the following models in `server/src/seed.ts`:
        *   `moonshotai/kimi-k2-instruct-0905`
        *   `openai/gpt-oss-120b`
        *   `qwen/qwen3-32b`
    *   Assign these models to the Groq provider.
3.  **Player Service Update:**
    *   Update `server/src/game/player.service.ts` to instantiate `GroqPlayer` for models associated with the Groq provider.

## Non-Functional Requirements
*   **Error Handling:** Ensure robust error handling for Groq API requests, following existing patterns in `GeminiPlayer`.
*   **Performance:** Maintain the responsiveness of the background game loop.
*   **Security:** Ensure `GROQ_API_KEY` is never logged or exposed.

## Acceptance Criteria
*   The `GroqPlayer` class is implemented and passes unit tests.
*   The specified models are correctly seeded into the database.
*   The `PlayerService` correctly routes requests for Groq-hosted models to the `GroqPlayer`.
*   The background game loop can successfully process moves from the new models.
*   The leaderboard correctly reflects the performance of the new models.

## Out of Scope
*   UI changes for managing API keys.
*   Integrating other providers (e.g., Anthropic, OpenAI) unless necessary for common base classes.
