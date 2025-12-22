import "@testing-library/jest-dom";
import { vi, beforeAll } from 'vitest';

beforeAll(() => {
  // Silence standard console methods to reduce noise
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'info').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'debug').mockImplementation(() => {})
})

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
