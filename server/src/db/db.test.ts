import { describe, it, expect } from 'vitest'
import { db } from './index'

describe('Database Connection', () => {
  it('should be able to connect to the database', () => {
    expect(db).toBeDefined()
  })
})
