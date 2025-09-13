import { useState } from 'react';
import { type City, type UnitType } from '@shared/schema';
import { UNIT_TYPES } from '@/lib/game-logic';
import { Plus, X, Settings } from 'lucide-react';

interface ProductionPanelProps {
  selectedCity: City | null;
  onProduceUnit: (cityId: string, unitType: UnitType) => void;
  onSetDefaultProduction: (cityId: string, unitType: UnitType | null) => void;
  onAddToQueue: (cityId: string, unitType: UnitType) => void;
  onRemoveFromQueue: (cityId: string, index: number) => void;
  isProducing: boolean;
  humanCities: City[];
}

export default function ProductionPanel({ selectedCity, onProduceUnit, onSetDefaultProduction, onAddToQueue, onRemoveFromQueue, isProducing, humanCities }: ProductionPanelProps) {
  const [showQueueManager, setShowQueueManager] = useState(false);
  
  const handleProduceUnit = (unitType: UnitType) => {
    if (!selectedCity) return;
    onProduceUnit(selectedCity.id, unitType);
  };

  const canAfford = (unitType: UnitType) => {
    const cost = UNIT_TYPES[unitType].cost;
    return humanCities.length >= cost;
  };

  return (
    <div className="retro-panel p-4 rounded">
      <h3 className="text-lg font-bold text-terminal mb-3">PRODUCTION</h3>
      <div className="space-y-2">
        <div className="flex justify-between items-center text-sm">
          <span>Selected City:</span>
          <span data-testid="selected-city" className="text-secondary">
            {selectedCity ? `(${selectedCity.x},${selectedCity.y})` : 'None'}
          </span>
        </div>
        {/* Current Production Status */}
        {selectedCity?.currentProduction && (
          <div className="bg-secondary/20 p-3 rounded mb-4">
            <div className="text-sm font-medium text-secondary mb-1">Currently Producing:</div>
            <div className="flex items-center justify-between">
              <span className="text-primary font-bold">
                {selectedCity.currentProduction.toUpperCase()}
              </span>
              <span className="text-xs text-muted-foreground">
                {selectedCity.productionProgress || 0} / {UNIT_TYPES[selectedCity.currentProduction].productionTime} turns
              </span>
            </div>
            <div className="w-full bg-background rounded-full h-2 mt-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ 
                  width: `${((selectedCity.productionProgress || 0) / UNIT_TYPES[selectedCity.currentProduction].productionTime) * 100}%` 
                }}
              />
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {UNIT_TYPES[selectedCity.currentProduction].productionTime - (selectedCity.productionProgress || 0)} turns remaining
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 mt-4">
          {(Object.entries(UNIT_TYPES) as [UnitType, any][]).map(([unitType, stats]) => (
            <button
              key={unitType}
              data-testid={`produce-${unitType}`}
              className="retro-button p-2 text-xs rounded disabled:opacity-50"
              data-unit={unitType}
              disabled={!selectedCity || !canAfford(unitType) || isProducing || !!selectedCity?.currentProduction}
              onClick={() => handleProduceUnit(unitType)}
            >
              <div className="text-center">
                <div>{unitType.toUpperCase()}</div>
                <div className="text-[10px] text-muted-foreground">
                  {stats.productionTime}T • {stats.cost}C
                </div>
              </div>
            </button>
          ))}
        </div>
        <div className="text-xs text-muted-foreground mt-2">
          T = turns to produce, C = cities required
        </div>
        
        {/* Production Queue Management */}
        {selectedCity && (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Production Queue</span>
              <button
                data-testid="toggle-queue-manager"
                onClick={() => setShowQueueManager(!showQueueManager)}
                className="text-xs text-secondary hover:text-primary"
              >
                <Settings size={16} />
              </button>
            </div>
            
            {/* Current Default Production */}
            {selectedCity.defaultProduction && (
              <div className="text-xs text-secondary mb-2">
                Default: {selectedCity.defaultProduction.toUpperCase()}
              </div>
            )}
            
            {/* Production Queue Display */}
            {selectedCity.productionQueue && selectedCity.productionQueue.length > 0 && (
              <div className="text-xs space-y-1 mb-2">
                <div className="text-muted-foreground">Queue:</div>
                {selectedCity.productionQueue.map((unitType, index) => (
                  <div key={index} className="flex items-center justify-between bg-secondary/20 px-2 py-1 rounded">
                    <span>{unitType.toUpperCase()}</span>
                    <button
                      data-testid={`remove-queue-${index}`}
                      onClick={() => onRemoveFromQueue(selectedCity.id, index)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            {/* Queue Management UI */}
            {showQueueManager && (
              <div className="space-y-2">
                <div className="text-xs font-medium text-secondary">Set Default Production:</div>
                <div className="grid grid-cols-2 gap-1">
                  {(Object.entries(UNIT_TYPES) as [UnitType, any][]).map(([unitType, stats]) => (
                    <button
                      key={`default-${unitType}`}
                      data-testid={`set-default-${unitType}`}
                      className="retro-button p-1 text-xs rounded disabled:opacity-50"
                      disabled={!canAfford(unitType)}
                      onClick={() => onSetDefaultProduction(selectedCity.id, unitType)}
                    >
                      {unitType.charAt(0).toUpperCase()}
                    </button>
                  ))}
                  <button
                    data-testid="clear-default"
                    onClick={() => onSetDefaultProduction(selectedCity.id, null)}
                    className="retro-button p-1 text-xs rounded bg-red-600 hover:bg-red-700"
                  >
                    Clear
                  </button>
                </div>
                
                <div className="text-xs font-medium text-secondary mt-3">Add to Queue:</div>
                <div className="grid grid-cols-3 gap-1">
                  {(Object.entries(UNIT_TYPES) as [UnitType, any][]).map(([unitType, stats]) => (
                    <button
                      key={`queue-${unitType}`}
                      data-testid={`add-queue-${unitType}`}
                      className="retro-button p-1 text-xs rounded disabled:opacity-50"
                      disabled={!canAfford(unitType)}
                      onClick={() => onAddToQueue(selectedCity.id, unitType)}
                    >
                      <Plus size={12} className="inline mr-1" />
                      {unitType.charAt(0).toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
