# Implementation Plan - Advanced AI Thinking & Interactive Move History

## Phase 1: Data Persistence and Backend API [checkpoint: 3b1540e]
Goal: Update the database schema and API to support storing and retrieving AI thinking data.

- [x] Task: Update Drizzle schema to include `opening`, `candidates`, and `reasoning` in the `moves` table. e9c7c80
- [x] Task: Write tests for `GameService.makeMove` to verify it can save thinking data. f02463b
- [x] Task: Update `GameService.makeMove` to store AI thoughts along with the move. a40a8c4
- [x] Task: Update `GET /api/games/:id/moves` to return thinking data. a612f22
- [x] Task: Conductor - User Manual Verification 'Phase 1: Data Persistence and Backend API' (Protocol in workflow.md) 3b1540e

## Phase 2: Enhanced AI Prompting and Parsing [checkpoint: 130ed50]
Goal: Update the LLM player to provide structured thinking data in JSON format.

- [x] Task: Write tests for `GeminiPlayer` verifying it requests and parses structured JSON responses. 462bdeb
- [x] Task: Update `GeminiPlayer` prompt to require the new thinking fields (opening, 3 candidates, reasoning). fdb9dd3
- [x] Task: Implement robust JSON parsing and error handling for LLM responses in `GeminiPlayer`. fdb9dd3
- [x] Task: Conductor - User Manual Verification 'Phase 2: Enhanced AI Prompting and Parsing' (Protocol in workflow.md) 130ed50

## Phase 3: Thinking Panels and Board Rotation [checkpoint: 1cec8af]
Goal: Implement the side panels and the ability to flip the board view.

- [x] Task: Write unit tests for a new `ThinkingPanel` component. f6a97a3
- [x] Task: Create the `ThinkingPanel` component to display model name, opening, candidates, and reasoning. 7084a0a
- [x] Task: Update `App.tsx` layout to include White and Black thinking panels flanking the board. 2def747
- [x] Task: Implement "Rotate Board" state and toggle button in the UI. 1cec8af
- [x] Task: Conductor - User Manual Verification 'Phase 3: Thinking Panels and Board Rotation' (Protocol in workflow.md) 1cec8af

## Phase 4: Interactive Move History and Navigation [checkpoint: 41420e2]
Goal: Build a feature-rich move history list with playback controls.

- [x] Task: Write unit tests for the history navigation logic (jumping between positions). f1b9dd0
- [x] Task: Update `GameHistory` to make move items clickable. 3dc8579
- [x] Task: Implement the `PlaybackControls` component (First, Previous, Next, Last). 4bca826
- [x] Task: Update `App.tsx` state to handle "Browsing Mode" vs "Live Mode". ff30e89
- [x] Task: Sync the chessboard to display the move highlight for the selected historical position. ff30e89
- [x] Task: Conductor - User Manual Verification 'Phase 4: Interactive Move History and Navigation' (Protocol in workflow.md) 41420e2

## Phase 5: Final Integration and Polishing [checkpoint: 29b0108]
Goal: Ensure everything works together smoothly and meets the visual standards.

- [x] Task: Run end-to-end integration tests for a full game with thinking data. 57c20ab
- [x] Task: Refine UI styling, responsiveness, and dark mode consistency. 57c20ab
- [x] Task: Conductor - User Manual Verification 'Phase 5: Final Integration and Polishing' (Protocol in workflow.md) 29b0108
