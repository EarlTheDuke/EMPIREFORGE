import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { type Game, type GameState, type CombatResult, type UnitType } from '@shared/schema';

export function useGameState(gameId: string | null) {
  const queryClient = useQueryClient();

  const gameQuery = useQuery({
    queryKey: ['/api/games', gameId],
    enabled: !!gameId,
  });

  const createGameMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/games');
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/games'] });
      queryClient.setQueryData(['/api/games', data.id], data);
    },
  });

  const moveUnitMutation = useMutation({
    mutationFn: async ({ unitId, targetX, targetY }: { unitId: string; targetX: number; targetY: number }) => {
      const response = await apiRequest('POST', `/api/games/${gameId}/move`, {
        gameId: gameId!,
        unitId,
        targetX,
        targetY,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/games', gameId] });
    },
  });

  const produceUnitMutation = useMutation({
    mutationFn: async ({ cityId, unitType }: { cityId: string; unitType: UnitType }) => {
      const response = await apiRequest('POST', `/api/games/${gameId}/produce`, {
        gameId: gameId!,
        cityId,
        unitType,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/games', gameId] });
    },
  });

  const endTurnMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/games/${gameId}/end-turn`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/games', gameId] });
    },
  });

  return {
    game: gameQuery.data as Game | undefined,
    isLoading: gameQuery.isLoading,
    error: gameQuery.error,
    createGame: createGameMutation.mutate,
    moveUnit: moveUnitMutation.mutate,
    produceUnit: produceUnitMutation.mutate,
    endTurn: endTurnMutation.mutate,
    isCreatingGame: createGameMutation.isPending,
    isMovingUnit: moveUnitMutation.isPending,
    isProducingUnit: produceUnitMutation.isPending,
    isEndingTurn: endTurnMutation.isPending,
    moveResult: moveUnitMutation.data as { game: Game; combat?: CombatResult } | undefined,
    createdGame: createGameMutation.data as Game | undefined,
  };
}
