import '@testing-library/jest-dom'
import { vi, beforeAll, afterAll } from 'vitest'
import React from 'react'

// Store original console.error to use for actual test failures if needed
const originalConsoleError = console.error

beforeAll(() => {
  // Silence standard console methods to reduce noise
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'info').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'debug').mockImplementation(() => {})

  // Conditionally silence console.error.
  vi.spyOn(console, 'error').mockImplementation((...args) => {
    const message = args[0]?.toString() || ''

    // List of known "noise" messages we want to ignore
    const noisePatterns = [
      'ERR_INVALID_URL',
      '/stockfish/stockfish.js',
      'Failed to parse URL',
      'Fetch failed',
    ]

    const isNoise = noisePatterns.some((pattern) => message.includes(pattern))

    if (!isNoise) {
      // It's a real error! Let's show it.
      originalConsoleError(...args)
    }
  })

  // Mock global fetch to handle local Stockfish URLs and prevent ERR_INVALID_URL noise
  global.fetch = vi.fn().mockImplementation((url) => {
    if (typeof url === 'string' && url.includes('stockfish')) {
      return Promise.resolve({
        ok: true,
        text: () => Promise.resolve('// Mock Stockfish Worker content'),
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
      })
    }
    return Promise.reject(new Error(`Fetch failed for ${url}`))
  })
})

afterAll(() => {
  vi.restoreAllMocks()
})

// Mock Worker for JSDOM
if (typeof window !== 'undefined' && !window.Worker) {
  window.Worker = class {
    onmessage: ((e: MessageEvent) => void) | null = null
    onerror: ((e: ErrorEvent) => void) | null = null
    onmessageerror: ((e: MessageEvent) => void) | null = null
    postMessage = vi.fn()
    terminate = vi.fn()
    addEventListener = vi.fn()
    removeEventListener = vi.fn()
    dispatchEvent = vi.fn()
  } as unknown as typeof Worker
}

// Global mocks to optimize test runtime
vi.mock('framer-motion', () => ({
  motion: {
    div: React.forwardRef(({ children, ...props }: any, ref: any) =>
      React.createElement('div', { ...props, ref }, children)
    ),
    span: React.forwardRef(({ children, ...props }: any, ref: any) =>
      React.createElement('span', { ...props, ref }, children)
    ),
  },
  AnimatePresence: ({ children }: any) => children,
}))

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => children,
  LineChart: ({ children }: any) => children,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
}))

vi.mock('react-chessboard', () => ({
  Chessboard: () => React.createElement('div', { 'data-testid': 'mock-chessboard' }, 'Chessboard'),
}))


