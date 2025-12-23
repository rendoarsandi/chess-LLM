# Implementation Plan - WebSocket Game Updates [checkpoint: 5757f34]

## Phase 1: Backend WebSocket Implementation
- [x] Task: Install `@hono/node-ws` dependency in `server/`. 3d9e8f7
- [x] Task: Create `server/src/game/socket.service.ts` to handle WebSocket logic (connections, room management, broadcasting). 98cbbee
- [x] Task: Integrate `socket.service.ts` into the main Hono app in `server/src/index.ts` and configure the WebSocket route upgrade. 6964f54
- [x] Task: Update `GameLoopService` (`server/src/game/game-loop.service.ts`) to emit "Move Made" and "Game Over" events to `socket.service.ts`. 0c06e14
- [x] Task: Update `GameManager` (`server/src/game/game-manager.ts`) to emit "Game Started" events. 12bf9c7
- [x] Task: Add test coverage for `socket.service.ts` (mocking the WebSocket connection). 98cbbee
- [x] Task: Conductor - User Manual Verification 'Backend WebSocket Implementation' (Protocol in workflow.md) a50a128

## Phase 2: Frontend WebSocket Integration
- [x] Task: Create a custom hook `client/src/hooks/useGameSocket.ts` to manage WebSocket connection, joining rooms, and handling events. 7c8d916
- [x] Task: Refactor `client/src/components/Chessboard.tsx` to use `useGameSocket` instead of the polling `useQuery`. f1d3a3b
- [x] Task: Update `client/src/components/ThinkingPanel.tsx` to react to "Thinking" status events from the socket. f1d3a3b
- [x] Task: Add a "Spectator Count" display component in `client/src/components/` and integrate it into the game view. f1d3a3b
- [x] Task: Verify that `client/src/components/GameHistory.tsx` (or similar lists) still functions correctly (it might need a separate subscription or remain polling if real-time isn't critical there). f1d3a3b
- [x] Task: Add unit tests for `useGameSocket` hook. 4e50cd4
- [x] Task: Conductor - User Manual Verification 'Frontend WebSocket Integration' (Protocol in workflow.md) 5757f34

## Phase 3: System Verification & Cleanup [checkpoint: f0669d9]
- [x] Task: Remove the polling logic from `client/src/api.ts` if no longer used for game updates. 7185788
- [x] Task: Stress test: Open multiple tabs (simulated spectators) and verify the spectator count updates accurately across all. 7185788
- [x] Task: Verify reconnection logic (simulate network drop). 7185788
- [x] Task: Conductor - User Manual Verification 'System Verification & Cleanup' (Protocol in workflow.md) ee8f086
