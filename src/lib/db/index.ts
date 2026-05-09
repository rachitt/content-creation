import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import path from "node:path";
import fs from "node:fs";
import * as schema from "./schema";

export * from "./schema";
export { schema };

const DB_PATH = process.env.SQLITE_PATH ?? path.resolve(process.cwd(), "data", "content.db");
const MIGRATIONS_FOLDER = path.resolve(process.cwd(), "drizzle");

declare global {
  // eslint-disable-next-line no-var
  var __sqliteDb: BetterSQLite3Database<typeof schema> | undefined;
  // eslint-disable-next-line no-var
  var __sqliteMigrated: boolean | undefined;
}

function ensureDir(p: string) {
  const dir = path.dirname(p);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export function getDb(): BetterSQLite3Database<typeof schema> {
  if (!global.__sqliteDb) {
    ensureDir(DB_PATH);
    const sqlite = new Database(DB_PATH);
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("foreign_keys = ON");
    global.__sqliteDb = drizzle(sqlite, { schema });
    if (!global.__sqliteMigrated && fs.existsSync(MIGRATIONS_FOLDER)) {
      try {
        migrate(global.__sqliteDb, { migrationsFolder: MIGRATIONS_FOLDER });
        global.__sqliteMigrated = true;
      } catch (err) {
        console.warn("[db] migration skipped:", (err as Error).message);
      }
    }
  }
  return global.__sqliteDb;
}

// JSON helpers — schema stores arrays/objects as TEXT.
export function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function stringifyJson(value: unknown): string {
  return JSON.stringify(value);
}

export function newId(prefix = ""): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}${prefix ? "_" : ""}${Date.now().toString(36)}${rand}`;
}
