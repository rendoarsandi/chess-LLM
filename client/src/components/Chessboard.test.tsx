import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChessboardContainer } from './Chessboard';

describe('ChessboardContainer', () => {
  it('renders with correct data-testid', () => {
    render(<ChessboardContainer />);
    expect(screen.getByTestId('chess-board-container')).toBeDefined();
  });

  it('applies responsive classes', () => {
    render(<ChessboardContainer />);
    const container = screen.getByTestId('chess-board-container');
    // It should have w-full and some max-width
    expect(container.className).toContain('w-full');
  });
});
