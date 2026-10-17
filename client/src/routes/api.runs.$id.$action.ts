import { createFileRoute } from '@tanstack/react-router'
import { findRun, notFound } from '../../../server/src/api'
export const Route = createFileRoute('/api/runs/$id/$action')({
  server: {
    handlers: {
      POST: async ({ context, params }) => {
        if (params.action === 'mcp-credentials') {
          if (!(await findRun(context.apiPlatform, params.id))) return notFound()
          return Response.json(await context.apiPlatform.issueMcpCredentials(params.id))
        }
        if (!['pause', 'resume', 'cancel'].includes(params.action))
          return Response.json({ error: 'Unknown run action.' }, { status: 404 })
        if (!(await findRun(context.apiPlatform, params.id))) return notFound()
        return Response.json(
          await context.apiPlatform.command(
            params.id,
            params.action as 'pause' | 'resume' | 'cancel',
          ),
        )
      },
    },
  },
})
