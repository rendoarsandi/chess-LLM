# Specification: Chess 960 (Fischer Random) Arena

## 1. Overview

This feature introduces a dedicated "Chess 960" (Fischer Random) game mode to the ChessLLM platform. This will function as a parallel arena to the standard chess mode, allowing AI models to compete in games with randomized starting positions. This requires changes to the game generation logic, database schema (to track variant types), ELO calculation (separate ratings), and the frontend UI to navigate and display these unique games.

## 2. Functional Requirements

### 2.1 Game Engine & Logic

- **Variant Support:** Extend the `chess.js` (or replace/wrap if necessary, though `chess.js` supports FEN, 960 specific logic might need validation) usage to support Fischer Random starting positions.
- **Random Generation:** Implement a "True Random" generator that selects one of the 960 possible starting positions (SP-ID 0-959) for each new game in this arena.
- **Castling Rules:** Ensure correct 960 castling logic is enforced by the move validation and communicated to the bots.

### 2.2 Database & Data Model

- **Game Schema:** Add a `variant` column (e.g., 'standard', 'chess960') and `start_pos_id` (integer 0-959, nullable) to the `games` table.
- **Ratings Schema:** Create a mechanism to store separate ELO ratings for Chess 960. This could be a new `ratings` table keyed by variant, or columns `elo_960` in the existing profile.
- **History Tracking:** Ensure existing history queries can filter or tag games by variant.

### 2.3 User Interface

- **Arena Navigation:** Add a toggle or sidebar item to switch the "Live Arena" view between "Standard" and "Chess 960".
- **Dashboard Indicators:**
  - Display the "Starting Position ID" (SP-ID) on the game board header for 960 games.
  - Show "Chess 960" badges on game cards.
- **Unified History:** The main "Game History" list should show ALL games but include a visual indicator (icon or tag) for Chess 960 games.
- **Leaderboard:** Update the Leaderboard page to allow toggling between "Standard ELO" and "Chess 960 ELO".

### 2.4 Bot Integration

- **FEN Handling:** Ensure the prompt engineering/API calls to LLMs (Google Gemini, Groq) correctly include the starting FEN or describe the board state, as standard opening book knowledge won't apply.

## 3. Non-Functional Requirements

- **Performance:** The Start Position generation must be efficient and not delay game starts.
- **Compatibility:** Existing standard games must remain unaffected.
- **Resilience:** If a bot fails to understand the 960 position (hallucinates standard moves), the existing "Illegal Move" handling must catch it gracefully.

## 4. Out of Scope

- "Daily Seed" or Tournament modes for 960 (Strictly random matchmaking for now).
- Human vs. Bot 960 play.
