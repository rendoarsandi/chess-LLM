import { createFileRoute } from '@tanstack/react-router'
import { parseArenaQuery } from '../../../server/src/api'
export const Route = createFileRoute('/api/leaderboard')({
  server: {
    handlers: {
      GET: ({ request, context }) =>
        context.apiPlatform
          .leaderboard(parseArenaQuery(new URL(request.url).searchParams))
          .then((value) => Response.json(value)),
    },
  },
})
