import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAnalysisWorker } from './useAnalysisWorker';
import { AnalysisWorker } from '../lib/stockfish/AnalysisWorker';
import * as api from '../api';

vi.mock('../lib/stockfish/AnalysisWorker', () => {
  return {
    AnalysisWorker: vi.fn().mockImplementation(function() {
      return {
        analyzePosition: vi.fn().mockResolvedValue({ bestMove: 'e2e4', pvs: [{ multipv: 1, depth: 20, cp: 50, pv: 'e2e4' }] }),
        terminate: vi.fn()
      };
    })
  };
});

vi.mock('../api', () => ({
  claimJob: vi.fn(),
  getMoves: vi.fn(),
  sendHeartbeat: vi.fn(),
  updateProgress: vi.fn(),
  submitResults: vi.fn()
}));

describe('useAnalysisWorker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize AnalysisWorker when enabled', () => {
    renderHook(() => useAnalysisWorker(true));
    expect(AnalysisWorker).toHaveBeenCalled();
  });

  it('should not initialize AnalysisWorker when disabled', () => {
    renderHook(() => useAnalysisWorker(false));
    expect(AnalysisWorker).not.toHaveBeenCalled();
  });

  it('should claim a job and process it', async () => {
    const mockJob = { id: 'rev-1', gameId: 'game-1', status: 'processing' as const, progressCurrent: 0, progressTotal: 0 };
    vi.mocked(api.claimJob).mockResolvedValue(mockJob);
    vi.mocked(api.getMoves).mockResolvedValue([
      { id: 1, gameId: 'game-1', moveNumber: 1, move: 'e4', fen: '...', playerColor: 'white' }
    ]);
    vi.mocked(api.submitResults).mockResolvedValue({ success: true });

    renderHook(() => useAnalysisWorker(true));

    await vi.waitFor(() => {
      expect(api.claimJob).toHaveBeenCalled();
      expect(api.getMoves).toHaveBeenCalledWith('game-1');
      expect(api.submitResults).toHaveBeenCalled();
    }, { timeout: 2000 });
  });
});
