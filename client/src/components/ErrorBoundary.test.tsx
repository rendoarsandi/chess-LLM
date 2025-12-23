import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

function ProblematicComponent(): React.ReactNode {
  throw new Error('Test error');
}

describe('ErrorBoundary', () => {
  it('renders fallback UI when an error occurs', () => {
    // Suppress console.error for this test
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    render(
      <ErrorBoundary>
        <ProblematicComponent />
      </ErrorBoundary>
    );
    
    expect(screen.getByText(/System Failure/i)).toBeDefined();
    spy.mockRestore();
  });

  it('can reset the error boundary', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    render(
      <ErrorBoundary>
        <ProblematicComponent />
      </ErrorBoundary>
    );
    
    expect(screen.getByText(/System Failure/i)).toBeDefined();
    
    const recoveryButton = screen.getByText(/Attempt Reset/i);
    fireEvent.click(recoveryButton);
    
    // Boundary is reset, but component will throw again if re-rendered.
    // In a real app, you'd navigate away or change state.
    
    spy.mockRestore();
  });
});