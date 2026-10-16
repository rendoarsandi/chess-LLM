import { createFileRoute } from '@tanstack/react-router'
import { createRun } from '../../../server/src/api'
export const Route = createFileRoute('/api/runs')({
  server: {
    handlers: {
      GET: async ({ context }) => Response.json(await context.apiPlatform.listRuns()),
      POST: ({ request, context }) => createRun(request, context.apiPlatform, context.body),
    },
  },
})
