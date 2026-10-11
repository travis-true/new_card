import type { SQLInputValue } from "node:sqlite";
import { db } from "./db";
import { deleteImageFiles } from "./images";

type Row = Record<string, unknown>;

export type User = {
  id: number;
  email: string;
  username: string;
  bio: string;
  contactLink: string;
  createdAt: string;
};

export type Collection = {
  id: number;
  userId: number;
  name: string;
  description: string;
  isPublic: boolean;
  createdAt: string;
  cardCount: number;
};

export type Card = {
  id: number;
  userId: number;
  collectionId: number;
  player: string;
  year: string;
  brand: string;
  setName: string;
  cardNumber: string;
  team: string;
  sport: string;
  parallel: string;
  grade: string;
  rookie: boolean;
  notes: string;
  frontImageId: string | null;
  backImageId: string | null;
  forSale: boolean;
  forTrade: boolean;
  listingNote: string;
  createdAt: string;
  ownerUsername: string;
  ownerContactLink: string;
  collectionName: string;
  collectionPublic: boolean;
};

const toUser = (r: Row): User => ({
  id: r.id as number,
  email: r.email as string,
  username: r.username as string,
  bio: r.bio as string,
  contactLink: r.contact_link as string,
  createdAt: r.created_at as string,
});

const toCollection = (r: Row): Collection => ({
  id: r.id as number,
  userId: r.user_id as number,
  name: r.name as string,
  description: r.description as string,
  isPublic: r.is_public === 1,
  createdAt: r.created_at as string,
  cardCount: (r.card_count as number | undefined) ?? 0,
});

const toCard = (r: Row): Card => ({
  id: r.id as number,
  userId: r.user_id as number,
  collectionId: r.collection_id as number,
  player: r.player as string,
  year: r.year as string,
  brand: r.brand as string,
  setName: r.set_name as string,
  cardNumber: r.card_number as string,
  team: r.team as string,
  sport: r.sport as string,
  parallel: r.parallel as string,
  grade: r.grade as string,
  rookie: r.rookie === 1,
  notes: r.notes as string,
  frontImageId: (r.front_image_id as string | null) ?? null,
  backImageId: (r.back_image_id as string | null) ?? null,
  forSale: r.for_sale === 1,
  forTrade: r.for_trade === 1,
  listingNote: r.listing_note as string,
  createdAt: r.created_at as string,
  ownerUsername: r.owner_username as string,
  ownerContactLink: r.owner_contact_link as string,
  collectionName: r.collection_name as string,
  collectionPublic: r.collection_public === 1,
});

// ---------- users ----------

export function getUserById(id: number): User | null {
  const row = db().prepare("SELECT * FROM users WHERE id = ?").get(id) as Row | undefined;
  return row ? toUser(row) : null;
}

export function getUserByUsername(username: string): User | null {
  const row = db().prepare("SELECT * FROM users WHERE username = ?").get(username) as Row | undefined;
  return row ? toUser(row) : null;
}

export function getUserWithHashByEmail(email: string): (User & { passwordHash: string }) | null {
  const row = db().prepare("SELECT * FROM users WHERE email = ?").get(email) as Row | undefined;
  return row ? { ...toUser(row), passwordHash: row.password_hash as string } : null;
}

export class DuplicateError extends Error {
  constructor(public field: "email" | "username") {
    super(`${field} already in use`);
  }
}

export function createUser(email: string, username: string, passwordHash: string): User {
  const conn = db();
  if (conn.prepare("SELECT 1 FROM users WHERE email = ?").get(email)) throw new DuplicateError("email");
  if (conn.prepare("SELECT 1 FROM users WHERE username = ?").get(username)) throw new DuplicateError("username");
  const result = conn
    .prepare("INSERT INTO users (email, username, password_hash) VALUES (?, ?, ?)")
    .run(email, username, passwordHash);
  const id = Number(result.lastInsertRowid);
  createCollection(id, "My Collection", "", true);
  return getUserById(id)!;
}

export function updateProfile(userId: number, bio: string, contactLink: string): void {
  db().prepare("UPDATE users SET bio = ?, contact_link = ? WHERE id = ?").run(bio, contactLink, userId);
}

// ---------- collections ----------

const COLLECTION_SELECT = `
  SELECT c.*, (SELECT COUNT(*) FROM cards k WHERE k.collection_id = c.id) AS card_count
  FROM collections c`;

export function createCollection(userId: number, name: string, description: string, isPublic: boolean): Collection {
  const result = db()
    .prepare("INSERT INTO collections (user_id, name, description, is_public) VALUES (?, ?, ?, ?)")
    .run(userId, name, description, isPublic ? 1 : 0);
  return getCollection(Number(result.lastInsertRowid))!;
}

export function getCollection(id: number): Collection | null {
  const row = db().prepare(`${COLLECTION_SELECT} WHERE c.id = ?`).get(id) as Row | undefined;
  return row ? toCollection(row) : null;
}

export function listCollections(userId: number, publicOnly = false): Collection[] {
  const sql = `${COLLECTION_SELECT} WHERE c.user_id = ? ${publicOnly ? "AND c.is_public = 1" : ""} ORDER BY c.created_at, c.id`;
  return (db().prepare(sql).all(userId) as Row[]).map(toCollection);
}

export function updateCollection(id: number, name: string, description: string, isPublic: boolean): void {
  db()
    .prepare("UPDATE collections SET name = ?, description = ?, is_public = ? WHERE id = ?")
    .run(name, description, isPublic ? 1 : 0, id);
}

/** Deletes the collection, its cards and their image files. */
export function deleteCollection(id: number): void {
  const conn = db();
  const files = (
    conn
      .prepare(
        `SELECT i.filename FROM images i JOIN cards k ON i.id IN (k.front_image_id, k.back_image_id)
         WHERE k.collection_id = ?`,
      )
      .all(id) as Row[]
  ).map((r) => r.filename as string);
  const ids = (
    conn
      .prepare(
        `SELECT i.id FROM images i JOIN cards k ON i.id IN (k.front_image_id, k.back_image_id)
         WHERE k.collection_id = ?`,
      )
      .all(id) as Row[]
  ).map((r) => r.id as string);
  conn.prepare("DELETE FROM collections WHERE id = ?").run(id);
  for (const imageId of ids) conn.prepare("DELETE FROM images WHERE id = ?").run(imageId);
  deleteImageFiles(files);
}

// ---------- cards ----------

const CARD_SELECT = `
  SELECT k.*, u.username AS owner_username, u.contact_link AS owner_contact_link,
         c.name AS collection_name, c.is_public AS collection_public
  FROM cards k
  JOIN users u ON u.id = k.user_id
  JOIN collections c ON c.id = k.collection_id`;

export type CardInput = {
  player: string;
  year: string;
  brand: string;
  setName: string;
  cardNumber: string;
  team: string;
  sport: string;
  parallel: string;
  grade: string;
  rookie: boolean;
  notes: string;
  forSale: boolean;
  forTrade: boolean;
  listingNote: string;
};

export function createCard(
  userId: number,
  collectionId: number,
  input: CardInput,
  frontImageId: string,
  backImageId: string | null,
): Card {
  const result = db()
    .prepare(
      `INSERT INTO cards (user_id, collection_id, player, year, brand, set_name, card_number, team, sport,
         parallel, grade, rookie, notes, front_image_id, back_image_id, for_sale, for_trade, listing_note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      userId, collectionId, input.player, input.year, input.brand, input.setName, input.cardNumber,
      input.team, input.sport, input.parallel, input.grade, input.rookie ? 1 : 0, input.notes,
      frontImageId, backImageId, input.forSale ? 1 : 0, input.forTrade ? 1 : 0, input.listingNote,
    );
  return getCard(Number(result.lastInsertRowid))!;
}

export function getCard(id: number): Card | null {
  const row = db().prepare(`${CARD_SELECT} WHERE k.id = ?`).get(id) as Row | undefined;
  return row ? toCard(row) : null;
}

function likePattern(q: string): string {
  return `%${q.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;
}

const SEARCH_COLUMNS = ["k.player", "k.team", "k.brand", "k.set_name", "k.card_number", "k.year", "k.parallel"];

function searchClause(q: string, params: SQLInputValue[]): string {
  if (!q.trim()) return "";
  const pattern = likePattern(q.trim());
  for (let i = 0; i < SEARCH_COLUMNS.length; i++) params.push(pattern);
  return ` AND (${SEARCH_COLUMNS.map((c) => `${c} LIKE ? ESCAPE '\\'`).join(" OR ")})`;
}

export type CardFilter = { q?: string; listing?: "sale" | "trade" | "any" };

export function listCardsInCollection(collectionId: number, filter: CardFilter = {}): Card[] {
  const params: SQLInputValue[] = [collectionId];
  let sql = `${CARD_SELECT} WHERE k.collection_id = ?`;
  sql += searchClause(filter.q ?? "", params);
  if (filter.listing === "sale") sql += " AND k.for_sale = 1";
  if (filter.listing === "trade") sql += " AND k.for_trade = 1";
  if (filter.listing === "any") sql += " AND (k.for_sale = 1 OR k.for_trade = 1)";
  sql += " ORDER BY k.created_at DESC, k.id DESC";
  return (db().prepare(sql).all(...params) as Row[]).map(toCard);
}

/** Cards flagged for sale or trade in public collections, newest first. */
export function listListings(filter: CardFilter = {}, limit = 60): Card[] {
  const params: SQLInputValue[] = [];
  let sql = `${CARD_SELECT} WHERE c.is_public = 1`;
  if (filter.listing === "sale") sql += " AND k.for_sale = 1";
  else if (filter.listing === "trade") sql += " AND k.for_trade = 1";
  else sql += " AND (k.for_sale = 1 OR k.for_trade = 1)";
  sql += searchClause(filter.q ?? "", params);
  sql += " ORDER BY k.created_at DESC, k.id DESC LIMIT ?";
  params.push(limit);
  return (db().prepare(sql).all(...params) as Row[]).map(toCard);
}

export function listPublicListingsByUser(userId: number): Card[] {
  return (
    db()
      .prepare(`${CARD_SELECT} WHERE k.user_id = ? AND c.is_public = 1 AND (k.for_sale = 1 OR k.for_trade = 1) ORDER BY k.created_at DESC`)
      .all(userId) as Row[]
  ).map(toCard);
}

export function recentCards(userId: number, limit = 6): Card[] {
  return (db().prepare(`${CARD_SELECT} WHERE k.user_id = ? ORDER BY k.created_at DESC, k.id DESC LIMIT ?`).all(userId, limit) as Row[]).map(toCard);
}

export function countCards(userId: number): number {
  return (db().prepare("SELECT COUNT(*) AS n FROM cards WHERE user_id = ?").get(userId) as Row).n as number;
}

const COLUMN_FOR: Record<keyof CardInput, string> = {
  player: "player", year: "year", brand: "brand", setName: "set_name", cardNumber: "card_number",
  team: "team", sport: "sport", parallel: "parallel", grade: "grade", rookie: "rookie", notes: "notes",
  forSale: "for_sale", forTrade: "for_trade", listingNote: "listing_note",
};

export function updateCard(id: number, patch: Partial<CardInput> & { collectionId?: number }): void {
  const sets: string[] = [];
  const params: SQLInputValue[] = [];
  for (const key of Object.keys(COLUMN_FOR) as (keyof CardInput)[]) {
    const value = patch[key];
    if (value === undefined) continue;
    sets.push(`${COLUMN_FOR[key]} = ?`);
    params.push(typeof value === "boolean" ? (value ? 1 : 0) : value);
  }
  if (patch.collectionId !== undefined) {
    sets.push("collection_id = ?");
    params.push(patch.collectionId);
  }
  if (sets.length === 0) return;
  sets.push("updated_at = datetime('now')");
  params.push(id);
  db().prepare(`UPDATE cards SET ${sets.join(", ")} WHERE id = ?`).run(...params);
}

export function deleteCard(id: number): void {
  const conn = db();
  const card = conn.prepare("SELECT front_image_id, back_image_id FROM cards WHERE id = ?").get(id) as Row | undefined;
  if (!card) return;
  const imageIds = [card.front_image_id, card.back_image_id].filter((v): v is string => typeof v === "string");
  const files = imageIds.map((imageId) => (conn.prepare("SELECT filename FROM images WHERE id = ?").get(imageId) as Row | undefined)?.filename as string | undefined).filter((f): f is string => !!f);
  conn.prepare("DELETE FROM cards WHERE id = ?").run(id);
  for (const imageId of imageIds) conn.prepare("DELETE FROM images WHERE id = ?").run(imageId);
  deleteImageFiles(files);
}

// ---------- images ----------

export type ImageRecord = { id: string; userId: number; mime: string; filename: string };

export function getImage(id: string): ImageRecord | null {
  const row = db().prepare("SELECT * FROM images WHERE id = ?").get(id) as Row | undefined;
  return row ? { id: row.id as string, userId: row.user_id as number, mime: row.mime as string, filename: row.filename as string } : null;
}

/** True when the image belongs to a card in a public collection. */
export function imageIsPublic(id: string): boolean {
  return !!db()
    .prepare(
      `SELECT 1 FROM cards k JOIN collections c ON c.id = k.collection_id
       WHERE c.is_public = 1 AND (k.front_image_id = ? OR k.back_image_id = ?) LIMIT 1`,
    )
    .get(id, id);
}

export function imageOwnedBy(id: string, userId: number): boolean {
  return !!db().prepare("SELECT 1 FROM images WHERE id = ? AND user_id = ?").get(id, userId);
}

/** Remove uploads that were never attached to a card (abandoned scans) older than the cutoff. */
export function purgeOrphanImages(olderThanHours = 24): number {
  const conn = db();
  const rows = conn
    .prepare(
      `SELECT id, filename FROM images
       WHERE created_at < datetime('now', ?)
         AND id NOT IN (SELECT front_image_id FROM cards WHERE front_image_id IS NOT NULL)
         AND id NOT IN (SELECT back_image_id FROM cards WHERE back_image_id IS NOT NULL)`,
    )
    .all(`-${olderThanHours} hours`) as Row[];
  for (const row of rows) conn.prepare("DELETE FROM images WHERE id = ?").run(row.id as string);
  deleteImageFiles(rows.map((r) => r.filename as string));
  return rows.length;
}
