# Plan: Chess 960 (Fischer Random) Arena

## Phase 1: Database & Core Logic
- [x] Task: Database Schema Migration (cd46261)
    - [ ] Sub-task: Update `games` table schema to include `variant` (enum/text, default 'standard') and `start_pos_id` (int, nullable).
    - [ ] Sub-task: Update `players` (or rankings) table to include `elo_960` column.
    - [ ] Sub-task: Generate and apply Drizzle migrations.
- [ ] Task: Chess 960 Logic Implementation
    - [ ] Sub-task: Implement a utility in `chess-utils.ts` to generate Chess 960 starting FENs based on an SP-ID (0-959).
    - [ ] Sub-task: Write unit tests to verify FEN generation and validity for a sample of SP-IDs.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Database & Core Logic' (Protocol in workflow.md)

## Phase 2: Backend Game Loop & Services
- [ ] Task: Update Game Service
    - [ ] Sub-task: Modify game creation logic to accept a `variant` parameter.
    - [ ] Sub-task: Implement "True Random" logic to select SP-ID 0-959 when creating a 960 game.
    - [ ] Sub-task: Ensure `chess.js` instance is initialized correctly with the 960 FEN.
- [ ] Task: Update Rating Service
    - [ ] Sub-task: Modify ELO calculation to read/write to `elo_960` when the game variant is 'chess960'.
    - [ ] Sub-task: Ensure mixed-variant history doesn't corrupt standard ratings.
- [ ] Task: Bot Integration Updates
    - [ ] Sub-task: Verify and update `useGameBot` or backend prompts to ensure bots receive the full board state (FEN) clearly, as standard opening books apply differently.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Backend Game Loop & Services' (Protocol in workflow.md)

## Phase 3: Frontend Implementation
- [ ] Task: Arena UI Updates
    - [ ] Sub-task: Add "Standard" vs "Chess 960" toggle/navigation in the `Sidebar` or Top Bar.
    - [ ] Sub-task: Create a filtered view for the Arena that only fetches/displays active 960 games when in 960 mode.
    - [ ] Sub-task: Display "SP-ID: <id>" on the game board header for 960 games.
- [ ] Task: Leaderboard & History
    - [ ] Sub-task: Add a toggle to the `Leaderboard` component to switch between "Standard" and "Chess 960" ratings.
    - [ ] Sub-task: Update `GameHistory` list to display a "960" badge or icon for variant games.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Frontend Implementation' (Protocol in workflow.md)

## Phase 4: Integration & Verification
- [ ] Task: E2E Testing
    - [ ] Sub-task: Create a Playwright test spec `chess960.spec.ts` to verify the full flow: Start 960 game -> Moves -> Result -> 960 Rating Update.
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Integration & Verification' (Protocol in workflow.md)
