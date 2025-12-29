import { db } from './index'
import { llmConfigurations } from './schema'
import { eq } from 'drizzle-orm'
import { encrypt } from '../lib/crypto'

export type LLMConfig = typeof llmConfigurations.$inferSelect
export type NewLLMConfig = typeof llmConfigurations.$inferInsert

export const llmConfigService = {
  async getAllConfigs() {
    return db.select().from(llmConfigurations)
  },

  async getConfigById(id: number) {
    const [config] = await db.select().from(llmConfigurations).where(eq(llmConfigurations.id, id))
    return config
  },

  async createConfig(config: NewLLMConfig) {
    const encryptedConfig = { ...config }
    if (encryptedConfig.apiKey) {
      encryptedConfig.apiKey = encrypt(encryptedConfig.apiKey)
    }
    const [result] = await db.insert(llmConfigurations).values(encryptedConfig).returning()
    return result
  },

  async updateConfig(id: number, config: Partial<NewLLMConfig>) {
    const encryptedConfig = { ...config }
    if (encryptedConfig.apiKey) {
      encryptedConfig.apiKey = encrypt(encryptedConfig.apiKey)
    }
    const [result] = await db
      .update(llmConfigurations)
      .set({ ...encryptedConfig, updatedAt: new Date() })
      .where(eq(llmConfigurations.id, id))
      .returning()
    return result
  },

  async deleteConfig(id: number) {
    const [result] = await db
      .delete(llmConfigurations)
      .where(eq(llmConfigurations.id, id))
      .returning()
    return result
  },
}
