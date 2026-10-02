import type { DurableObjectStorage } from '@cloudflare/workers-types'
import type { Database } from '../storage/database'

export function durableDatabase(storage: DurableObjectStorage): Database {
  return {
    query<T>(sql: string, ...values: (string | number | null)[]) {
      return storage.sql.exec(sql, ...values).toArray() as T[]
    },
    transaction: (operation) => storage.transactionSync(operation),
  }
}
