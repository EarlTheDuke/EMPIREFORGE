import { useEffect, useMemo, useRef, useState } from 'react';
import { type GameState, type Unit, type City } from '@shared/schema';
import { UNIT_TYPES } from '@/lib/game-logic';
import Minimap from '@/components/minimap';

interface GameBoardProps {
  gameState: GameState;
  selectedUnit: Unit | null;
  selectedCity: City | null;
  onCellClick: (x: number, y: number) => void;
}

export default function GameBoard({ gameState, selectedUnit, selectedCity, onCellClick }: GameBoardProps) {
  const gridRef = useRef<HTMLDivElement | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const baseCell = 24;
  const cellSize = Math.max(12, Math.min(48, Math.round(baseCell * zoom)));
  const gridWidth = useMemo(() => (gameState.gridData[0]?.length ?? 0), [gameState.gridData]);
  const gridHeight = useMemo(() => gameState.gridData.length, [gameState.gridData]);
  const contentWidth = gridWidth * cellSize;
  const contentHeight = gridHeight * cellSize;

  const handleZoomIn = () => setZoom((z) => Math.min(2.5, +(z + 0.1).toFixed(2)));
  const handleZoomOut = () => setZoom((z) => Math.max(0.5, +(z - 0.1).toFixed(2)));
  const handleZoomReset = () => setZoom(1);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!gridRef.current) return;
      const el = gridRef.current;
      const pan = Math.max(20, Math.round(cellSize * 2));
      switch (e.key) {
        case '+':
        case '=':
        case 'Add':
          e.preventDefault();
          handleZoomIn();
          break;
        case '-':
        case 'Subtract':
          e.preventDefault();
          handleZoomOut();
          break;
        case '0':
          e.preventDefault();
          handleZoomReset();
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault();
          el.scrollLeft = Math.max(0, el.scrollLeft - pan);
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault();
          el.scrollLeft = Math.min(el.scrollWidth, el.scrollLeft + pan);
          break;
        case 'ArrowUp':
        case 'w':
        case 'W':
          e.preventDefault();
          el.scrollTop = Math.max(0, el.scrollTop - pan);
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          e.preventDefault();
          el.scrollTop = Math.min(el.scrollHeight, el.scrollTop + pan);
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cellSize]);

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
        style={{ width: `${cellSize}px`, height: `${cellSize}px` }}
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
            data-testid={`unit-${unit.owner}-${unit.type}-${x}-${y}`}
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
          <button
            data-testid="pan-left"
            onClick={() => {
              const el = gridRef.current;
              if (!el) return;
              const pan = Math.max(50, Math.round(cellSize * 8));
              el.scrollLeft = Math.max(0, el.scrollLeft - pan);
            }}
            className="retro-button px-3 py-1 text-xs rounded"
          >
            ◀
          </button>
          <button data-testid="zoom-out" onClick={handleZoomOut} className="retro-button px-3 py-1 text-xs rounded">-</button>
          <span className="text-sm text-muted-foreground px-2">Zoom</span>
          <button data-testid="zoom-in" onClick={handleZoomIn} className="retro-button px-3 py-1 text-xs rounded">+</button>
          <button data-testid="zoom-reset" onClick={handleZoomReset} className="retro-button px-3 py-1 text-xs rounded">Reset</button>
          <button
            data-testid="pan-right"
            onClick={() => {
              const el = gridRef.current;
              if (!el) return;
              const pan = Math.max(50, Math.round(cellSize * 8));
              el.scrollLeft = Math.min(el.scrollWidth, el.scrollLeft + pan);
            }}
            className="retro-button px-3 py-1 text-xs rounded"
          >
            ▶
          </button>
        </div>
      </div>
      
      <div className="w-full overflow-x-auto overflow-y-auto border-2 border-border bg-background max-h-[60vh]" ref={gridRef}>
        <div 
          data-testid="game-grid"
          className="grid gap-0"
          style={{ gridTemplateColumns: `repeat(${gridWidth}, ${cellSize}px)` }}
        >
          {Array.from({ length: gridHeight }, (_, y) =>
            Array.from({ length: gridWidth }, (_, x) => renderCell(x, y))
          )}
        </div>
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

      <div className="mt-2">
        <Minimap 
          gameState={gameState}
          gridWidth={gridWidth}
          gridHeight={gridHeight}
          contentWidth={contentWidth}
          contentHeight={contentHeight}
          scrollContainerRef={gridRef}
        />
      </div>
    </div>
  );
}
