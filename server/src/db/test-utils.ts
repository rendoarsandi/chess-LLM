import * as schema from './schema'
import { createDrizzleDatabase } from './driver'
import { createSqliteClient } from './sqlite'

export function createInMemoryDb() {
  const sqlite = createSqliteClient(':memory:')
  const db = createDrizzleDatabase<typeof schema>(sqlite, { schema })

  return { sqlite, db }
}
