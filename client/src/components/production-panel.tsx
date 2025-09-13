import { type City, type UnitType } from '@shared/schema';
import { UNIT_TYPES } from '@/lib/game-logic';

interface ProductionPanelProps {
  selectedCity: City | null;
  onProduceUnit: (cityId: string, unitType: UnitType) => void;
  isProducing: boolean;
  humanCities: City[];
}

export default function ProductionPanel({ selectedCity, onProduceUnit, isProducing, humanCities }: ProductionPanelProps) {
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
        <div className="grid grid-cols-2 gap-2 mt-4">
          {(Object.entries(UNIT_TYPES) as [UnitType, any][]).map(([unitType, stats]) => (
            <button
              key={unitType}
              data-testid={`produce-${unitType}`}
              className="retro-button p-2 text-xs rounded disabled:opacity-50"
              data-unit={unitType}
              disabled={!selectedCity || !canAfford(unitType) || isProducing}
              onClick={() => handleProduceUnit(unitType)}
            >
              {unitType.toUpperCase()} ({stats.cost})
            </button>
          ))}
        </div>
        <div className="text-xs text-muted-foreground mt-2">
          Production cost = number of cities required
        </div>
      </div>
    </div>
  );
}
