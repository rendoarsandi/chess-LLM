import { createFileRoute } from '@tanstack/react-router'
import { findRun, notFound } from '../../../server/src/api'
export const Route = createFileRoute('/api/runs/$id/live')({
  server: {
    handlers: {
      GET: async ({ request, context, params }) => {
        const platform = context.apiPlatform
        if (!(await findRun(platform, params.id))) return notFound()
        return platform.live
          ? platform.live(params.id, request)
          : Response.json(
              { error: 'Use a WebSocket connection for live updates.' },
              { status: 426 },
            )
      },
    },
  },
})
