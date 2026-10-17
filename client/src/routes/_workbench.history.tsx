import { createFileRoute } from '@tanstack/react-router'
import { HistoryPage } from '../GlobalResults'
import { arenaSearch } from '../../../shared/arena'
export const Route = createFileRoute('/_workbench/history')({
  component: HistoryPage,
  validateSearch: arenaSearch,
})
