import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { PlayerProfile } from './PlayerProfile';
import { BrowserRouter } from 'react-router';

// Mock api
vi.mock('@/api', () => ({
  getPlayerProfile: vi.fn(() => new Promise(() => {})), // Never resolves to show loading
}));

// Mock authClient
vi.mock('@/lib/auth-client', () => ({
  authClient: {
    useSession: vi.fn(() => ({ data: null })),
  },
}));

describe('PlayerProfile', () => {
  it('shows loading state initially', () => {
    const { container } = render(
      <BrowserRouter>
        <PlayerProfile playerId="p1" onBack={vi.fn()} />
      </BrowserRouter>
    );
    // Should have skeletons
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });
});