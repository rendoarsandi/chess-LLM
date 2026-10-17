import { createFileRoute } from '@tanstack/react-router'
import { parseArenaQuery } from '../../../server/src/api'
export const Route = createFileRoute('/api/history')({
  server: {
    handlers: {
      GET: ({ request, context }) =>
        context.apiPlatform
          .history(parseArenaQuery(new URL(request.url).searchParams))
          .then((value) => Response.json(value)),
    },
  },
})
