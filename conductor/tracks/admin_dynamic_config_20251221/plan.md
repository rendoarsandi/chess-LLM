# Implementation Plan - Admin Auth & Dynamic LLM Configuration

## Phase 1: Database & Backend Foundation
- [x] Task: Create `llm_configurations` table schema with Drizzle (Provider, ModelID, APIKey, IsActive, IsHardcoded) [0c42a03]
- [x] Task: Implement BetterAuth server-side setup with Email/Password and SQLite [e93b8b5]
- [x] Task: Implement Admin Middleware in Hono to restrict access by `ADMIN_EMAIL` [06b2640]
- [ ] Task: Create CRUD API endpoints for `llm_configurations` (GET /api/admin/models, POST /api/admin/models, PATCH /api/admin/models/:id)
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Database & Backend Foundation' (Protocol in workflow.md)

## Phase 2: Frontend Auth & Routing
- [ ] Task: Initialize BetterAuth client in the React frontend
- [ ] Task: Create `AdminLogin` component and handle GitHub OAuth redirect
- [ ] Task: Create `ProtectedRoute` component for React Router to guard admin paths
- [ ] Task: Define admin routes in `App.tsx` (e.g., `/admin/settings`)
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Frontend Auth & Routing' (Protocol in workflow.md)

## Phase 3: Admin Management UI
- [ ] Task: Develop `/admin/settings` dashboard with model list and "Add New Model" form
- [ ] Task: Implement "Active/Inactive" toggle for models in the dashboard
- [ ] Task: Add "Admin Settings" link to the `Sidebar` (conditionally visible)
- [ ] Task: Add "Edit Configuration" shortcut on individual Model Profile pages
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Admin Management UI' (Protocol in workflow.md)

## Phase 4: Integration & System Sync
- [ ] Task: Update `PlayerService` to load and instantiate players based on active database configurations
- [ ] Task: Update `GameLoopService` to filter candidate players by their "Active" status in the DB
- [ ] Task: Ensure hardcoded models are automatically registered/synced in the `llm_configurations` table on startup
- [ ] Task: End-to-end verification: Add new model -> Activate -> Verify it enters the game loop
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Integration & System Sync' (Protocol in workflow.md)
