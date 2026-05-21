import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getGames,
  getGame,
  getMoves,
  createGame,
  deleteGame,
  pauseGame,
  resumeGame,
  getPlayers,
  getLeaderboard,
} from '../api'

export function useGamesQuery() {
  return useQuery({
    queryKey: ['games'],
    queryFn: getGames,
    staleTime: 5000,
    refetchOnWindowFocus: true,
  })
}

export function useGameQuery(id: string | undefined) {
  return useQuery({
    queryKey: ['game', id],
    queryFn: () => getGame(id!),
    enabled: !!id,
    staleTime: 2000,
    refetchOnWindowFocus: true,
  })
}

export function useMovesQuery(gameId: string | undefined) {
  return useQuery({
    queryKey: ['moves', gameId],
    queryFn: () => getMoves(gameId!),
    enabled: !!gameId,
    staleTime: 1000,
  })
}

export function usePlayersQuery() {
  return useQuery({
    queryKey: ['players'],
    queryFn: getPlayers,
    staleTime: 10000,
  })
}

export function useLeaderboardQuery() {
  return useQuery({
    queryKey: ['leaderboard'],
    queryFn: getLeaderboard,
    staleTime: 10000,
    refetchOnWindowFocus: true,
  })
}

export function useCreateGameMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (args: { whitePlayerId: string; blackPlayerId: string; variant?: string }) =>
      createGame(args.whitePlayerId, args.blackPlayerId, { variant: args.variant }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['games'] })
      queryClient.invalidateQueries({ queryKey: ['game', data.id] })
    },
  })
}

export function useDeleteGameMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteGame(id),
    onSuccess: (_, gameId) => {
      queryClient.invalidateQueries({ queryKey: ['games'] })
      queryClient.invalidateQueries({ queryKey: ['game', gameId] })
      queryClient.removeQueries({ queryKey: ['game', gameId] })
      queryClient.removeQueries({ queryKey: ['moves', gameId] })
    },
  })
}

export function usePauseGameMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => pauseGame(id),
    onSuccess: (_, gameId) => {
      queryClient.invalidateQueries({ queryKey: ['game', gameId] })
      queryClient.invalidateQueries({ queryKey: ['games'] })
    },
  })
}

export function useResumeGameMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => resumeGame(id),
    onSuccess: (_, gameId) => {
      queryClient.invalidateQueries({ queryKey: ['game', gameId] })
      queryClient.invalidateQueries({ queryKey: ['games'] })
    },
  })
}
