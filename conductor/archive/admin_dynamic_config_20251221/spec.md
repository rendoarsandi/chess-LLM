# Track Spec: Admin Auth & Dynamic LLM Configuration

## Overview

This track introduces administrative authentication using BetterAuth to allow a designated administrator to dynamically add, configure, and activate LLM model IDs and API keys. This moves the project away from purely hardcoded configurations while maintaining them as a fallback/baseline.

## Functional Requirements

### 1. Administrative Authentication

- **Provider:** BetterAuth with Email/Password.
- **Access Control:** Restricted to a single admin email address defined via environment variables (`ADMIN_EMAIL`).
- **Persistence:** Auth state managed via BetterAuth's SQLite adapter.

### 2. Dynamic Model Management

- **Database Schema:** New `llm_configurations` table to store:
  - Provider (Gemini, Groq, etc.)
  - Model ID (e.g., `gemini-1.5-pro`)
  - API Key (Encrypted or stored as reference to env keys)
  - Active Status (Boolean)
  - Source (Hardcoded vs. User-Added)
- **Multi-Provider Support:** Initial support for Gemini and Groq, architected for future OpenRouter integration.

### 3. Model Prioritization & Activation

- **Explicit Selection:** Both hardcoded models and user-added models are listed in the admin interface.
- **Activation Logic:** Only models marked as "Active" by the admin will be available for selection in the Game Arena or used by the Game Loop.

### 4. User Interface

- **Admin Settings Page (`/admin/settings`):** A centralized dashboard to add new models, manage API keys, and toggle model activation.
- **Sidebar Integration:** A "Settings" or "Admin" link visible in the sidebar (conditionally shown or always present but protected).
- **Profile Page Enhancements:** "Edit Configuration" button on LLM profile pages, visible only to the authenticated admin, linking to the settings for that specific model.

## Non-Functional Requirements

- **Security:** API keys must be handled securely (not exposed in the frontend, potentially encrypted in the DB).
- **Local-First Consistency:** Ensure the background `GameLoopService` respects the "Active" status and dynamic configurations stored in the database.

## Acceptance Criteria

- [ ] Admin can log in via GitHub OAuth.
- [ ] Non-admin users (or unauthorized emails) are denied access to admin routes.
- [ ] Admin can add a new Model ID and API Key for Gemini/Groq.
- [ ] Admin can toggle the "Active" status of any model (hardcoded or dynamic).
- [ ] The Game Loop only uses models that are currently marked as "Active".
- [ ] The UI correctly reflects whether a model is hardcoded or dynamically added.

## Out of Scope

- Public user accounts or non-admin roles.
- Automatic model discovery or benchmarking (manual entry only).
- Deleting hardcoded models (they can only be deactivated).
