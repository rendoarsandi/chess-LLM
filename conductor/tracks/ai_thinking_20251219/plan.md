# Implementation Plan - Advanced AI Thinking & Interactive Move History

## Phase 1: Data Persistence and Backend API
Goal: Update the database schema and API to support storing and retrieving AI thinking data.

- [x] Task: Update Drizzle schema to include `opening`, `candidates`, and `reasoning` in the `moves` table. e9c7c80
- [x] Task: Write tests for `GameService.makeMove` to verify it can save thinking data. f02463b
- [ ] Task: Update `GameService.makeMove` to store AI thoughts along with the move.
- [ ] Task: Update `GET /api/games/:id/moves` to return thinking data.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Data Persistence and Backend API' (Protocol in workflow.md)

## Phase 2: Enhanced AI Prompting and Parsing
Goal: Update the LLM player to provide structured thinking data in JSON format.

- [ ] Task: Write tests for `GeminiPlayer` verifying it requests and parses structured JSON responses.
- [ ] Task: Update `GeminiPlayer` prompt to require the new thinking fields (opening, 3 candidates, reasoning).
- [ ] Task: Implement robust JSON parsing and error handling for LLM responses in `GeminiPlayer`.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Enhanced AI Prompting and Parsing' (Protocol in workflow.md)

## Phase 3: Thinking Panels and Board Rotation
Goal: Implement the side panels and the ability to flip the board view.

- [ ] Task: Write unit tests for a new `ThinkingPanel` component.
- [ ] Task: Create the `ThinkingPanel` component to display model name, opening, candidates, and reasoning.
- [ ] Task: Update `App.tsx` layout to include White and Black thinking panels flanking the board.
- [ ] Task: Implement "Rotate Board" state and toggle button in the UI.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Thinking Panels and Board Rotation' (Protocol in workflow.md)

## Phase 4: Interactive Move History and Navigation
Goal: Build a feature-rich move history list with playback controls.

- [ ] Task: Write unit tests for the history navigation logic (jumping between positions).
- [ ] Task: Update `GameHistory` to make move items clickable.
- [ ] Task: Implement the `PlaybackControls` component (First, Previous, Next, Last).
- [ ] Task: Update `App.tsx` state to handle "Browsing Mode" vs "Live Mode".
- [ ] Task: Sync the chessboard to display the move highlight for the selected historical position.
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Interactive Move History and Navigation' (Protocol in workflow.md)

## Phase 5: Final Integration and Polishing
Goal: Ensure everything works together smoothly and meets the visual standards.

- [ ] Task: Run end-to-end integration tests for a full game with thinking data.
- [ ] Task: Refine UI styling, responsiveness, and dark mode consistency.
- [ ] Task: Conductor - User Manual Verification 'Phase 5: Final Integration and Polishing' (Protocol in workflow.md)
