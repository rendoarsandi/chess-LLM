# Plan: Mobile-Responsive & Compact Arena Menu

This plan outlines the steps to refactor the ChessLLM frontend for a superior mobile experience, focusing on a collapsible sidebar, a responsive arena layout, and compact UI elements.

## Phase 1: Navigation & Sidebar Refactoring
Goal: Implement a collapsible sidebar that defaults to a slim view on mobile.

- [x] Task: Add `isSidebarCollapsed` state to `App.tsx` and implement toggle logic. 8b7193e
- [x] Task: Refactor Navigation Sidebar in `App.tsx` to support `w-20` (expanded) and `w-12` (collapsed) states with smooth transitions. 8b7193e
- [x] Task: Ensure sidebar labels are only visible in expanded state and use Tooltips or clean icons in collapsed state. 8b7193e
- [ ] Task: Conductor - User Manual Verification 'Navigation & Sidebar Refactoring' (Protocol in workflow.md)

## Phase 2: Responsive Advantage Bar & Board
Goal: Ensure the board and advantage bar adapt to mobile screen constraints.

- [x] Task: Modify `AdvantageBar.tsx` to support a `horizontal` orientation prop. dc13f92
- [x] Task: Update `AdvantageBar.tsx` styles to handle horizontal layout (thinner bar, labels side-by-side). dc13f92
- [x] Task: Update `App.tsx` to pass the `orientation` prop to `AdvantageBar` based on screen size (using a `useMediaQuery` hook or CSS breakpoints). dc13f92
- [x] Task: Adjust `ChessboardContainer` and its wrapper in `App.tsx` for better responsive sizing (max-width constraints). dc13f92
- [ ] Task: Conductor - User Manual Verification 'Responsive Advantage Bar & Board' (Protocol in workflow.md)

## Phase 3: Arena Layout Stacking & Collapsible Sections
Goal: Implement the single-column stack and collapsible component containers for mobile.

- [x] Task: Refactor the main grid in `App.tsx` to use a single column on mobile and the 4-column layout on `lg` screens. 20073c5
- [x] Task: Create a `CollapsibleSection` wrapper component (or use a simple state-based toggle) for the Thinking Panel, Move List, and Arena Controls. 20073c5
- [x] Task: Implement "Thinking Panel" truncation logic in `ThinkingPanel.tsx` for mobile view. 20073c5
- [x] Task: Reorder elements for mobile: Board -> Controls -> Thinking -> Move List -> Arena Settings. 20073c5
- [ ] Task: Conductor - User Manual Verification 'Arena Layout Stacking & Collapsible Sections' (Protocol in workflow.md)

## Phase 4: Global View Refinement & Final Polish
Goal: Ensure all other views (Leaderboard, Profiles, History) are mobile-optimized.

- [x] Task: Audit and fix responsiveness issues in `Leaderboard.tsx` (table overflow). b4d4dc1
- [x] Task: Audit and fix responsiveness issues in `PlayerProfile.tsx` (chart and stat card stacking). b4d4dc1
- [x] Task: Audit and fix responsiveness issues in `GameHistory.tsx`. b4d4dc1
- [x] Task: Final CSS polish for spacing, font sizes, and touch targets across the app. b4d4dc1
- [ ] Task: Conductor - User Manual Verification 'Global View Refinement & Final Polish' (Protocol in workflow.md)
