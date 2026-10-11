import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

export function dataDir(): string {
  return path.resolve(/*turbopackIgnore: true*/ process.env.DATA_DIR ?? "./data");
}

export function uploadsDir(): string {
  return path.join(dataDir(), "uploads");
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  bio TEXT NOT NULL DEFAULT '',
  contact_link TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS collections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  is_public INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_collections_user ON collections(user_id);
CREATE TABLE IF NOT EXISTS images (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mime TEXT NOT NULL,
  filename TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS cards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  collection_id INTEGER NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  player TEXT NOT NULL DEFAULT '',
  year TEXT NOT NULL DEFAULT '',
  brand TEXT NOT NULL DEFAULT '',
  set_name TEXT NOT NULL DEFAULT '',
  card_number TEXT NOT NULL DEFAULT '',
  team TEXT NOT NULL DEFAULT '',
  sport TEXT NOT NULL DEFAULT 'other',
  parallel TEXT NOT NULL DEFAULT '',
  grade TEXT NOT NULL DEFAULT '',
  rookie INTEGER NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '',
  front_image_id TEXT REFERENCES images(id) ON DELETE SET NULL,
  back_image_id TEXT REFERENCES images(id) ON DELETE SET NULL,
  for_sale INTEGER NOT NULL DEFAULT 0,
  for_trade INTEGER NOT NULL DEFAULT 0,
  listing_note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_cards_collection ON cards(collection_id);
CREATE INDEX IF NOT EXISTS idx_cards_user ON cards(user_id);
CREATE INDEX IF NOT EXISTS idx_cards_listing ON cards(for_sale, for_trade);
`;

type G = typeof globalThis & { __cardscoutDb?: Map<string, DatabaseSync> };

/** One connection per data directory, reused across hot reloads. */
export function db(): DatabaseSync {
  const g = globalThis as G;
  const dir = dataDir();
  g.__cardscoutDb ??= new Map();
  let conn = g.__cardscoutDb.get(dir);
  if (!conn) {
    fs.mkdirSync(uploadsDir(), { recursive: true });
    conn = new DatabaseSync(path.join(/*turbopackIgnore: true*/ dir, "cardscout.db"));
    conn.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
    conn.exec(SCHEMA);
    g.__cardscoutDb.set(dir, conn);
  }
  return conn;
}
