import { betterAuth } from 'better-auth'
import { getNativeSqliteClient } from '../db'

export const auth = betterAuth({
  database: getNativeSqliteClient(),
  emailAndPassword: {
    enabled: true,
  },
})
