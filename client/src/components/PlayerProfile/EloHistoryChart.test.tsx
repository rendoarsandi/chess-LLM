import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EloHistoryChart } from './EloHistoryChart';

// Mock api
vi.mock('@/api', () => ({
  getEloHistory: vi.fn(() => Promise.resolve([
    { rating: 1200, createdAt: new Date().toISOString() },
    { rating: 1250, createdAt: new Date().toISOString() },
  ])),
}));

// Mock ResizeObserver for ResponsiveContainer
vi.stubGlobal('ResizeObserver', vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
})));

describe('EloHistoryChart', () => {
  it('renders rating progression title', () => {
    render(<EloHistoryChart playerId="p1" />);
    expect(screen.getByText(/Rating Progression/i)).toBeDefined();
  });

  it('renders period buttons', () => {
    render(<EloHistoryChart playerId="p1" />);
    expect(screen.getByText('7D')).toBeDefined();
    expect(screen.getByText('30D')).toBeDefined();
    expect(screen.getByText('90D')).toBeDefined();
    expect(screen.getByText('ALL')).toBeDefined();
  });
});
