import { type GameState, type Unit, type City, type UnitType, type CombatResult } from "@shared/schema";
import { nanoid } from "nanoid";

export const UNIT_TYPES = {
  army: { symbol: 'A', cost: 1, movement: 1, combat: 1, productionTime: 1 },
  transport: { symbol: 'T', cost: 3, movement: 2, combat: 0, productionTime: 2 },
  destroyer: { symbol: 'D', cost: 5, movement: 2, combat: 2, productionTime: 3 },
  fighter: { symbol: 'F', cost: 6, movement: 4, combat: 2, productionTime: 3 },
  submarine: { symbol: 'S', cost: 8, movement: 3, combat: 3, productionTime: 4 },
  cruiser: { symbol: 'C', cost: 12, movement: 2, combat: 4, productionTime: 5 },
  carrier: { symbol: 'R', cost: 15, movement: 2, combat: 1, productionTime: 5 },
  battleship: { symbol: 'B', cost: 20, movement: 1, combat: 5, productionTime: 6 },
  nuclear: { symbol: 'N', cost: 30, movement: 1, combat: 8, productionTime: 8 }
};

// Seeded RNG helpers
type RNG = () => number;

function mulberry32(seedNumber: number): RNG {
  let state = seedNumber >>> 0;
  return function() {
    state |= 0;
    state = state + 0x6D2B79F5 | 0;
    let t = Math.imul(state ^ state >>> 15, 1 | state);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function hashSeedToNumber(seed: string | number | undefined): number {
  if (seed === undefined) return Math.floor(Math.random() * 2 ** 31);
  if (typeof seed === 'number') return seed;
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export type GameOptions = {
  width?: number;
  height?: number;
  targetCities?: number;
  seed?: string | number;
};

const DEFAULT_OPTIONS: Required<Pick<GameOptions, 'width' | 'height' | 'targetCities'>> = {
  width: 80,
  height: 50,
  targetCities: 60,
};

export function generateInitialGameState(options?: GameOptions): GameState {
  const width = Math.max(20, Math.min(200, options?.width ?? DEFAULT_OPTIONS.width));
  const height = Math.max(15, Math.min(200, options?.height ?? DEFAULT_OPTIONS.height));
  const targetCities = Math.max(4, Math.min(200, options?.targetCities ?? DEFAULT_OPTIONS.targetCities));
  const rng: RNG = mulberry32(hashSeedToNumber(options?.seed));

  const gridData = generateMap(width, height, rng);
  const cities = placeCities(gridData, targetCities, rng);
  const units = placeStartingUnits(cities);
  const fogOfWar = initializeFogOfWar(width, height);
  
  // Reveal area around human starting city
  const humanCity = cities.find(c => c.owner === 'human');
  if (humanCity) {
    revealArea(fogOfWar, humanCity.x, humanCity.y, 2);
  }

  return {
    turn: 1,
    currentPlayer: 'human',
    gridData,
    units,
    cities,
    fogOfWar,
    gameOver: false,
  };
}

function generateMap(width: number, height: number, rng: RNG): ('water' | 'land')[][] {
  const grid: ('water' | 'land')[][] = [];

  // Initialize all as water
  for (let y = 0; y < height; y++) {
    grid[y] = [];
    for (let x = 0; x < width; x++) {
      grid[y][x] = 'water';
    }
  }

  // Generate islands scaled by area (aim ~35-45% land)
  const area = width * height;
  const baseIslands = Math.round(area / 400);
  const numIslands = Math.max(6, Math.min(24, baseIslands + Math.floor(rng() * 4) - 1));
  for (let i = 0; i < numIslands; i++) {
    generateIsland(grid, rng);
  }

  return grid;
}

function generateIsland(grid: ('water' | 'land')[][], rng: RNG): void {
  const height = grid.length;
  const width = grid[0].length;
  const centerX = Math.floor(rng() * width);
  const centerY = Math.floor(rng() * height);
  const size = 3 + Math.floor(rng() * 7);

  for (let dy = -size; dy <= size; dy++) {
    for (let dx = -size; dx <= size; dx++) {
      const x = centerX + dx;
      const y = centerY + dy;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (x >= 0 && x < width && y >= 0 && y < height && 
          distance <= size && rng() > distance / size * 0.6) {
        grid[y][x] = 'land';
      }
    }
  }
}

function placeCities(gridData: ('water' | 'land')[][], targetCities: number, rng: RNG): City[] {
  const landTiles = [];
  const height = gridData.length;
  const width = gridData[0].length;
  
  // Find all land tiles
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (gridData[y][x] === 'land') {
        landTiles.push({ x, y });
      }
    }
  }

  // Shuffle land tiles deterministically
  for (let i = landTiles.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [landTiles[i], landTiles[j]] = [landTiles[j], landTiles[i]];
  }

  // Place ~targetCities with minimum spacing
  const minSpacing = 3; // Euclidean distance >= 3
  const desired = Math.min(targetCities, landTiles.length);
  const cities: City[] = [];

  for (let idx = 0; idx < landTiles.length && cities.length < desired; idx++) {
    const tile = landTiles[idx];
    const tooClose = cities.some(c => {
      const dx = c.x - tile.x;
      const dy = c.y - tile.y;
      return Math.sqrt(dx * dx + dy * dy) < minSpacing;
    });
    if (tooClose) continue;
    const i = cities.length;
    cities.push({
      id: nanoid(),
      x: tile.x,
      y: tile.y,
      owner: i === 0 ? 'human' : (i === 1 ? 'ai' : 'neutral'),
      production: 1,
      productionProgress: 0,
      currentProduction: undefined
    });
  }

  return cities;
}

function placeStartingUnits(cities: City[]): Unit[] {
  const units: Unit[] = [];
  
  // Human starting army
  const humanCity = cities.find(c => c.owner === 'human');
  if (humanCity) {
    units.push({
      id: nanoid(),
      x: humanCity.x,
      y: humanCity.y,
      type: 'army',
      owner: 'human',
      moves: 1
    });
  }

  // AI starting army
  const aiCity = cities.find(c => c.owner === 'ai');
  if (aiCity) {
    units.push({
      id: nanoid(),
      x: aiCity.x,
      y: aiCity.y,
      type: 'army',
      owner: 'ai',
      moves: 1
    });
  }

  return units;
}

function initializeFogOfWar(width: number, height: number): boolean[][] {
  const fogOfWar: boolean[][] = [];
  for (let y = 0; y < height; y++) {
    fogOfWar[y] = [];
    for (let x = 0; x < width; x++) {
      fogOfWar[y][x] = true; // true = hidden
    }
  }
  return fogOfWar;
}

export function revealArea(fogOfWar: boolean[][], centerX: number, centerY: number, radius: number): void {
  const height = fogOfWar.length;
  const width = fogOfWar[0].length;
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const x = centerX + dx;
      const y = centerY + dy;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (x >= 0 && x < width && y >= 0 && y < height && distance <= radius) {
        fogOfWar[y][x] = false;
      }
    }
  }
}

export function moveUnit(gameState: GameState, unitId: string, targetX: number, targetY: number): {
  success: boolean;
  error?: string;
  gameState?: GameState;
  combat?: CombatResult;
  events?: string[];
} {
  const events: string[] = [];
  const unit = gameState.units.find(u => u.id === unitId);
  if (!unit) {
    return { success: false, error: "Unit not found" };
  }

  if (unit.owner !== 'human') {
    return { success: false, error: "Can only move your own units" };
  }

  // Bounds check
  const mapHeight = gameState.gridData.length;
  const mapWidth = gameState.gridData[0].length;
  if (targetX < 0 || targetX >= mapWidth || targetY < 0 || targetY >= mapHeight) {
    return { success: false, error: "Target position is out of bounds" };
  }

  const distance = Math.abs(unit.x - targetX) + Math.abs(unit.y - targetY);
  
  // Prevent terrain hopping - restrict to single tile moves
  if (distance > 1) {
    return { success: false, error: "Can only move to adjacent tiles" };
  }

  // Check if unit has enough movement points
  if (distance > unit.moves) {
    return { success: false, error: "Unit has no moves left" };
  }

  // Check terrain constraints FIRST - attacker must be able to occupy the tile
  const isNavalUnit = (unit.type === 'transport' || unit.type === 'destroyer' || 
                       unit.type === 'submarine' || unit.type === 'cruiser' || 
                       unit.type === 'battleship');

  if (unit.type === 'army' && gameState.gridData[targetY][targetX] === 'water') {
    return { success: false, error: "Armies cannot move on water" };
  }

  if (isNavalUnit && gameState.gridData[targetY][targetX] === 'land') {
    return { success: false, error: "Naval units cannot move on land" };
  }

  // Check for any unit at destination (friendly or enemy)
  const destinationUnit = gameState.units.find(u => u.x === targetX && u.y === targetY);
  
  if (destinationUnit) {
    if (destinationUnit.owner === unit.owner) {
      return { success: false, error: "Cannot move onto friendly unit" };
    } else {
      // Combat with enemy unit (terrain already validated)
      const combat = resolveCombat(unit, destinationUnit);
      
      events.push(`Turn ${gameState.turn}: ${unit.type} (Combat: ${UNIT_TYPES[unit.type].combat}) attacks ${destinationUnit.type} (Combat: ${UNIT_TYPES[destinationUnit.type].combat}) at (${targetX},${targetY})`);
      
      if (combat.attackerWins) {
        // Remove defender
        gameState.units = gameState.units.filter(u => u.id !== destinationUnit.id);
        // Move attacker (terrain is valid)
        unit.x = targetX;
        unit.y = targetY;
        unit.moves -= distance;
        
        events.push(`Turn ${gameState.turn}: ${unit.type} defeats ${destinationUnit.type} in combat!`);
        
        // Reveal area around new position after combat victory
        revealArea(gameState.fogOfWar, targetX, targetY, 1);
        events.push(`Turn ${gameState.turn}: Fog of war cleared around (${targetX},${targetY})`);
        
        // Check for city capture after combat
        const city = gameState.cities.find(c => c.x === targetX && c.y === targetY);
        if (city && city.owner !== unit.owner) {
          city.owner = unit.owner;
          combat.capturedCity = city;
          events.push(`Turn ${gameState.turn}: ${unit.owner} captures city at (${targetX},${targetY})!`);
        }
      } else {
        // Remove attacker
        gameState.units = gameState.units.filter(u => u.id !== unit.id);
        events.push(`Turn ${gameState.turn}: ${destinationUnit.type} defeats attacking ${unit.type}!`);
      }
      
      return { success: true, gameState, combat, events };
    }
  }

  // Valid move - move unit
  unit.x = targetX;
  unit.y = targetY;
  unit.moves -= distance;
  
  events.push(`Turn ${gameState.turn}: ${unit.type} moves to (${targetX},${targetY})`);
  
  // Reveal area around new position
  revealArea(gameState.fogOfWar, targetX, targetY, 1);
  events.push(`Turn ${gameState.turn}: Fog of war cleared around (${targetX},${targetY})`);

  // Check for city capture after peaceful move
  const city = gameState.cities.find(c => c.x === targetX && c.y === targetY);
  if (city && city.owner !== unit.owner) {
    city.owner = unit.owner;
    events.push(`Turn ${gameState.turn}: ${unit.owner} captures undefended city at (${targetX},${targetY})!`);
  }

  return { success: true, gameState, events };
}

function resolveCombat(attacker: Unit, defender: Unit): CombatResult {
  // Empire's classic 50/50 combat resolution
  const attackerWins = Math.random() < 0.5;
  
  return {
    attackerWins,
    attackerUnit: attacker,
    defenderUnit: defender
  };
}

// Generic production function for any player
function produceUnitForPlayer(gameState: GameState, cityId: string, unitType: UnitType, owner: 'human' | 'ai'): {
  success: boolean;
  error?: string;
  gameState?: GameState;
} {
  const city = gameState.cities.find(c => c.id === cityId);
  if (!city) {
    return { success: false, error: "City not found" };
  }

  if (city.owner !== owner) {
    return { success: false, error: "Can only produce units in your own cities" };
  }

  const cost = UNIT_TYPES[unitType].cost;
  const ownerCities = gameState.cities.filter(c => c.owner === owner).length;
  
  // Simple production check - need enough cities for cost
  if (ownerCities < cost) {
    return { success: false, error: `Need at least ${cost} cities to produce ${unitType}` };
  }

  // Check terrain compatibility and find valid placement
  const isNavalUnit = (unitType === 'transport' || unitType === 'destroyer' || 
                       unitType === 'submarine' || unitType === 'cruiser' || 
                       unitType === 'battleship' || unitType === 'carrier');
  
  let spawnX = city.x;
  let spawnY = city.y;

  if (isNavalUnit) {
    // Naval units need water placement - check adjacent water tiles
    const adjacentWaterTiles = [];
    const mapHeight = gameState.gridData.length;
    const mapWidth = gameState.gridData[0].length;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const checkX = city.x + dx;
        const checkY = city.y + dy;
        
        if (checkX >= 0 && checkX < mapWidth && 
            checkY >= 0 && checkY < mapHeight && 
            gameState.gridData[checkY][checkX] === 'water') {
          const isOccupied = gameState.units.find(u => u.x === checkX && u.y === checkY);
          if (!isOccupied) {
            adjacentWaterTiles.push({ x: checkX, y: checkY });
          }
        }
      }
    }
    
    if (adjacentWaterTiles.length === 0) {
      return { success: false, error: "No available water tiles adjacent to city for naval unit" };
    }
    
    // Use first available water tile
    const waterTile = adjacentWaterTiles[0];
    spawnX = waterTile.x;
    spawnY = waterTile.y;
  } else {
    // Land units spawn at city or adjacent land tile
    if (gameState.gridData[city.y][city.x] !== 'land') {
      return { success: false, error: "Cannot produce land units at water cities" };
    }
    
    // Check if city tile is available, if not find adjacent land tile
    const existingUnit = gameState.units.find(u => u.x === city.x && u.y === city.y);
    if (existingUnit) {
      // Find adjacent free land tiles
      const adjacentLandTiles = [];
      const mapHeight = gameState.gridData.length;
      const mapWidth = gameState.gridData[0].length;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue; // Skip city tile itself
          
          const checkX = city.x + dx;
          const checkY = city.y + dy;
          
          if (checkX >= 0 && checkX < mapWidth && 
              checkY >= 0 && checkY < mapHeight && 
              gameState.gridData[checkY][checkX] === 'land') {
            const isOccupied = gameState.units.find(u => u.x === checkX && u.y === checkY);
            if (!isOccupied) {
              adjacentLandTiles.push({ x: checkX, y: checkY });
            }
          }
        }
      }
      
      if (adjacentLandTiles.length === 0) {
        return { success: false, error: "No available land tiles adjacent to city for unit production" };
      }
      
      // Use first available land tile
      const landTile = adjacentLandTiles[0];
      spawnX = landTile.x;
      spawnY = landTile.y;
    }
  }

  // Create new unit at valid position
  const newUnit: Unit = {
    id: nanoid(),
    x: spawnX,
    y: spawnY,
    type: unitType,
    owner: owner,
    moves: UNIT_TYPES[unitType].movement
  };

  gameState.units.push(newUnit);
  return { success: true, gameState };
}

// Human-specific production function (maintains existing API)
export function produceUnit(gameState: GameState, cityId: string, unitType: UnitType): {
  success: boolean;
  error?: string;
  gameState?: GameState;
} {
  return produceUnitForPlayer(gameState, cityId, unitType, 'human');
}

export function performAITurn(gameState: GameState): GameState {
  // AI Movement Phase - move first to free up city tiles
  const aiUnits = gameState.units.filter(u => u.owner === 'ai');
  
  aiUnits.forEach(unit => {
    // Simple AI: move towards nearest human city/unit
    const humanTargets = [
      ...gameState.units.filter(u => u.owner === 'human'),
      ...gameState.cities.filter(c => c.owner === 'human')
    ];
    
    if (humanTargets.length > 0) {
      // Find nearest human target using Manhattan distance
      const target = humanTargets.reduce((nearest, candidate) => {
        const nearestDistance = Math.abs(nearest.x - unit.x) + Math.abs(nearest.y - unit.y);
        const candidateDistance = Math.abs(candidate.x - unit.x) + Math.abs(candidate.y - unit.y);
        return candidateDistance < nearestDistance ? candidate : nearest;
      });
      
      const dx = Math.sign(target.x - unit.x);
      const dy = Math.sign(target.y - unit.y);
      
      const newX = unit.x + dx;
      const newY = unit.y + dy;
      
      // Check bounds
      const mapHeight = gameState.gridData.length;
      const mapWidth = gameState.gridData[0].length;
      if (newX >= 0 && newX < mapWidth && newY >= 0 && newY < mapHeight) {
        const targetUnit = gameState.units.find(u => u.x === newX && u.y === newY);
        
        if (targetUnit && targetUnit.owner === 'human') {
          // Check if AI can legally occupy the target tile first
          const isNavalUnit = (unit.type === 'transport' || unit.type === 'destroyer' || 
                               unit.type === 'submarine' || unit.type === 'cruiser' || 
                               unit.type === 'battleship');
          const canOccupy = (unit.type === 'army' && gameState.gridData[newY][newX] === 'land') ||
                           (isNavalUnit && gameState.gridData[newY][newX] === 'water');
          
          if (canOccupy) {
            // AI attacks
            const combat = resolveCombat(unit, targetUnit);
            if (combat.attackerWins) {
              gameState.units = gameState.units.filter(u => u.id !== targetUnit.id);
              unit.x = newX;
              unit.y = newY;
              
              // Check for city capture after AI combat victory
              const city = gameState.cities.find(c => c.x === newX && c.y === newY);
              if (city && city.owner !== 'ai') {
                city.owner = 'ai';
              }
            } else {
              gameState.units = gameState.units.filter(u => u.id !== unit.id);
            }
          }
        } else if (!targetUnit) {
          // Check terrain constraints with proper naval unit logic
          const isNavalUnit = (unit.type === 'transport' || unit.type === 'destroyer' || 
                               unit.type === 'submarine' || unit.type === 'cruiser' || 
                               unit.type === 'battleship');
          const canMove = (unit.type === 'army' && gameState.gridData[newY][newX] === 'land') ||
                         (isNavalUnit && gameState.gridData[newY][newX] === 'water');
          
          if (canMove) {
            unit.x = newX;
            unit.y = newY;
            
            // Check for city capture after AI peaceful move
            const city = gameState.cities.find(c => c.x === newX && c.y === newY);
            if (city && city.owner !== 'ai') {
              city.owner = 'ai';
            }
          }
        }
      }
    }
  });

  // AI Production Phase - produce after moving to ensure city tiles are free
  const aiCities = gameState.cities.filter(c => c.owner === 'ai');
  const aiCityCount = aiCities.length;
  
  // Robust AI production strategy with comprehensive fallbacks
  aiCities.forEach(city => {
    // Check if city is coastal (has adjacent water)
    let isCoastal = false;
    let hasWaterTile = false;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const checkX = city.x + dx;
        const checkY = city.y + dy;
        const mapHeight = gameState.gridData.length;
        const mapWidth = gameState.gridData[0].length;
        if (checkX >= 0 && checkX < mapWidth && 
            checkY >= 0 && checkY < mapHeight && 
            gameState.gridData[checkY][checkX] === 'water') {
          isCoastal = true;
          // Check if water tile is unoccupied
          const isOccupied = gameState.units.find(u => u.x === checkX && u.y === checkY);
          if (!isOccupied) {
            hasWaterTile = true;
          }
        }
      }
    }

    // Check if city tile is occupied by own unit
    const cityOccupied = gameState.units.find(u => u.x === city.x && u.y === city.y);
    
    // Build prioritized production list based on strategic needs and feasibility
    const productionOptions: UnitType[] = [];
    
    // Current unit counts
    const aiArmyCount = gameState.units.filter(u => u.owner === 'ai' && u.type === 'army').length;
    const aiTransportCount = gameState.units.filter(u => u.owner === 'ai' && u.type === 'transport').length;
    const desiredTransports = Math.max(1, Math.floor(aiCityCount / 3));
    const humanNavalUnits = gameState.units.filter(u => 
      u.owner === 'human' && 
      ['transport', 'destroyer', 'submarine', 'cruiser', 'battleship'].includes(u.type)
    ).length;

    // Strategic priority: naval units first at coastal cities when needed
    if (isCoastal && hasWaterTile) {
      // Priority 1: Transport (if under quota)
      if (aiCityCount >= UNIT_TYPES.transport.cost && aiTransportCount < desiredTransports) {
        productionOptions.push('transport');
      }
      
      // Priority 2: Destroyer (if naval threats or large empire)
      if (aiCityCount >= UNIT_TYPES.destroyer.cost && 
          (humanNavalUnits > 0 || aiCityCount >= 6)) {
        productionOptions.push('destroyer');
      }
    }
    
    // Priority 3: Army (if city tile free and need more land forces)
    if (!cityOccupied && aiCityCount >= UNIT_TYPES.army.cost && aiArmyCount <= aiCityCount) {
      productionOptions.push('army');
    }
    
    // Try production options in order until one succeeds
    for (const unitType of productionOptions) {
      const result = produceUnitForPlayer(gameState, city.id, unitType, 'ai');
      if (result.success) {
        break; // Success, move to next city
      }
    }
  });

  return gameState;
}

// Start production of a unit (for manual production buttons)
export function startProduction(gameState: GameState, cityId: string, unitType: UnitType): {
  success: boolean;
  error?: string;
  gameState?: GameState;
} {
  const city = gameState.cities.find(c => c.id === cityId);
  if (!city) {
    return { success: false, error: "City not found" };
  }

  if (city.owner !== 'human') {
    return { success: false, error: "Can only produce units in your own cities" };
  }

  const cost = UNIT_TYPES[unitType].cost;
  const ownerCities = gameState.cities.filter(c => c.owner === 'human').length;
  
  if (ownerCities < cost) {
    return { success: false, error: `Need at least ${cost} cities to produce ${unitType}` };
  }

  // Check if city is already producing something
  if (city.currentProduction) {
    return { success: false, error: "City is already producing a unit" };
  }

  // Start production
  city.currentProduction = unitType;
  city.productionProgress = 0;

  return { success: true, gameState };
}

export function processAutomaticProduction(gameState: GameState): { gameState: GameState; events: string[] } {
  const events: string[] = [];
  const humanCities = gameState.cities.filter(c => c.owner === 'human');
  
  // Process production for each human city
  humanCities.forEach(city => {
    // Advance production progress for cities currently producing
    if (city.currentProduction) {
      city.productionProgress = (city.productionProgress || 0) + 1;
      const requiredTime = UNIT_TYPES[city.currentProduction].productionTime;
      
      // Check if production is complete
      if (city.productionProgress >= requiredTime) {
        // Try to complete the unit
        const result = produceUnitForPlayer(gameState, city.id, city.currentProduction, 'human');
        
        if (result.success && result.gameState) {
          // Update game state with new unit
          gameState = result.gameState;
          
          // Add event for game history
          events.push(`Turn ${gameState.turn}: ${city.currentProduction.toUpperCase()} completed at (${city.x},${city.y}) after ${requiredTime} turns`);
          
          // Clear current production
          city.currentProduction = undefined;
          city.productionProgress = 0;
          
          // Start next production if available
          if (city.productionQueue && city.productionQueue.length > 0) {
            const nextUnit = city.productionQueue[0];
            const nextCost = UNIT_TYPES[nextUnit].cost;
            const ownerCities = gameState.cities.filter(c => c.owner === 'human').length;
            
            if (ownerCities >= nextCost) {
              city.currentProduction = nextUnit;
              city.productionProgress = 0;
              // Remove from queue
              city.productionQueue = city.productionQueue.slice(1);
              events.push(`Turn ${gameState.turn}: Started production of ${nextUnit.toUpperCase()} at (${city.x},${city.y})`);
            }
          } else if (city.defaultProduction) {
            // Start default production
            const defaultCost = UNIT_TYPES[city.defaultProduction].cost;
            const ownerCities = gameState.cities.filter(c => c.owner === 'human').length;
            
            if (ownerCities >= defaultCost) {
              city.currentProduction = city.defaultProduction;
              city.productionProgress = 0;
              events.push(`Turn ${gameState.turn}: Started default production of ${city.defaultProduction.toUpperCase()} at (${city.x},${city.y})`);
            }
          }
        } else {
          // Production failed (no space, etc.), but keep trying next turn
          events.push(`Turn ${gameState.turn}: ${city.currentProduction.toUpperCase()} production blocked at (${city.x},${city.y}) - no space available`);
        }
      } else {
        // Production in progress
        const remaining = requiredTime - city.productionProgress;
        events.push(`Turn ${gameState.turn}: ${city.currentProduction.toUpperCase()} production continues at (${city.x},${city.y}) - ${remaining} turns remaining`);
      }
    } else {
      // No current production, check if we should start something
      let unitToProduceLookup: UnitType | null = null;
      let removeFromQueue = false;
      
      // Check production queue first, then default production
      if (city.productionQueue && city.productionQueue.length > 0) {
        unitToProduceLookup = city.productionQueue[0];
        removeFromQueue = true;
      } else if (city.defaultProduction) {
        unitToProduceLookup = city.defaultProduction;
      }
      
      if (unitToProduceLookup) {
        const cost = UNIT_TYPES[unitToProduceLookup].cost;
        const ownerCities = gameState.cities.filter(c => c.owner === 'human').length;
        
        if (ownerCities >= cost) {
          // Start production
          city.currentProduction = unitToProduceLookup;
          city.productionProgress = 0;
          
          // Remove from queue if it was consumed from queue
          if (removeFromQueue && city.productionQueue) {
            city.productionQueue = city.productionQueue.slice(1);
          }
          
          events.push(`Turn ${gameState.turn}: Started production of ${unitToProduceLookup.toUpperCase()} at (${city.x},${city.y})`);
        }
      }
    }
  });
  
  return { gameState, events };
}

export function checkVictoryConditions(gameState: GameState): { gameOver: boolean; winner?: 'human' | 'ai' } {
  const humanCities = gameState.cities.filter(c => c.owner === 'human').length;
  const aiCities = gameState.cities.filter(c => c.owner === 'ai').length;
  const humanUnits = gameState.units.filter(u => u.owner === 'human').length;
  const aiUnits = gameState.units.filter(u => u.owner === 'ai').length;
  const totalCities = gameState.cities.length;
  
  if ((aiCities === 0 && aiUnits === 0) || humanCities >= totalCities * 0.75) {
    return { gameOver: true, winner: 'human' };
  } else if ((humanCities === 0 && humanUnits === 0) || aiCities >= totalCities * 0.75) {
    return { gameOver: true, winner: 'ai' };
  }
  
  return { gameOver: false };
}
