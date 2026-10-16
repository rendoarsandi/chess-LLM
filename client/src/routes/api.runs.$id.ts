import { createFileRoute } from '@tanstack/react-router'
import { findRun, notFound } from '../../../server/src/api'
export const Route = createFileRoute('/api/runs/$id')({
  server: {
    handlers: {
      GET: async ({ context, params }) => {
        const run = await findRun(context.apiPlatform, params.id)
        return run ? Response.json(run) : notFound()
      },
    },
  },
})
