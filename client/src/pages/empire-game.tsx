import { useState, useEffect } from 'react';
import { useGameState } from '@/hooks/use-game-state';
import GameBoard from '@/components/game-board';
import ProductionPanel from '@/components/production-panel';
import StatusPanel from '@/components/status-panel';
import CombatModal from '@/components/combat-modal';
import { type GameState, type Unit, type City, type UnitType, type CombatResult } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';
import type { GameOptions } from '@/lib/game-logic';

export default function EmpireGame() {
  const [gameId, setGameId] = useState<string | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [selectedCityId, setSelectedCityId] = useState<string | null>(null);
  const [gameHistory, setGameHistory] = useState<string[]>([]);
  const [showCombat, setShowCombat] = useState(false);
  const [currentCombat, setCurrentCombat] = useState<CombatResult | null>(null);
  const [options, setOptions] = useState<GameOptions>({ seed: '', width: 80, height: 50, targetCities: 60 });

  const { toast } = useToast();
  
  const {
    game,
    isLoading,
    error,
    createGame,
    moveUnit,
    produceUnit,
    endTurn,
    setDefaultProduction,
    addToQueue,
    removeFromQueue,
    isCreatingGame,
    isMovingUnit,
    isProducingUnit,
    isEndingTurn,
    isSettingDefaultProduction,
    isAddingToQueue,
    isRemovingFromQueue,
    moveResult,
    endTurnResult,
    createdGame,
    createGameAsync
  } = useGameState(gameId);

  // Create game on mount with default options
  useEffect(() => {
    if (!gameId) {
      createGameAsync(options);
    }
  }, [gameId, createGameAsync]);

  // Handle game creation
  useEffect(() => {
    if (!isCreatingGame && !gameId && createdGame) {
      setGameId(createdGame.id);
      setGameHistory(['Turn 1: Game begins']);
    }
  }, [isCreatingGame, gameId, createdGame]);

  // Handle move result with combat and events
  useEffect(() => {
    if (moveResult) {
      // Add detailed events from the enhanced game logic
      if (moveResult.events && moveResult.events.length > 0) {
        setGameHistory(prev => [...prev, ...moveResult.events!]);
      }
      
      // Handle combat modal display
      if (moveResult.combat) {
        setCurrentCombat(moveResult.combat);
        setShowCombat(true);
      }
    }
  }, [moveResult]);

  // Handle end turn result events
  useEffect(() => {
    if (endTurnResult) {
      // Add production events from automatic production
      if (endTurnResult.events && endTurnResult.events.length > 0) {
        setGameHistory(prev => [...prev, ...endTurnResult.events!]);
      }
    }
  }, [endTurnResult]);

  // Handle victory conditions
  useEffect(() => {
    if (game?.gameOver && game.winner) {
      const message = game.winner === 'human' ? 'Victory! You have conquered the empire!' : 'Defeat! Your empire has fallen!';
      toast({
        title: game.winner === 'human' ? 'Victory!' : 'Defeat!',
        description: message,
        duration: 5000,
      });
    }
  }, [game?.gameOver, game?.winner, toast]);

  if (isLoading || !game) {
    return (
      <div className="min-h-screen bg-background text-foreground font-mono flex items-center justify-center">
        <div className="text-terminal text-xl">Initializing Empire...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background text-foreground font-mono flex items-center justify-center">
        <div className="text-red-500 text-xl">Error loading game: {error.message}</div>
      </div>
    );
  }

  const gameState: GameState = {
    turn: game.turn,
    currentPlayer: game.currentPlayer as any,
    gridData: game.gridData as any,
    units: game.units as any,
    cities: game.cities as any,
    fogOfWar: game.fogOfWar as any,
    gameOver: game.gameOver,
    winner: game.winner as any,
  };

  // Derive selectedCity from current game state to ensure fresh data
  const selectedCity = selectedCityId ? gameState.cities.find(c => c.id === selectedCityId) || null : null;

  const handleCellClick = (x: number, y: number) => {
    console.log(`Cell clicked at (${x}, ${y})`);
    
    // Clear previous selections
    setSelectedUnit(null);
    setSelectedCityId(null);

    // Check for unit selection
    const unit = gameState.units.find(u => u.x === x && u.y === y && u.owner === 'human');
    const city = gameState.cities.find(c => c.x === x && c.y === y && c.owner === 'human');

    console.log(`Found unit:`, unit);
    console.log(`Found city:`, city);

    if (city) {
      console.log(`Selecting city:`, city);
      setSelectedCityId(city.id);
    } else if (unit) {
      console.log(`Selecting unit:`, unit);
      setSelectedUnit(unit);
    } else if (selectedUnit) {
      // Try to move selected unit (events will be handled by the enhanced API response)
      console.log(`Moving unit ${selectedUnit.id} to (${x}, ${y})`);
      moveUnit({ unitId: selectedUnit.id, targetX: x, targetY: y });
    }
  };

  const handleProduceUnit = (cityId: string, unitType: UnitType) => {
    produceUnit({ cityId, unitType });
    const city = gameState.cities.find(c => c.id === cityId);
    if (city) {
      setGameHistory(prev => [...prev, `Turn ${gameState.turn}: ${unitType} produced at (${city.x},${city.y})`]);
    }
  };

  const handleSetDefaultProduction = (cityId: string, unitType: UnitType | null) => {
    setDefaultProduction({ cityId, unitType });
  };

  const handleAddToQueue = (cityId: string, unitType: UnitType) => {
    addToQueue({ cityId, unitType });
  };

  const handleRemoveFromQueue = (cityId: string, index: number) => {
    removeFromQueue({ cityId, index });
  };

  const handleEndTurn = () => {
    endTurn();
    // Reset unit moves will be handled server-side
    // Production events will be handled by endTurnResult useEffect
    setSelectedUnit(null);
    setSelectedCityId(null);
  };

  const humanCities = gameState.cities.filter(c => c.owner === 'human');
  const humanUnits = gameState.units.filter(u => u.owner === 'human');

  return (
    <div className="bg-background text-foreground font-mono min-h-screen">
      {/* Game Header */}
      <div className="status-bar p-4">
        <div className="flex justify-between items-center max-w-none w-full">
          <div className="flex items-center space-x-6">
            <h1 className="text-2xl font-bold text-terminal">EMPIRE 1977</h1>
            <div className="text-sm text-muted-foreground">
              Turn: <span data-testid="turn-counter" className="text-secondary">{gameState.turn}</span>
            </div>
            <div className="text-sm text-muted-foreground">
              Player: <span data-testid="current-player" className="text-terminal">{gameState.currentPlayer}</span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-xs">
              <input
                className="retro-input w-32 px-2 py-1"
                placeholder="Seed"
                value={String(options.seed ?? '')}
                onChange={(e) => setOptions((o) => ({ ...o, seed: e.target.value }))}
              />
              <input
                className="retro-input w-16 px-2 py-1"
                type="number"
                min={20}
                max={200}
                value={options.width}
                onChange={(e) => setOptions((o) => ({ ...o, width: Number(e.target.value) }))}
                title="Width"
              />
              <input
                className="retro-input w-16 px-2 py-1"
                type="number"
                min={15}
                max={200}
                value={options.height}
                onChange={(e) => setOptions((o) => ({ ...o, height: Number(e.target.value) }))}
                title="Height"
              />
              <input
                className="retro-input w-20 px-2 py-1"
                type="number"
                min={4}
                max={200}
                value={options.targetCities}
                onChange={(e) => setOptions((o) => ({ ...o, targetCities: Number(e.target.value) }))}
                title="Cities"
              />
              <button
                className="retro-button px-3 py-1 text-xs rounded"
                onClick={async () => {
                  // Start a new game with current options
                  const created = await createGameAsync(options);
                  if (created?.id) {
                    setGameId(created.id);
                    setGameHistory(['Turn 1: Game begins']);
                    setSelectedUnit(null);
                    setSelectedCityId(null);
                  }
                }}
              >NEW GAME</button>
            </div>
            <div className="text-sm text-muted-foreground">
              Cities: <span data-testid="city-count" className="text-secondary">{humanCities.length}</span>
            </div>
            <div className="text-sm text-muted-foreground">
              Units: <span data-testid="unit-count" className="text-secondary">{humanUnits.length}</span>
            </div>
            <button 
              data-testid="end-turn-btn"
              className="retro-button px-4 py-2 text-primary-foreground text-sm rounded disabled:opacity-50"
              onClick={handleEndTurn}
              disabled={isEndingTurn || gameState.gameOver}
            >
              {isEndingTurn ? 'ENDING...' : 'END TURN'}
            </button>
          </div>
        </div>
      </div>

      <div className="flex max-w-none w-full overflow-hidden">
        {/* Left Sidebar - Game Controls */}
        <div className="w-80 shrink-0 p-4 space-y-4">
          <ProductionPanel
            selectedCity={selectedCity}
            onProduceUnit={handleProduceUnit}
            onSetDefaultProduction={handleSetDefaultProduction}
            onAddToQueue={handleAddToQueue}
            onRemoveFromQueue={handleRemoveFromQueue}
            isProducing={isProducingUnit}
            humanCities={humanCities}
          />
        </div>

        {/* Game Board */}
        <div className="flex-1 min-w-0 p-4 overflow-hidden">
          <GameBoard
            gameState={gameState}
            selectedUnit={selectedUnit}
            selectedCity={selectedCity}
            onCellClick={handleCellClick}
          />
        </div>

        {/* Right Sidebar - Game Status */}
        <StatusPanel
          gameState={gameState}
          selectedUnit={selectedUnit}
          gameHistory={gameHistory}
        />
      </div>

      {/* Combat Modal */}
      <CombatModal
        isOpen={showCombat}
        combat={currentCombat}
        onClose={() => {
          setShowCombat(false);
          setCurrentCombat(null);
        }}
      />
    </div>
  );
}
