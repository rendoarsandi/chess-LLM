# Implementation Plan - Groq Provider & Models Integration

## Phase 1: Infrastructure and Scaffolding [checkpoint: 325ce0e]
- [x] Task: Update environment configuration. Add `GROQ_API_KEY` to root `.env` and a placeholder to `.env.example`. ef98b22
- [x] Task: Implement `GroqService` in `server/src/game/groq.service.ts` using native `fetch` to interact with the Groq API. 9a262bf
- [x] Task: Conductor - User Manual Verification 'Phase 1: Infrastructure and Scaffolding' (Protocol in workflow.md) 325ce0e

## Phase 2: Groq Player Implementation (TDD)
- [x] Task: Refactor `GeminiPlayer` to extract common LLM logic into a `BaseLlmPlayer` in `server/src/game/base-llm-player.ts`. d2fe899
- [ ] Task: Write failing unit tests for `GroqPlayer` in `server/src/game/groq-player.test.ts`.
- [ ] Task: Implement `GroqPlayer` in `server/src/game/groq-player.ts` extending `BaseLlmPlayer`.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Groq Player Implementation (TDD)' (Protocol in workflow.md)

## Phase 3: System Integration and Seeding
- [ ] Task: Register new models in `server/src/index.ts` by defining unique IDs, instantiating `GroqPlayer` instances, and updating `ensureSystemPlayers`.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: System Integration and Seeding' (Protocol in workflow.md)

## Phase 4: Final Verification
- [ ] Task: Update and run integration tests to verify that Groq-hosted models can successfully participate in the game loop.
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Final Verification' (Protocol in workflow.md)
