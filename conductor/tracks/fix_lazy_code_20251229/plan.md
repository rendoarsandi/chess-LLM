# Plan: Fix Lazy Code and Technical Debt

## Phase 1: Server-Side Type Hardening
- [x] Task: Refactor `server/src/index.test.ts` to replace `any` casts with proper Hono `Context` mocks. f9827fb
- [x] Task: Refactor `server/src/middleware/middleware.test.ts` to replace `any` casts with proper types. 605f4bb
- [ ] Task: Review and refactor `server/src/middleware/admin.ts` and `auth.ts` to reduce or explain `as unknown as` casting.
- [ ] Task: Run `npm run check -w server` to verify type safety.
- [ ] Task: Conductor - User Manual Verification 'Server Type Hardening' (Protocol in workflow.md)

## Phase 2: Client-Side Test Refactoring
- [ ] Task: Refactor `client/src/lib/stockfish/AnalysisWorker.test.ts` to eliminate `as unknown as` hacks.
- [ ] Task: Refactor other client worker tests (StockfishPlayerService, StockfishWorker) to use cleaner testing patterns.
- [ ] Task: Run `npm test -w client` to ensure no regressions in worker tests.
- [ ] Task: Conductor - User Manual Verification 'Client Test Refactoring' (Protocol in workflow.md)

## Phase 3: AI Artifact & Stub Cleanup
- [ ] Task: Global search and removal of AI-generated `// ...` and `// implementation details` placeholders.
- [ ] Task: Update `ClassificationEngine.test.ts` and `ClassificationEngine.ts` to replace placeholder logic comments with professional documentation stubs.
- [ ] Task: Run `npm run format` and `npm run check` project-wide.
- [ ] Task: Conductor - User Manual Verification 'AI Artifact Cleanup' (Protocol in workflow.md)
