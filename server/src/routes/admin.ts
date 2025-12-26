import { Hono } from 'hono'
import { adminMiddleware } from '../middleware/admin'
import { llmConfigService } from '../db/llm_config'
import { TournamentService } from '../game/tournament.service'

export const adminRoutes = (tournamentService: TournamentService) => {
  const admin = new Hono()
  admin.use('*', adminMiddleware)

  admin.get('/models', async (c) => {
    const configs = await llmConfigService.getAllConfigs()
    return c.json(configs)
  })

  admin.post('/models', async (c) => {
    const body = await c.req.json()
    const config = await llmConfigService.createConfig(body)
    return c.json(config, 201)
  })

  admin.patch('/models/:id', async (c) => {
    const id = parseInt(c.req.param('id'))
    const body = await c.req.json()
    const config = await llmConfigService.updateConfig(id, body)
    if (!config) return c.json({ error: 'Not found' }, 404)
    return c.json(config)
  })

  admin.delete('/models/:id', async (c) => {
    const id = parseInt(c.req.param('id'))
    const result = await llmConfigService.deleteConfig(id)
    if (!result) return c.json({ error: 'Not found' }, 404)
    return c.json({ success: true })
  })

  admin.post('/tournaments', async (c) => {
    const body = await c.req.json()
    const { name, startTime, totalRounds, timeControlSettings, participantIds } = body
    
    try {
      const tournament = await tournamentService.createTournament({
        name,
        startTime: new Date(startTime),
        totalRounds,
        timeControlSettings
      })
      
      // Register participants
      for (const pid of participantIds) {
        await tournamentService.registerParticipant(tournament.id, pid)
      }
      
      return c.json(tournament, 201)
    } catch (e) {
      return c.json({ error: (e as Error).message }, 400)
    }
  })

  return admin
}
