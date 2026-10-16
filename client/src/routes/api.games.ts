import { createFileRoute } from '@tanstack/react-router'
import { gameCatalogue } from '../../../server/src/api'
export const Route = createFileRoute('/api/games')({
  server: {
    handlers: {
      GET: () => Response.json(gameCatalogue()),
    },
  },
})
