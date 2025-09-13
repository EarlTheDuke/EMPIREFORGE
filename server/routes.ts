import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { gameStateSchema, moveUnitSchema, produceUnitSchema, type GameState } from "@shared/schema";
import { generateInitialGameState, moveUnit, produceUnit, performAITurn, checkVictoryConditions } from "../client/src/lib/game-logic";

export async function registerRoutes(app: Express): Promise<Server> {
  // Create a new game
  app.post("/api/games", async (req, res) => {
    try {
      const initialGameState = generateInitialGameState();
      const game = await storage.createGame(initialGameState);
      res.json(game);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get game state
  app.get("/api/games/:id", async (req, res) => {
    try {
      const game = await storage.getGame(req.params.id);
      if (!game) {
        return res.status(404).json({ message: "Game not found" });
      }
      res.json(game);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Move unit
  app.post("/api/games/:id/move", async (req, res) => {
    try {
      const parseResult = moveUnitSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ message: "Invalid move data", errors: parseResult.error.errors });
      }

      const game = await storage.getGame(req.params.id);
      if (!game) {
        return res.status(404).json({ message: "Game not found" });
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

      const result = moveUnit(gameState, parseResult.data.unitId, parseResult.data.targetX, parseResult.data.targetY);
      
      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }

      const updatedGame = await storage.updateGame(req.params.id, result.gameState!);
      res.json({ game: updatedGame, combat: result.combat });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Produce unit
  app.post("/api/games/:id/produce", async (req, res) => {
    try {
      const parseResult = produceUnitSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ message: "Invalid production data", errors: parseResult.error.errors });
      }

      const game = await storage.getGame(req.params.id);
      if (!game) {
        return res.status(404).json({ message: "Game not found" });
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

      const result = produceUnit(gameState, parseResult.data.cityId, parseResult.data.unitType);
      
      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }

      const updatedGame = await storage.updateGame(req.params.id, result.gameState!);
      res.json(updatedGame);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // End turn
  app.post("/api/games/:id/end-turn", async (req, res) => {
    try {
      const game = await storage.getGame(req.params.id);
      if (!game) {
        return res.status(404).json({ message: "Game not found" });
      }

      let gameState: GameState = {
        turn: game.turn,
        currentPlayer: game.currentPlayer as any,
        gridData: game.gridData as any,
        units: game.units as any,
        cities: game.cities as any,
        fogOfWar: game.fogOfWar as any,
        gameOver: game.gameOver,
        winner: game.winner as any,
      };

      // Reset human unit moves
      gameState.units.forEach(unit => {
        if (unit.owner === 'human') {
          const unitTypes = {
            army: { movement: 1 },
            transport: { movement: 2 },
            destroyer: { movement: 2 },
            submarine: { movement: 3 },
            cruiser: { movement: 2 },
            battleship: { movement: 1 }
          };
          unit.moves = unitTypes[unit.type].movement;
        }
      });

      // Perform AI turn
      gameState = performAITurn(gameState);
      
      // Increment turn and switch to human player
      gameState.turn++;
      gameState.currentPlayer = 'human';

      // Check victory conditions
      const victory = checkVictoryConditions(gameState);
      if (victory.gameOver) {
        gameState.gameOver = true;
        gameState.winner = victory.winner;
      }

      const updatedGame = await storage.updateGame(req.params.id, gameState);
      res.json(updatedGame);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
