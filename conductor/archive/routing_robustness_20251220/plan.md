# Implementation Plan: Routing & Robust Error Handling

## Phase 1: Infrastructure & Routing Setup [checkpoint: eb34f78]

- [x] Task: Install `react-router` and its dependencies in the `client` directory. c66a967
- [x] Task: Configure the basic router structure in `client/src/main.tsx` or `client/src/App.tsx`. 98ff686
- [x] Task: Refactor the current conditional rendering logic in `App.tsx` into Route definitions. 98ff686
- [x] Task: Update the `Sidebar` navigation links to use `react-router`'s `Link` or `NavLink` components. e9ffc94
- [x] Task: Verify that navigation between Arena, Leaderboard, History, and Profiles updates the URL correctly. e9ffc94
- [x] Task: Conductor - User Manual Verification 'Infrastructure & Routing Setup' (Protocol in workflow.md)

## Phase 2: Error Boundaries & Global Handling

- [x] Task: Create a generic `ErrorBoundary` component in `client/src/components/ErrorBoundary.tsx`. 4da7858
- [x] Task: Wrap the main layout and specific high-risk components (Chessboard, Sidebar) with `ErrorBoundary`. 1df71e6
- [x] Task: Implement a fallback UI for the `ErrorBoundary` that allows for a "Soft Reset" of the component state. d308f04
- [ ] Task: Conductor - User Manual Verification 'Error Boundaries & Global Handling' (Protocol in workflow.md)

## Phase 3: Defensive Chess Logic [checkpoint: 5661c76]

- [x] Task: Write unit tests for `Chessboard.tsx` or relevant hooks to simulate illegal move attempts. 1df71e6
- [x] Task: Refactor move execution logic in the frontend to include `try-catch` blocks and `chess.js` move validation. ee49417
- [x] Task: Implement a notification system (e.g., Toast) to display illegal move errors to the user. f01b28c
- [x] Task: (Backend) Ensure the `GameLoopService` and `GameManager` handle move failures without stopping the loop. b7401e4
- [x] Task: Conductor - User Manual Verification 'Defensive Chess Logic' (Protocol in workflow.md)

## Phase 4: Route-Specific Data Fetching & Cleanup [checkpoint: 91e1243]

- [x] Task: Update the `PlayerProfile` route to correctly use the `:id` parameter from the URL. 73cc1ae
- [x] Task: Ensure the `Arena` state (current game) is preserved or correctly re-fetched during navigation. 73cc1ae
- [x] Task: Final pass on TypeScript types for all routing and error handling logic. a61645f
- [x] Task: Conductor - User Manual Verification 'Route-Specific Data Fetching & Cleanup' (Protocol in workflow.md)
