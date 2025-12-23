# Implementation Plan - UI/UX Polish

## Phase 1: Foundation & Navigation [ ]
- [x] Task: Set up Design Tokens & Global Styles (Tailwind Config) (b7c3128)
    - [x] Sub-task: Audit and define consistent colors, typography, and spacing in `tailwind.config.js`.
    - [x] Sub-task: Define global styles for light/dark mode variables in `index.css`.
- [x] Task: Sidebar & Layout Architecture (35db6e4)
    - [x] Sub-task: Refactor `Sidebar.tsx` to use Shadcn `Sheet` (or similar) for mobile drawer.
    - [x] Sub-task: Ensure active state styling for navigation links.
    - [x] Sub-task: Fix layout container to prevent content overlap on mobile.
- [ ] Task: Conductor - User Manual Verification 'Foundation & Navigation' (Protocol in workflow.md)

## Phase 2: Game Board & Core Controls [ ]
- [ ] Task: Board Responsiveness
    - [ ] Sub-task: Fix `Chessboard` and `AnalysisBoard` container sizing to be fully responsive.
    - [ ] Sub-task: Ensure piece animation performance is optimal.
- [ ] Task: Control Panel Polish
    - [ ] Sub-task: Style "Start", "Stop", "Analysis" buttons with consistent Shadcn variants and icons.
    - [ ] Sub-task: Implement `ThinkingPanel` improvements (smooth scrolling/text appearance).
- [ ] Task: Conductor - User Manual Verification 'Game Board & Core Controls' (Protocol in workflow.md)

## Phase 3: Dashboards & Data Display [ ]
- [ ] Task: Leaderboard & History Tables
    - [ ] Sub-task: Refactor `Leaderboard.tsx` and `GameHistory.tsx` to use Shadcn `Table`.
    - [ ] Sub-task: Adjust column visibility/layout for mobile screens (hide less critical columns).
    - [ ] Sub-task: Add subtle row hover effects and clean header styling.
- [ ] Task: Chart Styling
    - [ ] Sub-task: Update `recharts` configuration to match the new color palette (including dark mode support).
- [ ] Task: Conductor - User Manual Verification 'Dashboards & Data Display' (Protocol in workflow.md)

## Phase 4: Feedback & Interactivity [ ]
- [ ] Task: Loading States & Transitions
    - [ ] Sub-task: Replace text loaders with Skeleton components in key areas (Profile, Dashboard).
    - [ ] Sub-task: Add page transitions using `framer-motion` (simple fade/slide).
- [ ] Task: Notifications & Error Handling
    - [ ] Sub-task: Audit all `sonner` toasts for consistent styling and clear messaging.
    - [ ] Sub-task: Ensure error boundaries have a polished "Oops" state.
- [ ] Task: Conductor - User Manual Verification 'Feedback & Interactivity' (Protocol in workflow.md)
