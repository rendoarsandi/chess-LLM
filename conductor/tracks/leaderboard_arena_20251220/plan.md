# Implementation Plan: Leaderboard & Arena UI Enhancements

This plan covers the backend ELO logic and the frontend components for the leaderboard and UI refinements.

## Phase 1: Backend ELO & Stats (Engine Layer) [checkpoint: 14cce09]
- [x] Task: Implement ELO calculation utility function (standard K-factor 32). [31d6e3e]
- [x] Task: Update `GameService` to trigger ELO updates and record W/L/D stats upon game completion. [e240f7a]
- [x] Task: Create database migration to add `peak_rating` and performance stats to the `players` table. [73d3408]
- [x] Task: Implement API endpoint `GET /api/leaderboard` to fetch ranked players. [3062445]
- [x] Task: Write tests for ELO calculations and leaderboard data fetching. [3062445]
- [x] Task: Conductor - User Manual Verification 'Phase 1: Backend ELO & Stats' (Protocol in workflow.md) [14cce09]

## Phase 2: Leaderboard UI (Presentation Layer) [checkpoint: 6ec33e8]
- [x] Task: Create `Leaderboard` component using Shadcn `Table`. [14052b0]
- [x] Task: Integrate `Leaderboard` into the `App` sidebar (right column). [b0ac56a]
- [x] Task: Implement real-time updates for the leaderboard via polling. [320ee8d]
- [x] Task: Write tests for `Leaderboard` rendering and sorting. [6c68cb2]
- [x] Task: Conductor - User Manual Verification 'Phase 2: Leaderboard UI' (Protocol in workflow.md) [6ec33e8]

## Phase 3: UI Enhancements & Filtering (Feature Layer) [checkpoint: 263097f]
- [x] Task: Implement filtering logic in `GameHistory` component. [7b19636]
- [x] Task: Create `PlayerProfile` modal/view for detailed stats (favorite openings, move time). [94e2a89]
- [x] Task: Add "Visual Polish" (animations for match starts, score transitions). [8135f8a]
- [x] Task: Write tests for history filtering and profile data display. [7db09e2]
- [x] Task: Conductor - User Manual Verification 'Phase 3: UI Enhancements & Filtering' (Protocol in workflow.md) [263097f]

## Phase 4: Mobile Optimization & Final Review [checkpoint: b927967]
- [x] Task: Refine the grid layout in `App.tsx` for better mobile stacking of the leaderboard. [6e908b0]
- [x] Task: Ensure all modals and filters are touch-friendly. [6e908b0]
- [x] Task: Final pass on styling to match ChessLLM's minimalist dark aesthetic. [6e908b0]
- [x] Task: Conductor - User Manual Verification 'Phase 4: Mobile Optimization & Final Review' (Protocol in workflow.md) [b927967]
