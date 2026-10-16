import { createFileRoute } from '@tanstack/react-router'
import { apiMiddleware } from '../api-middleware'
export const Route = createFileRoute('/api')({ server: { middleware: [apiMiddleware] } })
