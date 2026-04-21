import * as schema from './schema'
import { AppSQLiteDatabase } from './driver'

export type AppDatabase = AppSQLiteDatabase<typeof schema>
export type GenericDatabase = AppSQLiteDatabase<Record<string, unknown>>
