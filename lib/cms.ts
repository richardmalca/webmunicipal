import { randomUUID } from "node:crypto";
import { getDatabase, type Entry } from "./content";

export const workflow = { published: "Publicado", draft: "Borrador", archived: "Archivado" } as const;
export type EntryState = keyof typeof workflow;
export type ManagedEntry = Entry & { state: EntryState; revision: number; updatedAt: string | null };
export type CmsFile = { id: string; name: string; mime: string; bytes: Uint8Array };

const select = `
  SELECT e.content, COALESCE(w.state, 'published') AS state,
    COALESCE(w.revision, 0) AS revision, w.updated_at
  FROM entries e LEFT JOIN entry_workflow w USING(section, slug)
`;

function managed(row: Record<string, unknown>): ManagedEntry {
  return { ...JSON.parse(String(row.content)), state: row.state, revision: row.revision, updatedAt: row.updated_at };
}

export function listManaged() {
  return getDatabase().prepare(select + " ORDER BY w.updated_at DESC, e.position").all().map(managed);
}

export function findManaged(section: string, slug: string) {
  const row = getDatabase().prepare(select + " WHERE e.section = ? AND e.slug = ?").get(section, slug);
  return row ? managed(row) : undefined;
}

export function storeEntry(entry: Entry, state: EntryState, expected: number | null, files: CmsFile[]) {
  const db = getDatabase();
  db.exec("BEGIN IMMEDIATE");
  try {
    const previous = findManaged(entry.section, entry.slug);
    if (expected === null ? previous : previous?.revision !== expected) {
      db.exec("ROLLBACK");
      return false;
    }
    const putFile = db.prepare("INSERT INTO cms_files VALUES (?, ?, ?, ?)");
    for (const file of files) putFile.run(file.id, file.name, file.mime, file.bytes);
    db.prepare(`
      INSERT INTO entries VALUES ((SELECT COALESCE(MAX(position), -1) + 1 FROM entries), ?, ?, ?)
      ON CONFLICT(section, slug) DO UPDATE SET content = excluded.content
    `).run(entry.section, entry.slug, JSON.stringify(entry));
    db.prepare(`
      INSERT INTO entry_workflow VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(section, slug) DO UPDATE SET state = excluded.state, revision = excluded.revision, updated_at = excluded.updated_at
    `).run(entry.section, entry.slug, state, (expected ?? 0) + 1, new Date().toISOString());
    db.exec("COMMIT");
    return true;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function changeState(section: string, slug: string, state: EntryState, expected: number) {
  const result = getDatabase().prepare(`
    INSERT INTO entry_workflow (section, slug, state, revision, updated_at)
    SELECT e.section, e.slug, ?, COALESCE(w.revision, 0) + 1, ?
    FROM entries e LEFT JOIN entry_workflow w USING(section, slug)
    WHERE e.section = ? AND e.slug = ? AND COALESCE(w.revision, 0) = ?
    ON CONFLICT(section, slug) DO UPDATE SET state = excluded.state, revision = excluded.revision, updated_at = excluded.updated_at
  `).run(state, new Date().toISOString(), section, slug, expected);
  return result.changes === 1;
}

export function uniqueSlug(section: string, title: string) {
  const base = title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 80).replace(/^-|-$/g, "") || "contenido";
  const removed = getDatabase().prepare("SELECT 1 FROM deleted_entries WHERE section = ? AND slug = ?").get(section, base);
  return (removed || findManaged(section, base)) ? `${base}-${randomUUID().slice(0, 8)}` : base;
}

export function getAssetUrl(file: CmsFile) {
  return `/archivos/${file.id}`;
}


export function deleteArchived(section: string, slug: string, revision: number) {
  const db = getDatabase();
  db.exec("BEGIN IMMEDIATE");
  try {
    const current = findManaged(section, slug);
    if (current?.state !== "archived" || current.revision !== revision) {
      db.exec("ROLLBACK");
      return false;
    }
    db.prepare("INSERT OR IGNORE INTO deleted_entries VALUES (?, ?)").run(section, slug);
    db.prepare("DELETE FROM entry_workflow WHERE section = ? AND slug = ?").run(section, slug);
    db.prepare("DELETE FROM entries WHERE section = ? AND slug = ?").run(section, slug);
    for (const url of new Set([current.cover, current.attachment, current.video, ...(current.photos ?? [])])) {
      if (!url?.startsWith("/archivos/")) continue;
      if (!db.prepare("SELECT 1 FROM entries WHERE instr(content, ?) > 0 LIMIT 1").get(url)) {
        db.prepare("DELETE FROM cms_files WHERE id = ?").run(url.split("/").at(-1)!);
      }
    }
    db.exec("COMMIT");
    return true;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
