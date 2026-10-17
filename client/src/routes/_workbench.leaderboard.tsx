import { createFileRoute } from '@tanstack/react-router'
import { LeaderboardPage } from '../GlobalResults'
import { arenaSearch } from '../../../shared/arena'
export const Route = createFileRoute('/_workbench/leaderboard')({
  component: LeaderboardPage,
  validateSearch: arenaSearch,
})
