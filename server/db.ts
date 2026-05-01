import { desc, eq, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { Brief, InsertBrief, InsertUser, briefs, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Brief queries
export async function insertBrief(brief: InsertBrief): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(briefs).values(brief);
  return (result[0] as any).insertId as number;
}

export async function getBriefsByUser(userId: number | null): Promise<Brief[]> {
  const db = await getDb();
  if (!db) return [];
  if (userId === null) return [];
  return db.select().from(briefs).where(eq(briefs.userId, userId)).orderBy(desc(briefs.createdAt)).limit(20);
}

export async function getBriefById(id: number): Promise<Brief | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(briefs).where(eq(briefs.id, id)).limit(1);
  return result[0];
}

export async function deleteBrief(id: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(briefs).where(eq(briefs.id, id));
  // Note: userId scoping handled at procedure level (ownership check)
}

export async function updateBrief(id: number, data: Partial<InsertBrief>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(briefs).set(data).where(eq(briefs.id, id));
}

export async function getBriefByToken(token: string): Promise<Brief | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(briefs).where(eq(briefs.shareToken, token)).limit(1);
  return result[0];
}

export async function setShareToken(id: number, token: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(briefs).set({ shareToken: token }).where(eq(briefs.id, id));
}

export async function toggleFavorite(id: number, userId: number, value: boolean): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(briefs).set({ isFavorite: value ? 1 : 0 }).where(eq(briefs.id, id));
}

export async function setTags(id: number, userId: number, tags: string[]): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(briefs).set({ tags: JSON.stringify(tags) }).where(eq(briefs.id, id));
}

export async function getBriefsBySession(sessionId: string): Promise<Brief[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(briefs)
    .where(eq(briefs.sessionId, sessionId))
    .orderBy(desc(briefs.createdAt))
    .limit(50);
}

export async function getBriefsBySessionFiltered(
  sessionId: string,
  filter: { favoritesOnly?: boolean; tag?: string }
): Promise<Brief[]> {
  const db = await getDb();
  if (!db) return [];
  const results = await db.select().from(briefs)
    .where(eq(briefs.sessionId, sessionId))
    .orderBy(desc(briefs.createdAt))
    .limit(50);
  return results.filter((b) => {
    if (filter.favoritesOnly && !b.isFavorite) return false;
    if (filter.tag) {
      try {
        const t: string[] = b.tags ? JSON.parse(b.tags) : [];
        if (!t.includes(filter.tag)) return false;
      } catch { return false; }
    }
    return true;
  });
}

export async function getBriefsByUserFiltered(
  userId: number,
  filter: { favoritesOnly?: boolean; tag?: string }
): Promise<Brief[]> {
  const db = await getDb();
  if (!db) return [];
  const results = await db.select().from(briefs).where(eq(briefs.userId, userId)).orderBy(desc(briefs.createdAt)).limit(50);
  return results.filter((b) => {
    if (filter.favoritesOnly && !b.isFavorite) return false;
    if (filter.tag) {
      try {
        const t: string[] = b.tags ? JSON.parse(b.tags) : [];
        if (!t.includes(filter.tag)) return false;
      } catch { return false; }
    }
    return true;
  });
}
