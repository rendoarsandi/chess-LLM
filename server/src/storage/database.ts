export type SqlValue = string | number | null
export interface Database {
  query<T>(sql: string, ...values: SqlValue[]): T[]
  transaction<T>(operation: () => T): T
}
