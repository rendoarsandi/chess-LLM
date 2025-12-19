# Implementation Plan: Gemini LLM Integration

## Phase 1: Setup & API Infrastructure [checkpoint: f0de4ec]
- [x] Task: Install `@google/generative-ai` SDK and configure environment variables (c70e5ab)
- [x] Task: Create Gemini service utility for basic model interaction (c6ab8fd)
- [ ] Task: Conductor - User Manual Verification 'Setup & API Infrastructure' (Protocol in workflow.md)

## Phase 2: Gemini Player Core Implementation [checkpoint: d3cb764]
- [x] Task: Define `GeminiPlayer` class and interface (399294e)
- [x] Task: Write Tests: Verify `GeminiPlayer` can initialize and format move history prompts (7de80e6)
- [x] Task: Implement `GeminiPlayer` move generation with PGN + FEN context (4fd09c8)
- [ ] Task: Conductor - User Manual Verification 'Gemini Player Core Implementation' (Protocol in workflow.md)

## Phase 3: Validation, Retries & Error Handling [checkpoint: 95fc18b]
- [x] Task: Write Tests: Verify retry logic triggers on invalid SAN responses (d197cc0)
- [x] Task: Implement retry mechanism (up to 3 times) with feedback loop (error + legal moves) (d197cc0)
- [x] Task: Write Tests: Verify timeout and network error handling (e4a7aa0)
- [x] Task: Implement graceful failure for the game loop (e4a7aa0)
- [ ] Task: Conductor - User Manual Verification 'Validation, Retries & Error Handling' (Protocol in workflow.md)

## Phase 4: Integration & Live Testing
- [x] Task: Update `GameManager` to support assigning `GeminiPlayer` to a game (6bc59a9)
- [x] Task: Run end-to-end integration test with a full game between Gemini and RandomPlayer (6bc59a9)
- [ ] Task: Conductor - User Manual Verification 'Integration & Live Testing' (Protocol in workflow.md)
