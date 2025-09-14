import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { gameStateSchema, moveUnitSchema, produceUnitSchema, setDefaultProductionSchema, addToQueueSchema, removeFromQueueSchema, createGameOptionsSchema, type GameState } from "@shared/schema";
import { generateInitialGameState, moveUnit, produceUnit, startProduction, performAITurn, checkVictoryConditions, processAutomaticProduction, UNIT_TYPES } from "../client/src/lib/game-logic";

export async function registerRoutes(app: Express): Promise<Server> {
  // Create a new game
  app.post("/api/games", async (req, res) => {
    try {
      const parse = createGameOptionsSchema.safeParse(req.body || {});
      const initialGameState = generateInitialGameState(parse.success ? parse.data : undefined);
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
      res.json({ game: updatedGame, combat: result.combat, events: result.events || [] });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Produce unit
  app.post("/api/games/:id/produce", async (req, res) => {
    try {
      console.log('🎯 /produce endpoint called with body:', req.body);
      const parseResult = produceUnitSchema.safeParse(req.body);
      if (!parseResult.success) {
        console.log('❌ Validation failed for /produce:', parseResult.error.errors);
        return res.status(400).json({ message: "Invalid production data", errors: parseResult.error.errors });
      }
      console.log('✅ /produce validation passed:', parseResult.data);

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

      console.log('🎯 Calling startProduction with:', { cityId: parseResult.data.cityId, unitType: parseResult.data.unitType });
      const result = startProduction(gameState, parseResult.data.cityId, parseResult.data.unitType);
      console.log('🎯 startProduction result:', result);
      
      if (!result.success) {
        console.log('❌ startProduction failed:', result.error);
        return res.status(400).json({ message: result.error });
      }
      console.log('✅ startProduction succeeded, updating game');

      const updatedGame = await storage.updateGame(req.params.id, result.gameState!);
      res.json(updatedGame);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Set default production
  app.post("/api/games/:id/set-default-production", async (req, res) => {
    try {
      const parseResult = setDefaultProductionSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ message: "Invalid default production data", errors: parseResult.error.errors });
      }

      const updatedGame = await storage.setDefaultProduction(
        req.params.id,
        parseResult.data.cityId,
        parseResult.data.unitType
      );

      if (!updatedGame) {
        return res.status(404).json({ message: "Game or city not found" });
      }

      res.json(updatedGame);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Add to production queue
  app.post("/api/games/:id/add-to-queue", async (req, res) => {
    try {
      const parseResult = addToQueueSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ message: "Invalid queue data", errors: parseResult.error.errors });
      }

      const updatedGame = await storage.addToQueue(
        req.params.id,
        parseResult.data.cityId,
        parseResult.data.unitType
      );

      if (!updatedGame) {
        return res.status(404).json({ message: "Game or city not found" });
      }

      res.json(updatedGame);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Remove from production queue
  app.post("/api/games/:id/remove-from-queue", async (req, res) => {
    try {
      const parseResult = removeFromQueueSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ message: "Invalid remove data", errors: parseResult.error.errors });
      }

      const updatedGame = await storage.removeFromQueue(
        req.params.id,
        parseResult.data.cityId,
        parseResult.data.index
      );

      if (!updatedGame) {
        return res.status(404).json({ message: "Game, city not found, or invalid index" });
      }

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
          unit.moves = UNIT_TYPES[unit.type].movement;
        }
      });

      // Process automatic production for human cities
      const productionResult = processAutomaticProduction(gameState);
      gameState = productionResult.gameState;
      const productionEvents = productionResult.events;

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
      res.json({ game: updatedGame, events: productionEvents });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
