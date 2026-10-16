import { createFileRoute } from '@tanstack/react-router'
import { findRun } from '../../../server/src/api'
export const Route = createFileRoute('/api/runs/$id/matches/$matchId/attempts')({
  server: {
    handlers: {
      GET: async ({ context, params }) => {
        const run = await findRun(context.apiPlatform, params.id)
        if (!run?.matches.some((match) => match.id === params.matchId))
          return Response.json({ error: 'Match not found.' }, { status: 404 })
        return Response.json(await context.apiPlatform.attempts(params.id, params.matchId))
      },
    },
  },
})
