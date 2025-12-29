# Implementation Plan - Admin Auth & Dynamic LLM Configuration

## Phase 1: Database & Backend Foundation [checkpoint: 2cc4a04]

- [x] Task: Create `llm_configurations` table schema with Drizzle (Provider, ModelID, APIKey, IsActive, IsHardcoded) [0c42a03]
- [x] Task: Implement BetterAuth server-side setup with Email/Password and SQLite [e93b8b5]
- [x] Task: Implement Admin Middleware in Hono to restrict access by `ADMIN_EMAIL` [06b2640]
- [x] Task: Create CRUD API endpoints for `llm_configurations` (GET /api/admin/models, POST /api/admin/models, PATCH /api/admin/models/:id) [99c554c]
- [x] Task: Conductor - User Manual Verification 'Phase 1: Database & Backend Foundation' (Protocol in workflow.md) [2cc4a04]

## Phase 2: Frontend Auth & Routing [checkpoint: 5622a6d]

- [x] Task: Initialize BetterAuth client in the React frontend [2f2fce0]
- [x] Task: Create `AdminLogin` component and handle Email/Password login [a23c034]
- [x] Task: Create `ProtectedRoute` component for React Router to guard admin paths [16b8419]
- [x] Task: Define admin routes in `App.tsx` (e.g., `/admin/settings`) [5e64ff0]
- [x] Task: Conductor - User Manual Verification 'Phase 2: Frontend Auth & Routing' (Protocol in workflow.md) [5622a6d]

## Phase 3: Admin Management UI [checkpoint: 171e7f4]

- [x] Task: Develop `/admin/settings` dashboard with model list and "Add New Model" form [90755b1]
- [x] Task: Implement "Active/Inactive" toggle for models in the dashboard [90755b1]
- [x] Task: Add "Admin Settings" link to the `Sidebar` (conditionally visible) [90755b1]
- [x] Task: Add "Edit Configuration" shortcut on individual Model Profile pages [90755b1]
- [x] Task: Conductor - User Manual Verification 'Phase 3: Admin Management UI' (Protocol in workflow.md) [171e7f4]

## Phase 4: Integration & System Sync [checkpoint: 7b6417e]

- [x] Task: Update `PlayerService` to load and instantiate players based on active database configurations [54e805c]
- [x] Task: Update `GameLoopService` to filter candidate players by their "Active" status in the DB [54e805c]
- [x] Task: Ensure hardcoded models are automatically registered/synced in the `llm_configurations` table on startup [54e805c]
- [x] Task: End-to-end verification: Add new model -> Activate -> Verify it enters the game loop [54e805c]
- [x] Task: Conductor - User Manual Verification 'Phase 4: Integration & System Sync' (Protocol in workflow.md) [7b6417e]
