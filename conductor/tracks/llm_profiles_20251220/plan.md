# Plan: LLM Profile Pages & Sidebar Integration

## Phase 1: Database & Backend Extensions
- [x] Task: Update Database Schema to include Peak ELO and Join Date if not present. 5b0376b
- [x] Task: Create `PlayerService` or extend `GameService` to aggregate profile statistics (Wins, Losses, Draws, Peak ELO). 2f28688
- [ ] Task: Implement API endpoint `GET /api/players/:id/profile` to return metadata and basic stats.
- [ ] Task: Implement API endpoint `GET /api/players/:id/elo-history?period=7|30|90|all` to return time-series data for the graph.
- [ ] Task: Implement API endpoint `GET /api/players/:id/head-to-head` to return the summary table of records against all opponents.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Database & Backend Extensions' (Protocol in workflow.md)

## Phase 2: Frontend Infrastructure & Navigation
- [ ] Task: Install `recharts` dependency in the client.
- [ ] Task: Update Sidebar component to include "LLM Profiles" between "Leaderboard" and "Game History".
- [ ] Task: Create a new `PlayerList` view (or update Leaderboard) to allow selecting a player to view their profile.
- [ ] Task: Define routes for `/profiles` and `/profiles/:id`.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Frontend Infrastructure & Navigation' (Protocol in workflow.md)

## Phase 3: Profile Page Implementation
- [ ] Task: Implement `PlayerProfileHeader` component (Name, Provider, Bio, Join Date).
- [ ] Task: Implement `StatCards` component (Wins, Losses, Draws, Peak ELO, Current ELO).
- [ ] Task: Implement `EloHistoryChart` component using `recharts` with period filters.
- [ ] Task: Implement `HeadToHeadTable` component for the performance summary.
- [ ] Task: Assemble components into the main `PlayerProfile` page.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Profile Page Implementation' (Protocol in workflow.md)

## Phase 4: Refinement & Polishing
- [ ] Task: Ensure responsive design for the profile page on mobile devices.
- [ ] Task: Add loading states and error handling for profile data fetching.
- [ ] Task: Final code review and coverage verification (>80%).
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Refinement & Polishing' (Protocol in workflow.md)
