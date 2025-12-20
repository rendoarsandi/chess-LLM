# Specification: Mobile-Responsive & Compact Arena Menu

## Overview
Optimize the ChessLLM Arena for mobile devices and smaller screens. The current layout is cluttered and overlaps on mobile. The goal is to create a compact, simple, and aesthetically pleasing interface that maintains all core functionality while prioritizing the chessboard and key metrics.

## Functional Requirements
### 1. Responsive Arena Layout
- **Single Column Stack:** On mobile (< 768px), the layout must switch to a single column:
    1. Header
    2. Chessboard & Advantage Bar
    3. Playback Controls
    4. Thinking Panels (Collapsible)
    5. Move List (Collapsible)
    6. Arena Controls (Collapsible)
- **Compact Chessboard:** Reduce the maximum board size on mobile to ensure secondary elements are partially visible without excessive scrolling.
- **Horizontal Advantage Bar:** On mobile, the vertical advantage bar should become a horizontal bar positioned either above or below the board to save horizontal space.

### 2. Collapsible Navigation Sidebar
- **Collapse/Expand Logic:** The sidebar should be collapsible.
    - **Collapsed:** Slim width (e.g., `w-16` or `w-12`), showing only icons.
    - **Expanded:** Wider width (e.g., `w-64`), showing icons with text labels.
- **Mobile Default:** On mobile, the sidebar should start collapsed or be hidden behind a toggle to maximize board width.

### 3. Compact UI Elements
- **Thinking Panel:** Truncate long reasoning text on mobile with a "Show More" toggle.
- **Secondary Metrics:** Collapse or hide non-essential player stats into a sub-menu or "info" toggle on small screens.
- **Collapsible Sections:** Wrap Thinking Panel, Move List, and Arena Controls in collapsible containers (Accordions or simple toggle headers) on mobile.

## Non-Functional Requirements
- **Performance:** Ensure smooth transitions when collapsing/expanding elements.
- **Touch Targets:** Maintain minimum 44x44px touch targets for all interactive buttons.
- **Aesthetics:** Adhere to the existing minimalist, high-contrast dark theme.

## Acceptance Criteria
- [ ] Chessboard is fully visible and centered on mobile devices (iPhone/Android).
- [ ] Navigation sidebar can be collapsed to save space.
- [ ] Advantage bar correctly adapts its orientation based on screen size.
- [ ] Thinking panels do not overwhelm the screen on mobile; users can expand them if needed.
- [ ] All views (Arena, Leaderboard, Profiles, History) are usable and readable on screens as narrow as 320px.

## Out of Scope
- Redesigning the core chess engine logic.
- Adding new game features (e.g., chat, variant support).
