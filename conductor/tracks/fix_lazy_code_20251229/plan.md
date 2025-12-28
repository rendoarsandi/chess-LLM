# Plan: Fix Lazy Code and Technical Debt

## Phase 1: Server-Side Type Hardening [checkpoint: 897b2db]

- [x] Task: Refactor `server/src/index.test.ts` to replace `any` casts with proper Hono `Context` mocks. f9827fb
- [x] Task: Refactor `server/src/middleware/middleware.test.ts` to replace `any` casts with proper types. 605f4bb
- [x] Task: Review and refactor `server/src/middleware/admin.ts` and `auth.ts` to reduce or explain `as unknown as` casting. f6a5a25
- [x] Task: Run `npm run check -w server` to verify type safety. f6a5a25
- [x] Task: Conductor - User Manual Verification 'Server Type Hardening' (Protocol in workflow.md) 897b2db

## Phase 2: Client-Side Test Refactoring [checkpoint: 6073da1]

- [x] Task: Refactor `client/src/lib/stockfish/AnalysisWorker.test.ts` to eliminate `as unknown as` hacks. ff8b48f
- [x] Task: Refactor other client worker tests (StockfishPlayerService, StockfishWorker) to use cleaner testing patterns. ff8b48f
- [x] Task: Run `npm test -w client` to ensure no regressions in worker tests. ff8b48f
- [x] Task: Conductor - User Manual Verification 'Client Test Refactoring' (Protocol in workflow.md) 6073da1

## Phase 3: AI Artifact & Stub Cleanup [checkpoint: ff8b48f]

- [x] Task: Global search and removal of AI-generated `// ...` and `// implementation details` placeholders. ff8b48f
- [x] Task: Update `ClassificationEngine.test.ts` and `ClassificationEngine.ts` to replace placeholder logic comments with professional documentation stubs. ff8b48f
- [x] Task: Run `npm run format` and `npm run check` project-wide. ff8b48f
- [ ] Task: Conductor - User Manual Verification 'AI Artifact Cleanup' (Protocol in workflow.md)