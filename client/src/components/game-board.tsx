import { type GameState, type Unit, type City } from '@shared/schema';
import { UNIT_TYPES } from '@/lib/game-logic';

interface GameBoardProps {
  gameState: GameState;
  selectedUnit: Unit | null;
  selectedCity: City | null;
  onCellClick: (x: number, y: number) => void;
}

export default function GameBoard({ gameState, selectedUnit, selectedCity, onCellClick }: GameBoardProps) {
  const renderCell = (x: number, y: number) => {
    const isHidden = gameState.fogOfWar[y][x];
    const terrain = gameState.gridData[y][x];
    const unit = gameState.units.find(u => u.x === x && u.y === y);
    const city = gameState.cities.find(c => c.x === x && c.y === y);
    const isSelected = (selectedUnit && selectedUnit.x === x && selectedUnit.y === y) ||
                      (selectedCity && selectedCity.x === x && selectedCity.y === y);

    let cellClasses = 'grid-cell';
    
    if (isHidden) {
      cellClasses += ' fog';
    } else {
      cellClasses += ` ${terrain}`;
    }
    
    if (isSelected) {
      cellClasses += ' selected';
    }

    return (
      <div
        key={`${x}-${y}`}
        className={cellClasses}
        data-x={x}
        data-y={y}
        data-testid={`grid-cell-${x}-${y}`}
        onClick={() => onCellClick(x, y)}
      >
        {!isHidden && city && (
          <div 
            className="city-icon"
            style={{
              backgroundColor: city.owner === 'human' ? 'var(--terminal)' : 
                              city.owner === 'ai' ? '#ef4444' : 'var(--secondary)'
            }}
          />
        )}
        {!isHidden && unit && (
          <div 
            className="unit-icon"
            style={{
              color: unit.owner === 'ai' ? '#ef4444' : 'var(--terminal)'
            }}
          >
            {UNIT_TYPES[unit.type].symbol}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="retro-panel p-4 rounded">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-terminal">TACTICAL MAP</h3>
        <div className="flex space-x-2">
          <button data-testid="zoom-out" className="retro-button px-3 py-1 text-xs rounded">-</button>
          <span className="text-sm text-muted-foreground px-2">Zoom</span>
          <button data-testid="zoom-in" className="retro-button px-3 py-1 text-xs rounded">+</button>
        </div>
      </div>
      
      <div 
        data-testid="game-grid"
        className="grid gap-0 bg-background border-2 border-border overflow-auto max-h-96" 
        style={{ gridTemplateColumns: 'repeat(20, 1fr)' }}
      >
        {Array.from({ length: 15 }, (_, y) =>
          Array.from({ length: 20 }, (_, x) => renderCell(x, y))
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-yellow-500 rounded"></div>
          <span>Cities</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-terminal rounded"></div>
          <span>Your Units</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-red-500 rounded"></div>
          <span>Enemy Units</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4" style={{ background: 'hsl(60 20% 20%)' }}></div>
          <span>Land</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4" style={{ background: 'hsl(220 50% 15%)' }}></div>
          <span>Water</span>
        </div>
      </div>
    </div>
  );
}
