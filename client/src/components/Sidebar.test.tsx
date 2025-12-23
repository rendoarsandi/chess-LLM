import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Sidebar } from './Sidebar';
import { BrowserRouter } from 'react-router';
import { authClient } from '@/lib/auth-client';
import { vi } from 'vitest';

// Mock api
vi.mock('@/api', () => ({
  getTournaments: vi.fn(() => Promise.resolve([])),
}));

describe('Sidebar Component', () => {
  it('renders logo', () => {
    render(
      <BrowserRouter>
        <Sidebar isCollapsed={false} setIsCollapsed={() => {}} />
      </BrowserRouter>
    );
    expect(screen.getByText('C')).toBeDefined();
  });

  it('renders navigation links', () => {
    render(
      <BrowserRouter>
        <Sidebar isCollapsed={false} setIsCollapsed={() => {}} />
      </BrowserRouter>
    );
    expect(screen.getByText('ARENA')).toBeDefined();
    expect(screen.getByText('LEADERBOARD')).toBeDefined();
  });

  it('shows toggle button on desktop but not when mobile prop is true', () => {
    const { rerender } = render(
      <BrowserRouter>
        <Sidebar isCollapsed={false} setIsCollapsed={() => {}} />
      </BrowserRouter>
    );
    expect(screen.queryByLabelText('Toggle Sidebar')).toBeDefined();

    rerender(
      <BrowserRouter>
        <Sidebar isCollapsed={false} setIsCollapsed={() => {}} mobile />
      </BrowserRouter>
    );
    expect(screen.queryByLabelText('Toggle Sidebar')).toBeNull();
  });
});
