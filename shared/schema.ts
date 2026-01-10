import { pgTable, text, serial, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const patterns = pgTable("patterns", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  bpm: integer("bpm").notNull(),
  timeSignature: text("time_signature").notNull().default("4/4"),
  style: text("style").notNull(), // Djent, Metal, Rock, Post-hardcore
  type: text("type").notNull(), // Groove, Fill, Breakdown
  grid: jsonb("grid").notNull(), // Array of { step: number, drum: string, velocity: number }
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPatternSchema = createInsertSchema(patterns).omit({ 
  id: true, 
  createdAt: true 
});

export type Pattern = typeof patterns.$inferSelect;
export type InsertPattern = z.infer<typeof insertPatternSchema>;

export type CreatePatternRequest = InsertPattern;
export type UpdatePatternRequest = Partial<InsertPattern>;

export type GeneratePatternRequest = {
  style: string;
  bpm: number;
  type: string; // Groove, Fill, Breakdown
};

export type GeneratePatternResponse = {
  grid: { step: number; drum: string; velocity: number }[];
  suggestedName: string;
};
