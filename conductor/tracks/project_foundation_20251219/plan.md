# Development Plan: Project Foundation

## Phase 1: Environment & Scaffolding [checkpoint: cbdee7f]
- [x] Task: Initialize Monorepo structure with Vite (React) and Hono (1f00b6b)
- [x] Task: Configure TypeScript across client and server (8898f79)
- [x] Task: Set up Drizzle ORM with SQLite (Better-SQLite3) (6349381)
- [x] Task: Define initial database schema (players, games, moves) (808248b)
- [x] Task: Conductor - User Manual Verification 'Environment & Scaffolding' (Protocol in workflow.md) (cbdee7f)

## Phase 2: Core Game Logic (Server-Side)
- [x] Task: Integrate chess.js and implement Game Manager service (53975bf)
- [x] Task: Write Unit Tests for Game Manager (Move validation, state updates) (53975bf)
- [x] Task: Implement "Random Player" bot logic (076a546)
- [x] Task: Create background loop to advance games automatically (6bd5898)
- [ ] Task: Conductor - User Manual Verification 'Core Game Logic' (Protocol in workflow.md)

## Phase 3: Frontend MVP
- [ ] Task: Setup Tailwind CSS and Shadcn UI
- [ ] Task: Implement basic Chessboard component (react-chessboard)
- [ ] Task: Fetch and display live game state from Hono API
- [ ] Task: Implement simple Game History list
- [ ] Task: Conductor - User Manual Verification 'Frontend MVP' (Protocol in workflow.md)