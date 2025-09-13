import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const games = pgTable("games", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  turn: integer("turn").notNull().default(1),
  currentPlayer: varchar("current_player").notNull().default("human"),
  gridData: jsonb("grid_data").notNull(),
  units: jsonb("units").notNull(),
  cities: jsonb("cities").notNull(),
  fogOfWar: jsonb("fog_of_war").notNull(),
  gameOver: boolean("game_over").notNull().default(false),
  winner: varchar("winner"),
});

export const unitTypeSchema = z.enum(["army", "transport", "destroyer", "submarine", "cruiser", "battleship"]);
export const playerTypeSchema = z.enum(["human", "ai", "neutral"]);

export const unitSchema = z.object({
  id: z.string(),
  x: z.number(),
  y: z.number(),
  type: unitTypeSchema,
  owner: playerTypeSchema,
  moves: z.number(),
});

export const citySchema = z.object({
  id: z.string(),
  x: z.number(),
  y: z.number(),
  owner: playerTypeSchema,
  production: z.number(),
  defaultProduction: unitTypeSchema.optional(),
  productionQueue: z.array(unitTypeSchema).optional(),
});

export const gameStateSchema = z.object({
  turn: z.number(),
  currentPlayer: playerTypeSchema,
  gridData: z.array(z.array(z.enum(["water", "land"]))),
  units: z.array(unitSchema),
  cities: z.array(citySchema),
  fogOfWar: z.array(z.array(z.boolean())),
  gameOver: z.boolean(),
  winner: playerTypeSchema.optional(),
});

export const insertGameSchema = createInsertSchema(games).omit({
  id: true,
});

export const combatResultSchema = z.object({
  attackerWins: z.boolean(),
  attackerUnit: unitSchema,
  defenderUnit: unitSchema,
  capturedCity: citySchema.optional(),
});

export const moveUnitSchema = z.object({
  gameId: z.string(),
  unitId: z.string(),
  targetX: z.number(),
  targetY: z.number(),
});

export const produceUnitSchema = z.object({
  gameId: z.string(),
  cityId: z.string(),
  unitType: unitTypeSchema,
});

export const setDefaultProductionSchema = z.object({
  gameId: z.string(),
  cityId: z.string(),
  unitType: unitTypeSchema.nullable(),
});

export const addToQueueSchema = z.object({
  gameId: z.string(),
  cityId: z.string(),
  unitType: unitTypeSchema,
});

export const removeFromQueueSchema = z.object({
  gameId: z.string(),
  cityId: z.string(),
  index: z.number(),
});

export type Game = typeof games.$inferSelect;
export type InsertGame = z.infer<typeof insertGameSchema>;
export type GameState = z.infer<typeof gameStateSchema>;
export type Unit = z.infer<typeof unitSchema>;
export type City = z.infer<typeof citySchema>;
export type UnitType = z.infer<typeof unitTypeSchema>;
export type PlayerType = z.infer<typeof playerTypeSchema>;
export type CombatResult = z.infer<typeof combatResultSchema>;
export type MoveUnitRequest = z.infer<typeof moveUnitSchema>;
export type ProduceUnitRequest = z.infer<typeof produceUnitSchema>;
export type SetDefaultProductionRequest = z.infer<typeof setDefaultProductionSchema>;
export type AddToQueueRequest = z.infer<typeof addToQueueSchema>;
export type RemoveFromQueueRequest = z.infer<typeof removeFromQueueSchema>;
