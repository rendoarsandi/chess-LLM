import { createFileRoute } from '@tanstack/react-router'
export const Route = createFileRoute('/api/models')({
  server: {
    handlers: {
      GET: async ({ context }) => Response.json(await context.apiPlatform.listModels()),
    },
  },
})
