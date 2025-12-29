import { describe, it, expect } from 'vitest'
import { ClassificationEngine } from './ClassificationEngine'
import type { MoveContext } from './ClassificationEngine'

describe('ClassificationEngine', () => {
  it('should classify Best Move when it matches top engine line', () => {
    const context: MoveContext = {
      beforeEval: 0.5,
      bestMoveEval: 0.6,
      moveEval: 0.6,
      isBestMove: true,
    }
    expect(ClassificationEngine.classify(context)).toBe('best')
  })

  it('should classify Blunder when eval drops significantly from equal position', () => {
    const context: MoveContext = {
      beforeEval: 0.1,
      bestMoveEval: 0.2,
      moveEval: -2.5,
      isBestMove: false,
    }
    expect(ClassificationEngine.classify(context)).toBe('blunder')
  })

  it('should classify Inaccuracy for minor centipawn loss', () => {
    const context: MoveContext = {
      beforeEval: 0.5,
      bestMoveEval: 0.6,
      moveEval: 0.2,
      isBestMove: false,
    }
    expect(ClassificationEngine.classify(context)).toBe('inaccuracy')
  })

  it('should classify Mistake for moderate centipawn loss', () => {
    const context: MoveContext = {
      beforeEval: 0.5,
      bestMoveEval: 0.6,
      moveEval: -0.3,
      isBestMove: false,
    }
    expect(ClassificationEngine.classify(context)).toBe('mistake')
  })

  it('should classify Brilliant for a "sacrifice" that is good', () => {
    // Brilliant move heuristic:
    // 1. Must be the best engine move.
    // 2. Must involve a material sacrifice (as identified by the engine).
    // 3. Must maintain or improve the evaluation (centipawn loss <= 0.2).
    const context: MoveContext = {
      beforeEval: -0.5,
      bestMoveEval: 1.2,
      moveEval: 1.2,
      isBestMove: true,
      isSacrifice: true,
    }
    expect(ClassificationEngine.classify(context)).toBe('brilliant')
  })

  it('should classify Excellent for very minor cp loss', () => {
    const context: MoveContext = {
      beforeEval: 0.5,
      bestMoveEval: 0.6,
      moveEval: 0.55,
      isBestMove: false,
    }
    expect(ClassificationEngine.classify(context)).toBe('excellent')
  })

  it('should classify Good for moderate cp loss', () => {
    const context: MoveContext = {
      beforeEval: 0.5,
      bestMoveEval: 0.6,
      moveEval: 0.4,
      isBestMove: false,
    }
    expect(ClassificationEngine.classify(context)).toBe('good')
  })

  it('should classify Book move', () => {
    const context: MoveContext = {
      beforeEval: 0.3,
      bestMoveEval: 0.3,
      moveEval: 0.3,
      isBestMove: true,
      isBookMove: true,
    }
    expect(ClassificationEngine.classify(context)).toBe('book')
  })

  it('should classify Miss when winning move is missed', () => {
    const context: MoveContext = {
      beforeEval: 2.5,
      bestMoveEval: 5.0,
      moveEval: 0.4,
      isBestMove: false,
    }
    expect(ClassificationEngine.classify(context)).toBe('miss')
  })
})
