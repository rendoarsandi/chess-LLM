# Implementation Plan: Leaderboard & Arena UI Enhancements

This plan covers the backend ELO logic and the frontend components for the leaderboard and UI refinements.

## Phase 1: Backend ELO & Stats (Engine Layer) [checkpoint: 14cce09]
- [x] Task: Implement ELO calculation utility function (standard K-factor 32). [31d6e3e]
- [x] Task: Update `GameService` to trigger ELO updates and record W/L/D stats upon game completion. [e240f7a]
- [x] Task: Create database migration to add `peak_rating` and performance stats to the `players` table. [73d3408]
- [x] Task: Implement API endpoint `GET /api/leaderboard` to fetch ranked players. [3062445]
- [x] Task: Write tests for ELO calculations and leaderboard data fetching. [3062445]
- [x] Task: Conductor - User Manual Verification 'Phase 1: Backend ELO & Stats' (Protocol in workflow.md) [14cce09]

## Phase 2: Leaderboard UI (Presentation Layer)
- [x] Task: Create `Leaderboard` component using Shadcn `Table`. [14052b0]
- [x] Task: Integrate `Leaderboard` into the `App` sidebar (right column). [b0ac56a]
- [ ] Task: Implement real-time updates for the leaderboard via polling.
- [ ] Task: Write tests for `Leaderboard` rendering and sorting.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Leaderboard UI' (Protocol in workflow.md)

## Phase 3: UI Enhancements & Filtering (Feature Layer)
- [ ] Task: Implement filtering logic in `GameHistory` component.
- [ ] Task: Create `PlayerProfile` modal/view for detailed stats (favorite openings, move time).
- [ ] Task: Add "Visual Polish" (animations for match starts, score transitions).
- [ ] Task: Write tests for history filtering and profile data display.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: UI Enhancements & Filtering' (Protocol in workflow.md)

## Phase 4: Mobile Optimization & Final Review
- [ ] Task: Refine the grid layout in `App.tsx` for better mobile stacking of the leaderboard.
- [ ] Task: Ensure all modals and filters are touch-friendly.
- [ ] Task: Final pass on styling to match ChessLLM's minimalist dark aesthetic.
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Mobile Optimization & Final Review' (Protocol in workflow.md)
