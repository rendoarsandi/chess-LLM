import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThinkingPanel } from './ThinkingPanel';

describe('ThinkingPanel', () => {
  it('renders side player title', () => {
    render(<ThinkingPanel side="white" modelName="Gemini" />);
    expect(screen.getByText(/white Player/i)).toBeDefined();
  });

  it('renders model name', () => {
    render(<ThinkingPanel side="black" modelName="DeepThink" />);
    expect(screen.getByText('DeepThink')).toBeDefined();
  });

  it('shows thinking status when isThinking is true', () => {
    render(<ThinkingPanel side="white" modelName="Gemini" isThinking />);
    expect(screen.getByText(/Thinking/i)).toBeDefined();
  });
});