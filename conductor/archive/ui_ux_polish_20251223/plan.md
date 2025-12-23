# Implementation Plan - UI/UX Polish

## Phase 1: Foundation & Navigation [checkpoint: 536b70b]
- [x] Task: Set up Design Tokens & Global Styles (Tailwind Config) (b7c3128)
    - [x] Sub-task: Audit and define consistent colors, typography, and spacing in `tailwind.config.js`.
    - [x] Sub-task: Define global styles for light/dark mode variables in `index.css`.
- [x] Task: Sidebar & Layout Architecture (35db6e4)
    - [x] Sub-task: Refactor `Sidebar.tsx` to use Shadcn `Sheet` (or similar) for mobile drawer.
    - [x] Sub-task: Ensure active state styling for navigation links.
    - [x] Sub-task: Fix layout container to prevent content overlap on mobile.
- [ ] Task: Conductor - User Manual Verification 'Foundation & Navigation' (Protocol in workflow.md)

## Phase 2: Game Board & Core Controls [checkpoint: 53c1525]
- [x] Task: Board Responsiveness (9f69a7d)
    - [x] Sub-task: Fix `Chessboard` and `AnalysisBoard` container sizing to be fully responsive.
    - [x] Sub-task: Ensure piece animation performance is optimal.
- [x] Task: Control Panel Polish (9f69a7d)
    - [x] Sub-task: Style "Start", "Stop", "Analysis" buttons with consistent Shadcn variants and icons.
    - [x] Sub-task: Implement `ThinkingPanel` improvements (smooth scrolling/text appearance).
- [ ] Task: Conductor - User Manual Verification 'Game Board & Core Controls' (Protocol in workflow.md)

## Phase 3: Dashboards & Data Display [checkpoint: f0adfd6]
- [x] Task: Leaderboard & History Tables (0779c6d)
    - [x] Sub-task: Refactor `Leaderboard.tsx` and `GameHistory.tsx` to use Shadcn `Table`.
    - [x] Sub-task: Adjust column visibility/layout for mobile screens (hide less critical columns).
    - [x] Sub-task: Add subtle row hover effects and clean header styling.
- [x] Task: Chart Styling (ebf8996)
    - [x] Sub-task: Update `recharts` configuration to match the new color palette (including dark mode support).
- [ ] Task: Conductor - User Manual Verification 'Dashboards & Data Display' (Protocol in workflow.md)

## Phase 4: Feedback & Interactivity [checkpoint: 27c62b9]
- [x] Task: Loading States & Transitions (ebf8996)
    - [x] Sub-task: Replace text loaders with Skeleton components in key areas (Profile, Dashboard).
    - [x] Sub-task: Add page transitions using `framer-motion` (simple fade/slide).
- [x] Task: Notifications & Error Handling (2b825a5)
    - [x] Sub-task: Audit all `sonner` toasts for consistent styling and clear messaging.
    - [x] Sub-task: Ensure error boundaries have a polished "Oops" state.
- [ ] Task: Conductor - User Manual Verification 'Feedback & Interactivity' (Protocol in workflow.md)
