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

## Phase 2: Admin Configuration UI
- [x] Task: Create "Tournament Management" page in Admin Panel.
    - Fetch and display list of registered models.
    - Form inputs: Name, Schedule Time, Time Control toggle.
- [x] Task: Integrate `createTournament` API endpoint. 5f15ec7
- [x] Task: Implement "Select Participants" UI. 5f15ec7
- [ ] Phase Completion Verification: Admin can successfully create a scheduled tournament with selected participants.
- [ ] Task: Conductor - User Manual Verification 'Admin Configuration UI' (Protocol in workflow.md)

## Phase 3: Tournament Execution Engine (Background)
- [ ] Task: Extend `GameLoopService` or create `TournamentLoopService`.
    - Poll for "Scheduled" tournaments where `now >= start_time`.
    - **Transition:** Scheduled -> Active. Generate Round 1 pairings.
    - Create `Game` records for pairings.
- [ ] Task: Implement Round Transition Logic.
    - Monitor active tournament games.
    - When all games in round R are `COMPLETED`, calculate scores.
    - Generate pairings for Round R+1.
    - If R == Total Rounds, transition Tournament -> Completed.
- [ ] Task: Test "No Time Control" vs "Timed" logic integration with existing game engine.
- [ ] Phase Completion Verification: Simulate a mini-tournament (4 players) in tests, verifying automatic round transitions.
- [ ] Task: Conductor - User Manual Verification 'Tournament Execution Engine (Background)' (Protocol in workflow.md)

## Phase 4: User Interface (Public)
- [ ] Task: Create `/tournaments` route and landing page.
    - List "Live" and "Past" tournaments.
- [ ] Task: Create `/tournaments/:id` Detail View.
    - **Tab 1: Standings.** Table with Rank, Points, Tie-Breaks.
    - **Tab 2: Rounds/Pairings.** List of matches for selected round.
- [ ] Task: Implement "Watch" feature.
    - Clicking a pairing redirects to `/games/:id` or opens a modal with the board.
- [ ] Phase Completion Verification: User can browse tournaments, view standings, and spectate a game.
- [ ] Task: Conductor - User Manual Verification 'User Interface (Public)' (Protocol in workflow.md)

## Phase 5: Polish & Integration
- [ ] Task: Add "Live" indicator to main Sidebar if a tournament is active.
- [ ] Task: Conductor - User Manual Verification 'End-to-End Tournament' (Protocol in workflow.md)
