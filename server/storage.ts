import { type Game, type InsertGame, type GameState, type Unit, type City } from "@shared/schema";
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
}

export const storage = new MemStorage();
