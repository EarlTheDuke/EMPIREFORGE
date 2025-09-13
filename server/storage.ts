import { type Game, type InsertGame, type GameState, type Unit, type City, type UnitType } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<any | undefined>;
  getUserByUsername(username: string): Promise<any | undefined>;
  createUser(user: any): Promise<any>;
  
  // Game-specific methods
  createGame(gameState: GameState): Promise<Game>;
  getGame(id: string): Promise<Game | undefined>;
  updateGame(id: string, gameState: GameState): Promise<Game | undefined>;
  deleteGame(id: string): Promise<boolean>;
  
  // Production queue methods
  setDefaultProduction(gameId: string, cityId: string, unitType: UnitType | null): Promise<Game | undefined>;
  addToQueue(gameId: string, cityId: string, unitType: UnitType): Promise<Game | undefined>;
  removeFromQueue(gameId: string, cityId: string, index: number): Promise<Game | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<string, any>;
  private games: Map<string, Game>;

  constructor() {
    this.users = new Map();
    this.games = new Map();
  }

  async getUser(id: string): Promise<any | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<any | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: any): Promise<any> {
    const id = randomUUID();
    const user: any = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createGame(gameState: GameState): Promise<Game> {
    const id = randomUUID();
    const game: Game = {
      id,
      turn: gameState.turn,
      currentPlayer: gameState.currentPlayer,
      gridData: gameState.gridData,
      units: gameState.units,
      cities: gameState.cities,
      fogOfWar: gameState.fogOfWar,
      gameOver: gameState.gameOver,
      winner: gameState.winner || null,
    };
    this.games.set(id, game);
    return game;
  }

  async getGame(id: string): Promise<Game | undefined> {
    return this.games.get(id);
  }

  async updateGame(id: string, gameState: GameState): Promise<Game | undefined> {
    const existingGame = this.games.get(id);
    if (!existingGame) return undefined;

    const updatedGame: Game = {
      ...existingGame,
      turn: gameState.turn,
      currentPlayer: gameState.currentPlayer,
      gridData: gameState.gridData,
      units: gameState.units,
      cities: gameState.cities,
      fogOfWar: gameState.fogOfWar,
      gameOver: gameState.gameOver,
      winner: gameState.winner || null,
    };

    this.games.set(id, updatedGame);
    return updatedGame;
  }

  async deleteGame(id: string): Promise<boolean> {
    return this.games.delete(id);
  }

  async setDefaultProduction(gameId: string, cityId: string, unitType: UnitType | null): Promise<Game | undefined> {
    const game = this.games.get(gameId);
    if (!game) return undefined;

    const cities = [...(game.cities as City[])];
    const cityIndex = cities.findIndex(c => c.id === cityId);
    if (cityIndex === -1) return undefined;

    cities[cityIndex] = {
      ...cities[cityIndex],
      defaultProduction: unitType || undefined,
    };

    const updatedGame: Game = {
      ...game,
      cities: cities,
    };

    this.games.set(gameId, updatedGame);
    return updatedGame;
  }

  async addToQueue(gameId: string, cityId: string, unitType: UnitType): Promise<Game | undefined> {
    console.log('🔧 addToQueue called:', { gameId, cityId, unitType });
    const game = this.games.get(gameId);
    if (!game) {
      console.log('❌ Game not found for gameId:', gameId);
      return undefined;
    }

    const cities = [...(game.cities as City[])];
    const cityIndex = cities.findIndex(c => c.id === cityId);
    if (cityIndex === -1) {
      console.log('❌ City not found for cityId:', cityId);
      return undefined;
    }

    const currentQueue = cities[cityIndex].productionQueue || [];
    console.log('📋 Current queue before adding:', currentQueue);
    
    cities[cityIndex] = {
      ...cities[cityIndex],
      productionQueue: [...currentQueue, unitType],
    };

    console.log('📋 New queue after adding:', cities[cityIndex].productionQueue);

    const updatedGame: Game = {
      ...game,
      cities: cities,
    };

    this.games.set(gameId, updatedGame);
    console.log('✅ Game updated successfully, returning updated game');
    return updatedGame;
  }

  async removeFromQueue(gameId: string, cityId: string, index: number): Promise<Game | undefined> {
    const game = this.games.get(gameId);
    if (!game) return undefined;

    const cities = [...(game.cities as City[])];
    const cityIndex = cities.findIndex(c => c.id === cityId);
    if (cityIndex === -1) return undefined;

    const currentQueue = cities[cityIndex].productionQueue || [];
    if (index < 0 || index >= currentQueue.length) return undefined;

    const newQueue = [...currentQueue];
    newQueue.splice(index, 1);

    cities[cityIndex] = {
      ...cities[cityIndex],
      productionQueue: newQueue,
    };

    const updatedGame: Game = {
      ...game,
      cities: cities,
    };

    this.games.set(gameId, updatedGame);
    return updatedGame;
  }
}

export const storage = new MemStorage();
