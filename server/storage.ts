import { db } from "./db";
import {
  patterns,
  type InsertPattern,
  type Pattern,
  type UpdatePatternRequest
} from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  getPatterns(): Promise<Pattern[]>;
  getPattern(id: number): Promise<Pattern | undefined>;
  createPattern(pattern: InsertPattern): Promise<Pattern>;
  updatePattern(id: number, updates: UpdatePatternRequest): Promise<Pattern>;
  deletePattern(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getPatterns(): Promise<Pattern[]> {
    return await db.select().from(patterns).orderBy(desc(patterns.createdAt));
  }

  async getPattern(id: number): Promise<Pattern | undefined> {
    const [pattern] = await db.select().from(patterns).where(eq(patterns.id, id));
    return pattern;
  }

  async createPattern(insertPattern: InsertPattern): Promise<Pattern> {
    const [pattern] = await db.insert(patterns).values(insertPattern).returning();
    return pattern;
  }

  async updatePattern(id: number, updates: UpdatePatternRequest): Promise<Pattern> {
    const [updated] = await db.update(patterns)
      .set(updates)
      .where(eq(patterns.id, id))
      .returning();
    return updated;
  }

  async deletePattern(id: number): Promise<void> {
    await db.delete(patterns).where(eq(patterns.id, id));
  }
}

export const storage = new DatabaseStorage();
