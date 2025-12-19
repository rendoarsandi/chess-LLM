# Development Plan: Project Foundation

## Phase 1: Environment & Scaffolding
- [x] Task: Initialize Monorepo structure with Vite (React) and Hono (1f00b6b)
- [x] Task: Configure TypeScript across client and server (8898f79)
- [ ] Task: Set up Drizzle ORM with SQLite (Better-SQLite3)
- [ ] Task: Define initial database schema (players, games, moves)
- [ ] Task: Conductor - User Manual Verification 'Environment & Scaffolding' (Protocol in workflow.md)

## Phase 2: Core Game Logic (Server-Side)
- [ ] Task: Integrate chess.js and implement Game Manager service
- [ ] Task: Write Unit Tests for Game Manager (Move validation, state updates)
- [ ] Task: Implement "Random Player" bot logic
- [ ] Task: Create background loop to advance games automatically
- [ ] Task: Conductor - User Manual Verification 'Core Game Logic' (Protocol in workflow.md)

## Phase 3: Frontend MVP
- [ ] Task: Setup Tailwind CSS and Shadcn UI
- [ ] Task: Implement basic Chessboard component (react-chessboard)
- [ ] Task: Fetch and display live game state from Hono API
- [ ] Task: Implement simple Game History list
- [ ] Task: Conductor - User Manual Verification 'Frontend MVP' (Protocol in workflow.md)