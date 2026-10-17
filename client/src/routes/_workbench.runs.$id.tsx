import { createFileRoute } from '@tanstack/react-router'
import { RunsPage } from '../App'

export const Route = createFileRoute('/_workbench/runs/$id')({
  component: RunsPage,
  validateSearch: (search: Record<string, unknown>): { match?: string } => ({
    match:
      typeof search.match === 'string' && search.match.length <= 100 ? search.match : undefined,
  }),
})
