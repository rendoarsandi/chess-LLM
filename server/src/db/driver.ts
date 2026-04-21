import { BetterSQLiteSession } from 'drizzle-orm/better-sqlite3/session'
import { DefaultLogger } from 'drizzle-orm/logger'
import { createTableRelationsHelpers, extractTablesRelationalConfig } from 'drizzle-orm/relations'
import type { ExtractTablesWithRelations, RelationalSchemaConfig } from 'drizzle-orm/relations'
import { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core/db'
import { SQLiteSyncDialect } from 'drizzle-orm/sqlite-core/dialect'
import type { DrizzleConfig } from 'drizzle-orm/utils'
import type { Database as BetterSqliteDatabase } from 'better-sqlite3'
import type { SqliteClient, SqliteRunResult } from './sqlite'

export class AppSQLiteDatabase<
  TSchema extends Record<string, unknown> = Record<string, never>,
> extends BaseSQLiteDatabase<'sync', SqliteRunResult, TSchema> {}

export function createDrizzleDatabase<TSchema extends Record<string, unknown> = Record<string, never>>(
  client: SqliteClient,
  config: DrizzleConfig<TSchema> = {},
) {
  const dialect = new SQLiteSyncDialect({ casing: config.casing })
  let logger

  if (config.logger === true) {
    logger = new DefaultLogger()
  } else if (config.logger !== false) {
    logger = config.logger
  }

  let relationalSchema: RelationalSchemaConfig<ExtractTablesWithRelations<TSchema>> | undefined
  if (config.schema) {
    const tablesConfig = extractTablesRelationalConfig(config.schema, createTableRelationsHelpers)
    relationalSchema = {
      fullSchema: config.schema,
      schema: tablesConfig.tables,
      tableNamesMap: tablesConfig.tableNamesMap,
    } as RelationalSchemaConfig<ExtractTablesWithRelations<TSchema>>
  }

  const session = new BetterSQLiteSession<TSchema, ExtractTablesWithRelations<TSchema>>(
    client as unknown as BetterSqliteDatabase,
    dialect,
    relationalSchema,
    { logger },
  )
  const db = new AppSQLiteDatabase<TSchema>('sync', dialect, session, relationalSchema)

  return Object.assign(db, { $client: client })
}
