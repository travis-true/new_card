import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { uploadsDir } from "@/lib/db";
import { saveUpload } from "@/lib/images";
import {
  createCard, createCollection, createUser, deleteCard, deleteCollection, DuplicateError, getCard, getImage,
  imageIsPublic, imageOwnedBy, listCardsInCollection, listCollections, listListings, purgeOrphanImages, updateCard,
  type CardInput,
} from "@/lib/repo";
import { db } from "@/lib/db";

const PNG = Buffer.from("89504e470d0a1a0a0000000d49484452", "hex");
const upload = (userId: number, name: string) => saveUpload(userId, new File([PNG], name, { type: "image/png" }), name);

const input = (over: Partial<CardInput> = {}): CardInput => ({
  player: "", year: "", brand: "", setName: "", cardNumber: "", team: "", sport: "baseball", parallel: "", grade: "",
  rookie: false, notes: "", forSale: false, forTrade: false, listingNote: "", ...over,
});

describe("repo", () => {
  it("creates users with a default collection and rejects duplicates", () => {
    const user = createUser("a@example.com", "alice", "hash");
    expect(listCollections(user.id).map((c) => c.name)).toEqual(["My Collection"]);
    expect(() => createUser("a@example.com", "other", "h")).toThrow(DuplicateError);
    expect(() => createUser("b@example.com", "ALICE", "h")).toThrow(DuplicateError);
  });

  it("stores, searches, filters and updates cards", async () => {
    const user = createUser("c@example.com", "carol", "hash");
    const col = listCollections(user.id)[0];
    const front = await upload(user.id, "front");
    const card = createCard(user.id, col.id, input({ player: "Mike Trout", team: "Angels", year: "2011", rookie: true }), front.id, null);
    const other = await upload(user.id, "front2");
    createCard(user.id, col.id, input({ player: "Shohei Ohtani", forSale: true }), other.id, null);

    expect(listCardsInCollection(col.id, { q: "trout" }).map((c) => c.player)).toEqual(["Mike Trout"]);
    expect(listCardsInCollection(col.id, { q: "%" })).toHaveLength(0); // wildcard is escaped
    expect(listCardsInCollection(col.id, { listing: "sale" }).map((c) => c.player)).toEqual(["Shohei Ohtani"]);

    updateCard(card.id, { grade: "PSA 10" });
    const updated = getCard(card.id)!;
    expect(updated.grade).toBe("PSA 10");
    expect(updated.player).toBe("Mike Trout"); // untouched
    expect(updated.rookie).toBe(true);
  });

  it("only lists public-collection listings and only exposes public images", async () => {
    const user = createUser("d@example.com", "dave", "hash");
    const pub = listCollections(user.id)[0];
    const priv = createCollection(user.id, "Secret", "", false);
    const a = await upload(user.id, "a");
    const b = await upload(user.id, "b");
    createCard(user.id, pub.id, input({ player: "Public Guy", forTrade: true }), a.id, null);
    createCard(user.id, priv.id, input({ player: "Private Guy", forSale: true }), b.id, null);

    const names = listListings({ q: "Guy" }).map((c) => c.player);
    expect(names).toContain("Public Guy");
    expect(names).not.toContain("Private Guy");
    expect(imageIsPublic(a.id)).toBe(true);
    expect(imageIsPublic(b.id)).toBe(false);
    expect(imageOwnedBy(b.id, user.id)).toBe(true);
    expect(imageOwnedBy(b.id, user.id + 99)).toBe(false);
  });

  it("deletes image files with cards and collections", async () => {
    const user = createUser("e@example.com", "erin", "hash");
    const col = createCollection(user.id, "Temp", "", true);
    const img = await upload(user.id, "x");
    const file = path.join(uploadsDir(), getImage(img.id)!.filename);
    const card = createCard(user.id, col.id, input(), img.id, null);
    expect(fs.existsSync(file)).toBe(true);
    deleteCard(card.id);
    expect(fs.existsSync(file)).toBe(false);
    expect(getImage(img.id)).toBeNull();

    const img2 = await upload(user.id, "y");
    const file2 = path.join(uploadsDir(), getImage(img2.id)!.filename);
    createCard(user.id, col.id, input(), img2.id, null);
    deleteCollection(col.id);
    expect(fs.existsSync(file2)).toBe(false);
  });

  it("purges only old orphan uploads", async () => {
    const user = createUser("f@example.com", "frank", "hash");
    const col = listCollections(user.id)[0];
    const keep = await upload(user.id, "keep");
    const orphanNew = await upload(user.id, "new");
    const orphanOld = await upload(user.id, "old");
    createCard(user.id, col.id, input(), keep.id, null);
    db().prepare("UPDATE images SET created_at = datetime('now', '-3 days') WHERE id IN (?, ?)").run(keep.id, orphanOld.id);
    expect(purgeOrphanImages(24)).toBe(1);
    expect(getImage(orphanOld.id)).toBeNull();
    expect(getImage(orphanNew.id)).not.toBeNull();
    expect(getImage(keep.id)).not.toBeNull();
  });
});
