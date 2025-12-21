# Plan: Swiss System Tournament Feature

## Phase 1: Database Schema & Domain Modeling [checkpoint: f2a16aa]
- [x] Task: Create `tournaments` and `tournament_participants` tables (Drizzle Schema) bc4181f
    - Define fields: `id`, `name`, `status` (scheduled, active, completed), `start_time`, `time_control_settings`, `current_round`, `total_rounds`.
- [x] Task: Update `games` table to include `tournament_id` and `round_number` foreign keys/columns. 33a4d1a
- [x] Task: Create `TournamentService` class (Backend) 6e4bc7b
    - Implement methods: `createTournament`, `registerParticipant`, `startTournament`.
- [x] Task: Implement Swiss Pairing Logic (Algorithm) eeb8d27
    - Create a helper to generate pairings based on current scores and history (avoid repeat matchups).
    - **Unit Test:** Verify pairing logic with a mock set of 8 players over 3 rounds.
- [x] Phase Completion Verification: Verify schema migrations and pairing algorithm.
- [x] Task: Conductor - User Manual Verification 'Database Schema & Domain Modeling' (Protocol in workflow.md)

## Phase 2: Admin Configuration UI [checkpoint: 22a8949]
- [x] Task: Create "Tournament Management" page in Admin Panel.
    - Fetch and display list of registered models.
    - Form inputs: Name, Schedule Time, Time Control toggle.
- [x] Task: Integrate `createTournament` API endpoint. 5f15ec7
- [x] Task: Implement "Select Participants" UI. 5f15ec7
- [x] Phase Completion Verification: Admin can successfully create a scheduled tournament with selected participants.
- [x] Task: Conductor - User Manual Verification 'Admin Configuration UI' (Protocol in workflow.md)

## Phase 3: Tournament Execution Engine (Background) [checkpoint: 03e3b9e]
- [x] Task: Extend `GameLoopService` or create `TournamentLoopService`. 03e3b9e
    - Poll for "Scheduled" tournaments where `now >= start_time`.
    - **Transition:** Scheduled -> Active. Generate Round 1 pairings.
    - Create `Game` records for pairings.
- [x] Task: Implement Round Transition Logic. 03e3b9e
    - Monitor active tournament games.
    - When all games in round R are `COMPLETED`, calculate scores.
    - Generate pairings for Round R+1.
    - If R == Total Rounds, transition Tournament -> Completed.
- [x] Task: Test "No Time Control" vs "Timed" logic integration with existing game engine. 03e3b9e
- [x] Phase Completion Verification: Simulate a mini-tournament (4 players) in tests, verifying automatic round transitions.
- [x] Task: Conductor - User Manual Verification 'Tournament Execution Engine (Background)' (Protocol in workflow.md)

## Phase 4: User Interface (Public)
- [x] Task: Create `/tournaments` route and landing page. a7b8c9d
    - List "Live" and "Past" tournaments.
- [x] Task: Create `/tournaments/:id` Detail View. b1c2d3e
    - **Tab 1: Standings.** Table with Rank, Points, Tie-Breaks.
    - **Tab 2: Rounds/Pairings.** List of matches for selected round.
- [x] Task: Implement "Watch" feature. b1c2d3e
    - Clicking a pairing redirects to `/games/:id` or opens a modal with the board.
- [ ] Phase Completion Verification: User can browse tournaments, view standings, and spectate a game.
- [ ] Task: Conductor - User Manual Verification 'User Interface (Public)' (Protocol in workflow.md)

## Phase 5: Polish & Integration
- [ ] Task: Add "Live" indicator to main Sidebar if a tournament is active.
- [ ] Task: Conductor - User Manual Verification 'End-to-End Tournament' (Protocol in workflow.md)
