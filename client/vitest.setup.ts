import "@testing-library/jest-dom";
import { vi } from 'vitest';

// Mock Worker for JSDOM
if (typeof window !== 'undefined' && !window.Worker) {
  window.Worker = class {
    onmessage: ((e: MessageEvent) => void) | null = null;
    postMessage = vi.fn();
    terminate = vi.fn();
    addEventListener = vi.fn();
    removeEventListener = vi.fn();
    dispatchEvent = vi.fn();
  } as any; // eslint-disable-line @typescript-eslint/no-explicit-any
}
