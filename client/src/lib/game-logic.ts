import { type GameState, type Unit, type City, type UnitType, type CombatResult } from "@shared/schema";
import { nanoid } from "nanoid";

export const UNIT_TYPES = {
  army: { symbol: 'A', cost: 1, movement: 1, combat: 1 },
  transport: { symbol: 'T', cost: 3, movement: 2, combat: 0 },
  destroyer: { symbol: 'D', cost: 5, movement: 2, combat: 2 },
  submarine: { symbol: 'S', cost: 8, movement: 3, combat: 3 },
  cruiser: { symbol: 'C', cost: 12, movement: 2, combat: 4 },
  battleship: { symbol: 'B', cost: 20, movement: 1, combat: 5 }
};

export const GRID_SIZE = { width: 20, height: 15 };

export function generateInitialGameState(): GameState {
  const gridData = generateMap();
  const cities = placeCities(gridData);
  const units = placeStartingUnits(cities);
  const fogOfWar = initializeFogOfWar();
  
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

function generateMap(): ('water' | 'land')[][] {
  const grid: ('water' | 'land')[][] = [];

  // Initialize all as water
  for (let y = 0; y < GRID_SIZE.height; y++) {
    grid[y] = [];
    for (let x = 0; x < GRID_SIZE.width; x++) {
      grid[y][x] = 'water';
    }
  }

  // Generate 3-5 islands
  const numIslands = 3 + Math.floor(Math.random() * 3);
  for (let i = 0; i < numIslands; i++) {
    generateIsland(grid);
  }

  return grid;
}

function generateIsland(grid: ('water' | 'land')[][]): void {
  const centerX = Math.floor(Math.random() * GRID_SIZE.width);
  const centerY = Math.floor(Math.random() * GRID_SIZE.height);
  const size = 3 + Math.floor(Math.random() * 5);

  for (let dy = -size; dy <= size; dy++) {
    for (let dx = -size; dx <= size; dx++) {
      const x = centerX + dx;
      const y = centerY + dy;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (x >= 0 && x < GRID_SIZE.width && y >= 0 && y < GRID_SIZE.height && 
          distance <= size && Math.random() > distance / size * 0.6) {
        grid[y][x] = 'land';
      }
    }
  }
}

function placeCities(gridData: ('water' | 'land')[][]): City[] {
  const landTiles = [];
  
  // Find all land tiles
  for (let y = 0; y < GRID_SIZE.height; y++) {
    for (let x = 0; x < GRID_SIZE.width; x++) {
      if (gridData[y][x] === 'land') {
        landTiles.push({ x, y });
      }
    }
  }

  // Place 8-12 cities randomly on land
  const numCities = Math.min(8 + Math.floor(Math.random() * 5), landTiles.length);
  const cities: City[] = [];
  
  for (let i = 0; i < numCities; i++) {
    const randomIndex = Math.floor(Math.random() * landTiles.length);
    const tile = landTiles.splice(randomIndex, 1)[0];
    
    cities.push({
      id: nanoid(),
      x: tile.x,
      y: tile.y,
      owner: i === 0 ? 'human' : (i === 1 ? 'ai' : 'neutral'),
      production: 1
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

function initializeFogOfWar(): boolean[][] {
  const fogOfWar: boolean[][] = [];
  
  for (let y = 0; y < GRID_SIZE.height; y++) {
    fogOfWar[y] = [];
    for (let x = 0; x < GRID_SIZE.width; x++) {
      fogOfWar[y][x] = true; // true = hidden
    }
  }

  return fogOfWar;
}

export function revealArea(fogOfWar: boolean[][], centerX: number, centerY: number, radius: number): void {
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const x = centerX + dx;
      const y = centerY + dy;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (x >= 0 && x < GRID_SIZE.width && y >= 0 && y < GRID_SIZE.height && distance <= radius) {
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
} {
  const unit = gameState.units.find(u => u.id === unitId);
  if (!unit) {
    return { success: false, error: "Unit not found" };
  }

  if (unit.owner !== 'human') {
    return { success: false, error: "Can only move your own units" };
  }

  const distance = Math.abs(unit.x - targetX) + Math.abs(unit.y - targetY);
  const unitType = UNIT_TYPES[unit.type];
  
  if (distance > unitType.movement || unit.moves <= 0) {
    return { success: false, error: "Unit cannot move that far or has no moves left" };
  }

  // Check for enemy unit at destination
  const enemyUnit = gameState.units.find(u => u.x === targetX && u.y === targetY && u.owner !== unit.owner);
  if (enemyUnit) {
    const combat = resolveCombat(unit, enemyUnit);
    
    if (combat.attackerWins) {
      // Remove defender
      gameState.units = gameState.units.filter(u => u.id !== enemyUnit.id);
      // Move attacker
      unit.x = targetX;
      unit.y = targetY;
      unit.moves--;
      
      // Check for city capture
      const city = gameState.cities.find(c => c.x === targetX && c.y === targetY);
      if (city && city.owner !== unit.owner) {
        city.owner = unit.owner;
        combat.capturedCity = city;
      }
    } else {
      // Remove attacker
      gameState.units = gameState.units.filter(u => u.id !== unit.id);
    }
    
    return { success: true, gameState, combat };
  }

  // Valid move - check terrain constraints
  if (unit.type === 'army' && gameState.gridData[targetY][targetX] === 'water') {
    return { success: false, error: "Armies cannot move on water" };
  }

  if ((unit.type === 'destroyer' || unit.type === 'submarine' || unit.type === 'cruiser' || unit.type === 'battleship') 
      && gameState.gridData[targetY][targetX] === 'land') {
    return { success: false, error: "Naval units cannot move on land" };
  }

  // Move unit
  unit.x = targetX;
  unit.y = targetY;
  unit.moves--;
  
  // Reveal area around new position
  revealArea(gameState.fogOfWar, targetX, targetY, 1);

  return { success: true, gameState };
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

export function produceUnit(gameState: GameState, cityId: string, unitType: UnitType): {
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
  const humanCities = gameState.cities.filter(c => c.owner === 'human').length;
  
  // Simple production check - need enough cities for cost
  if (humanCities < cost) {
    return { success: false, error: `Need at least ${cost} cities to produce ${unitType}` };
  }

  // Check if tile is occupied
  const existingUnit = gameState.units.find(u => u.x === city.x && u.y === city.y);
  if (existingUnit) {
    return { success: false, error: "City tile is occupied" };
  }

  // Create new unit
  const newUnit: Unit = {
    id: nanoid(),
    x: city.x,
    y: city.y,
    type: unitType,
    owner: 'human',
    moves: UNIT_TYPES[unitType].movement
  };

  gameState.units.push(newUnit);
  return { success: true, gameState };
}

export function performAITurn(gameState: GameState): GameState {
  const aiUnits = gameState.units.filter(u => u.owner === 'ai');
  
  aiUnits.forEach(unit => {
    // Simple AI: move towards nearest human city/unit
    const humanTargets = [
      ...gameState.units.filter(u => u.owner === 'human'),
      ...gameState.cities.filter(c => c.owner === 'human')
    ];
    
    if (humanTargets.length > 0) {
      const target = humanTargets[0];
      const dx = Math.sign(target.x - unit.x);
      const dy = Math.sign(target.y - unit.y);
      
      const newX = unit.x + dx;
      const newY = unit.y + dy;
      
      // Check bounds
      if (newX >= 0 && newX < GRID_SIZE.width && newY >= 0 && newY < GRID_SIZE.height) {
        const targetUnit = gameState.units.find(u => u.x === newX && u.y === newY);
        
        if (targetUnit && targetUnit.owner === 'human') {
          // AI attacks
          const combat = resolveCombat(unit, targetUnit);
          if (combat.attackerWins) {
            gameState.units = gameState.units.filter(u => u.id !== targetUnit.id);
            unit.x = newX;
            unit.y = newY;
          } else {
            gameState.units = gameState.units.filter(u => u.id !== unit.id);
          }
        } else if (!targetUnit) {
          // Check terrain constraints
          const canMove = (unit.type === 'army' && gameState.gridData[newY][newX] === 'land') ||
                         (unit.type !== 'army' && gameState.gridData[newY][newX] === 'water');
          
          if (canMove) {
            unit.x = newX;
            unit.y = newY;
          }
        }
      }
    }
  });

  return gameState;
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
