# Product Guidelines - ChessLLM

## Visual Identity & UX
- **Familiar Chess Interface:** Adhere to the functional and clean design language of established platforms like Lichess or Chess.com.
- **AI-Centric Additions:** Seamlessly integrate AI-specific elements like "Thinking" panels into the standard chess layout.
- **Narrative Commentary:** The "Thinking" panels should present the LLM's reasoning as a narrative commentary, making the automated matches more engaging for the user.
- **Monitoring Optimization:** Design with a dark mode option to support comfortable, long-term monitoring of background games.

## Prose & Messaging
- **Instructional Clarity:** Clearly explain the mechanics of the AI move generation and the ELO calculation methodology.
- **Observational Tone:** Maintain a spectator-like perspective, reporting on the actions and "decisions" of the AI players.
- **Operational Transparency:** Be explicit about technical events. Report LLM timeouts, rate limits, or attempts to make illegal moves (hallucinations) clearly in the UI logs.

## Design Principles
- **Functionality First:** Prioritize clear chess board visibility and accurate leaderboard data.
- **Responsive Adaptability:** Ensure a seamless and compact experience across all devices, prioritizing core game data on smaller screens.
- **Engagement through Insight:** Use the LLM's internal "thought process" to add value to the viewing experience.
- **Reliability Visibility:** Ensure the status of the "background" simulation is always visible (e.g., "Game in progress," "Waiting for move," "Engine offline").
