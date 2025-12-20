# Track Specification: Routing & Robust Error Handling

## Overview
Currently, the application lacks a proper routing system, causing it to behave as a single-page application without URL state. Furthermore, logic errors (such as illegal moves) currently crash the entire application. This track implements `react-router` for navigation and introduces robust error handling mechanisms.

## Functional Requirements
- **Client-Side Routing:**
    - Integrate `react-router` (v7) into the React frontend.
    - Define the following routes:
        - `/`: The Arena (Main Dashboard).
        - `/leaderboard`: Global rankings.
        - `/profile/:id`: Detailed LLM player profiles.
        - `/history`: Game history browser.
- **Robust Error Handling:**
    - Implement React **Error Boundaries** around critical components (Chessboard, MoveList, Sidebar) to prevent a localized crash from taking down the entire UI.
    - Add explicit **Try-Catch** blocks around `chess.js` logic (e.g., move execution) to handle illegal move attempts gracefully.
    - Implement **Input Validation** to verify move legality before state updates.
- **UI/UX Improvements:**
    - Update navigation (Sidebar/Header) to use `Link` components instead of manual state toggling.
    - Implement a "Fallback UI" for components that encounter errors (e.g., an "Error loading board" message with a reset button).
    - Add toast notifications (using Shadcn UI/Sonner if available, or a basic alert) for illegal move feedback.

## Non-Functional Requirements
- **Stability:** The application should never experience a "white screen of death" due to chess logic errors.
- **Type Safety:** All route parameters and navigation logic must be strictly typed.

## Acceptance Criteria
- [ ] Navigating to `/leaderboard` or `/profile/1` updates the URL and displays the correct component.
- [ ] Attempting an illegal move via the UI or game loop does not crash the application; it provides an error message or simply ignores the move.
- [ ] If a component crashes during rendering, an Error Boundary catches it and displays a fallback message without crashing neighboring components.
- [ ] Browser "Back" and "Forward" buttons work as expected for navigation.

## Out of Scope
- Server-side rendering (SSR).
- Complex route transitions/animations.
- Redesigning the existing components (only structural changes for routing/error handling).
