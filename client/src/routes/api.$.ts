import { createFileRoute } from '@tanstack/react-router'
export const Route = createFileRoute('/api/$')({
  server: {
    handlers: {
      ANY: () => Response.json({ error: 'Endpoint not found.' }, { status: 404 }),
    },
  },
})
