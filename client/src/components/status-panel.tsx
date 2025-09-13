import { useState } from 'react';
import { type GameState, type Unit } from '@shared/schema';
import { UNIT_TYPES } from '@/lib/game-logic';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface StatusPanelProps {
  gameState: GameState;
  selectedUnit: Unit | null;
  gameHistory: string[];
}

export default function StatusPanel({ gameState, selectedUnit, gameHistory }: StatusPanelProps) {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const humanCities = gameState.cities.filter(c => c.owner === 'human');
  const humanUnits = gameState.units.filter(u => u.owner === 'human');
  const humanArmies = humanUnits.filter(u => u.type === 'army');
  const humanNaval = humanUnits.filter(u => u.type !== 'army');

  return (
    <div className="w-80 p-4 space-y-4">
      {/* Unit Info Panel */}
      <div className="retro-panel p-4 rounded">
        <h3 className="text-lg font-bold text-terminal mb-3">UNIT INFO</h3>
        <div data-testid="unit-info" className="text-sm space-y-2">
          {selectedUnit ? (
            <>
              <div><strong>{selectedUnit.type.toUpperCase()}</strong></div>
              <div>Position: ({selectedUnit.x}, {selectedUnit.y})</div>
              <div>Movement: {selectedUnit.moves}/{UNIT_TYPES[selectedUnit.type].movement}</div>
              <div>Combat Power: {UNIT_TYPES[selectedUnit.type].combat}</div>
              <div>Owner: {selectedUnit.owner}</div>
            </>
          ) : (
            <div className="text-muted-foreground">Select a unit to view details</div>
          )}
        </div>
      </div>

      {/* Player Status */}
      <div className="retro-panel p-4 rounded">
        <h3 className="text-lg font-bold text-terminal mb-3">EMPIRE STATUS</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Cities Controlled:</span>
            <span data-testid="player-cities" className="text-secondary">{humanCities.length}</span>
          </div>
          <div className="flex justify-between">
            <span>Army Units:</span>
            <span data-testid="army-count" className="text-secondary">{humanArmies.length}</span>
          </div>
          <div className="flex justify-between">
            <span>Naval Units:</span>
            <span data-testid="naval-count" className="text-secondary">{humanNaval.length}</span>
          </div>
          <div className="flex justify-between">
            <span>Production/Turn:</span>
            <span data-testid="production-rate" className="text-secondary">{humanCities.length}</span>
          </div>
        </div>
      </div>

      {/* Victory Conditions */}
      <div className="retro-panel p-4 rounded">
        <h3 className="text-lg font-bold text-terminal mb-3">OBJECTIVES</h3>
        <div className="text-sm space-y-2">
          <div className="text-muted-foreground">Victory Conditions:</div>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>Capture all enemy cities</li>
            <li>Eliminate all enemy units</li>
            <li>Control 75% of total cities</li>
          </ul>
          <div className="mt-3 text-muted-foreground">
            Total Cities on Map: <span className="text-secondary">{gameState.cities.length}</span>
          </div>
        </div>
      </div>

      {/* Game History */}
      <Collapsible open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <div className="retro-panel p-4 rounded">
          <CollapsibleTrigger className="w-full flex items-center justify-between text-left" data-testid="toggle-history">
            <h3 className="text-lg font-bold text-terminal">GAME HISTORY</h3>
            <span className="text-terminal hover:text-secondary">
              {isHistoryOpen ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
            </span>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div data-testid="game-history" className="text-xs space-y-1 max-h-40 overflow-y-auto mt-3 pr-2">
              {gameHistory.length > 0 ? (
                gameHistory.map((entry: string, index: number) => (
                  <div key={index} className="border-l-2 border-secondary/30 pl-2 py-1">
                    {entry}
                  </div>
                ))
              ) : (
                <div className="text-muted-foreground">Turn 1: Game begins</div>
              )}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    </div>
  );
}
