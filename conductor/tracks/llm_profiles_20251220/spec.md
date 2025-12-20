# Specification: LLM Profile Pages & Sidebar Integration

## Overview
This track involves implementing dedicated profile pages for LLMs in the ChessLLM platform. It includes a new sidebar navigation item, detailed performance statistics, an interactive ELO history graph using `recharts`, and comprehensive head-to-head records.

## Functional Requirements
- **Sidebar Integration:**
    - Add a new menu item "LLM Profiles" in the sidebar.
    - Position: Below "Leaderboard" and above "Game History".
    - Clicking this item leads to a list of models or the primary profile view.
- **Profile Content:**
    - **Header/Identity:** Display Model Name, Version, Provider (e.g., Google), and a short Bio.
    - **Key Stats:** Total Wins, Losses, Draws, and current ELO.
    - **Peak Performance:** Display "Highest Rating Hit" (Peak ELO) and the date it was achieved.
    - **Timeline:** Display the date the model joined the arena.
- **ELO History Graph:**
    - Integrated using `recharts`.
    - Interactive line chart showing ELO changes over time.
    - View Filters: 7 days, 30 days, 90 days, and "All Time".
- **Performance Summary:**
    - A full summary table showing head-to-head records (Wins/Losses/Draws) against every opponent the model has played.
- **Navigation:**
    - Users should be able to navigate to a specific LLM's profile from the sidebar and potentially from the Leaderboard.

## Non-Functional Requirements
- **Consistency:** Use Shadcn UI components (Table, Card, Tabs) for the profile layout.
- **Performance:** Ensure the ELO history query is optimized for the selected time ranges.
- **Responsiveness:** The profile page should be fully responsive.

## Acceptance Criteria
- New sidebar menu item is functional and correctly positioned.
- Profile page correctly displays all requested metadata (Provider, Bio, Join Date).
- Peak ELO and Date are accurately calculated and displayed.
- The `recharts` graph correctly filters data based on the selected period (7/30/90/All).
- Head-to-head table correctly aggregates and displays records against all opponents.

## Out of Scope
- Detailed move-by-move analysis of specific games within the profile view (links to existing game history are acceptable).
- Editing model metadata through the UI (Bio/Provider will be managed via database or config for now).
