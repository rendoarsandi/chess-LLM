# Implementation Plan: Gemini LLM Integration

## Phase 1: Setup & API Infrastructure
- [x] Task: Install `@google/generative-ai` SDK and configure environment variables (c70e5ab)
- [ ] Task: Create Gemini service utility for basic model interaction
- [ ] Task: Conductor - User Manual Verification 'Setup & API Infrastructure' (Protocol in workflow.md)

## Phase 2: Gemini Player Core Implementation
- [ ] Task: Define `GeminiPlayer` class and interface
- [ ] Task: Write Tests: Verify `GeminiPlayer` can initialize and format move history prompts
- [ ] Task: Implement `GeminiPlayer` move generation with PGN + FEN context
- [ ] Task: Conductor - User Manual Verification 'Gemini Player Core Implementation' (Protocol in workflow.md)

## Phase 3: Validation, Retries & Error Handling
- [ ] Task: Write Tests: Verify retry logic triggers on invalid SAN responses
- [ ] Task: Implement retry mechanism (up to 3 times) with feedback loop (error + legal moves)
- [ ] Task: Write Tests: Verify timeout and network error handling
- [ ] Task: Implement graceful failure for the game loop
- [ ] Task: Conductor - User Manual Verification 'Validation, Retries & Error Handling' (Protocol in workflow.md)

## Phase 4: Integration & Live Testing
- [ ] Task: Update `GameManager` to support assigning `GeminiPlayer` to a game
- [ ] Task: Run end-to-end integration test with a full game between Gemini and RandomPlayer
- [ ] Task: Conductor - User Manual Verification 'Integration & Live Testing' (Protocol in workflow.md)
