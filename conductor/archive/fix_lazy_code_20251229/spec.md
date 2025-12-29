# Specification: Fix Lazy Code and Technical Debt

## 1. Overview

This track focuses on improving the overall code quality and maintainability of the ChessLLM project by eliminating "lazy" coding patterns. This includes hardening type safety in areas currently using `any` or excessive casting, and removing or expanding AI-generated placeholder comments and stubs.

## 2. Functional Requirements

### 2.1 Type Safety Enforcement

- **Server Tests**: Replace `any` casts in `server/src/index.test.ts` and `server/src/middleware/middleware.test.ts` with proper `Context` or `MockContext` types.
- **Client Tests**: Refactor `client/src/lib/stockfish/AnalysisWorker.test.ts` and related worker tests to remove `as unknown as` hacks used for accessing internal state.
- **Middleware**: Investigate and refactor complex casting in `server/src/middleware/admin.ts` and `server/src/middleware/auth.ts`.

### 2.2 Documentation & AI Artifact Cleanup

- **Inline Artifacts**: Systematically search for and remove or expand upon `// ...` and `// implementation details` comments across the codebase.
- **Stub Cleanup**: Refactor the placeholder comment in `client/src/lib/ClassificationEngine.test.ts:49` to better document the intended future logic without using lazy placeholders.

## 3. Non-Functional Requirements

- **Strict Typing**: No new `any` types should be introduced.
- **Code Coverage**: Ensure that refactoring does not decrease existing test coverage.
- **Consistency**: Follow the project's established TypeScript and ESLint configurations.

## 4. Acceptance Criteria

- `npm run check` passes without any linting or type errors in both client and server.
- All unit tests pass (`npm run test -w server` and `npm test -w client`).
- A global search for `as any` (outside of necessary mocks) and `// ...` returns no results in active code.
- "Brilliant" logic in `ClassificationEngine` remains a stub but with professional documentation instead of a placeholder comment.

## 5. Out of Scope

- Implementation of the actual "Brilliant" move logic.
- Moving Stockfish initialization logic (reserved for a future architectural track).
