# Track Specification: Advanced AI Thinking & Interactive Move History

## Overview

Enhance the ChessLLM arena by providing deep insight into the AI's decision-making process and improving game analysis tools. This includes dedicated "Thinking Panels" for each player, improved AI prompting for opening theory and move evaluation, and a feature-rich, interactive move history component similar to major chess platforms.

## Functional Requirements

### 1. Thinking Panels (UI/UX)

- **Dual Sidebars:** Implement two fixed panels flanking the chessboard.
  - **Left Panel:** Displays White's thinking process.
  - **Right Panel:** Displays Black's thinking process.
- **Player Information:** Each panel must clearly show the player's name and the specific LLM model being used.
- **Content:** Panels will display:
  - **Current Opening:** The name of the opening variation detected by the AI.
  - **Top 3 Candidates:** A list of the three best moves the AI is considering.
  - **Reasoning Summary:** A brief explanation of the AI's strategic goals and why it chose the final move.
- **Rotate Board:** Add a toggle to flip the board orientation. The thinking panels must remain in their fixed Left/Right positions (White left, Black right) regardless of board orientation.

### 2. Enhanced AI Logic

- **Prompt Engineering:** Update the LLM prompt to require a structured response (JSON) containing:
  - The detected opening name.
  - Evaluation of 3 candidate moves.
  - Strategic reasoning.
- **Opening Awareness:** The AI must explicitly identify and reference opening theory in its decision-making process.
- **Best Move Selection:** The AI should explicitly weigh its 3 candidates to ensure it selects the strongest move based on its evaluation.

### 3. Interactive Move History

- **PGN-style List:** A structured list of moves made during the game.
- **Navigation Controls:** Implement buttons for:
  - **First:** Jump to the starting position.
  - **Previous:** Step back one move.
  - **Next:** Step forward one move.
  - **Last:** Jump to the current live position.
- **Interactive Clicking:** Clicking any move in the history list will update the board to show that specific position.
- **Visual Sync:**
  - Highlight the selected move in the history list.
  - Highlight the "from" and "to" squares of the selected move on the chessboard.

## Technical Requirements

- **State Management:** Extend the `moves` database schema or create a `thoughts` table to persist the AI's reasoning and candidates for each move.
- **API Updates:** Modify the move-making and game-fetching endpoints to include the "thinking" data.
- **Frontend Components:**
  - Create a `ThinkingPanel` component.
  - Refactor `GameHistory` to be interactive and include navigation logic.
- **LLM Output Parsing:** Implement robust JSON parsing for LLM responses to handle the new structured "thinking" data.

## Acceptance Criteria

- [ ] Thinking panels are visible and correctly labeled for both players.
- [ ] Board rotation works without moving the thinking panels.
- [ ] AI identifies openings and provides 3 candidates in its thinking output.
- [ ] Move history is clickable and correctly updates the board position.
- [ ] Navigation buttons (First/Prev/Next/Last) function correctly.
- [ ] All new components are fully responsive and follow the project's dark theme.

## Out of Scope

- Integration of external engines (Stockfish) for objective evaluation (pure LLM prompting is used).
- Real-time "streaming" of AI thoughts (thoughts are displayed once the move is determined).
