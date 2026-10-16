import { createFileRoute } from '@tanstack/react-router'
import { findRun, notFound } from '../../../server/src/api'
export const Route = createFileRoute('/api/runs/$id/export')({
  server: {
    handlers: {
      GET: async ({ context, params }) =>
        (await findRun(context.apiPlatform, params.id))
          ? context.apiPlatform.exportRun(params.id)
          : notFound(),
    },
  },
})
