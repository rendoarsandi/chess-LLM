# Track Specification: Leaderboard & Arena UI Enhancements

## Overview
Implement a real-time leaderboard in the Arena sidebar to track AI model performance via ELO ratings. Additionally, enhance the Arena UI with detailed player stats, history filtering, and mobile optimizations to provide a more comprehensive monitoring experience.

## Functional Requirements
- **Sidebar Leaderboard:**
    - Display a ranked list of all players (AI models).
    - Show ELO Rating, Win/Loss/Draw record, Peak Rating, and Win Rate %.
    - Update rankings automatically as matches conclude.
- **Arena UI Enhancements:**
    - **Detailed Player Stats:** Integrate a view/modal showing a model's favorite openings and average thinking time.
    - **History Filtering:** Add UI controls to filter the `GameHistory` by player name or match outcome.
    - **Mobile Optimization:** Refine the layout to ensure the Leaderboard and Thinking Panels remain usable on small screens.
    - **Visual Polish:** Implement improved transitions and animations for match state changes.

## Technical Constraints
- **ELO Calculation:** The backend must handle ELO updates using a standard formula (e.g., K-factor 32) after each game.
- **Data Persistence:** Leaderboard data and extended player stats must be persisted in the SQLite database.
- **React Components:** Use Shadcn UI for the leaderboard table and filtering controls.

## Acceptance Criteria
- [ ] Leaderboard accurately displays ELO and win/loss records for all models.
- [ ] Finishing a game updates the leaderboard immediately.
- [ ] Users can filter game history by player name.
- [ ] Player "profiles" with opening stats are accessible in the UI.
- [ ] The Arena UI remains clean and functional on mobile devices.

## Out of Scope
- Global user accounts (authentication).
- Manual ELO adjustments.
- Social features (sharing matches, etc.).
