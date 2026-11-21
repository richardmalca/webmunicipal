import seed from "./content.json";
import { mkdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import path from "node:path";

export type Entry = {
  section: string;
  slug: string;
  title: string;
  description: string;
  body: string;
  category: string;
  date?: string;
  image?: string;
  cover?: string;
  coverAlt?: string;
  photos?: string[];
  video?: string;
  videoDuration?: string;
  videoSource?: string;
  videoCredit?: string;
  captions?: string;
  attachment?: string;
  office?: string;
  requirements?: string[];
  steps?: string[];
};

let database: DatabaseSync | undefined;

export function isLocalCms() {
  return process.env.NODE_ENV === "development" && !process.env.VERCEL;
}

export function getDatabase() {
  if (database) return database;
  const folder = path.join(process.cwd(), ".demo");
  mkdirSync(folder, { recursive: true });
  const connection = new DatabaseSync(path.join(folder, "content.sqlite"));
  connection.exec("CREATE TABLE IF NOT EXISTS entries (position INTEGER PRIMARY KEY, section TEXT NOT NULL, slug TEXT NOT NULL, content TEXT NOT NULL, UNIQUE(section, slug))");
  connection.exec(`
    PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS cms_meta (name TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS entry_workflow (
      section TEXT NOT NULL, slug TEXT NOT NULL, state TEXT NOT NULL CHECK (state IN ('draft','published','archived')),
      revision INTEGER NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY(section, slug)
    );
    CREATE TABLE IF NOT EXISTS deleted_entries (section TEXT NOT NULL, slug TEXT NOT NULL, PRIMARY KEY (section, slug));
    CREATE TABLE IF NOT EXISTS cms_files (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, mime TEXT NOT NULL, bytes BLOB NOT NULL
    );
    CREATE TABLE IF NOT EXISTS page_views (
      day TEXT NOT NULL, path TEXT NOT NULL, total INTEGER NOT NULL, PRIMARY KEY (day, path)
    );
    CREATE TABLE IF NOT EXISTS login_limits (
      subject TEXT PRIMARY KEY, attempts INTEGER NOT NULL, expires INTEGER NOT NULL
    );
  `);
  connection.exec("BEGIN IMMEDIATE");
  try {
    const initialized = connection.prepare("SELECT 1 FROM cms_meta WHERE name = 'workflow'").get();
    const insert = connection.prepare(initialized
      ? "INSERT OR IGNORE INTO entries(position, section, slug, content) VALUES ((SELECT COALESCE(MAX(position), -1) + 1 FROM entries), ?, ?, ?)"
      : "INSERT INTO entries(position, section, slug, content) VALUES ((SELECT COALESCE(MAX(position), -1) + 1 FROM entries), ?, ?, ?) " +
        "ON CONFLICT(section, slug) DO UPDATE SET content = json_patch(excluded.content, json_object(" +
        "'title', json_extract(entries.content, '$.title'), 'description', json_extract(entries.content, '$.description')))");
    const deleted = connection.prepare("SELECT 1 FROM deleted_entries WHERE section = ? AND slug = ?");
    seed.forEach((item) => { if (!deleted.get(item.section, item.slug)) insert.run(item.section, item.slug, JSON.stringify(item)); });
    connection.prepare("INSERT OR IGNORE INTO cms_meta VALUES ('workflow', '1')").run();
    connection.exec("COMMIT");
  } catch (error) {
    connection.exec("ROLLBACK");
    connection.close();
    throw error;
  }
  database = connection;
  return connection;
}

export function getEntries(): Entry[] {
  if (!isLocalCms()) return seed;
  return getDatabase().prepare(`
    SELECT e.content FROM entries e
    LEFT JOIN entry_workflow w USING(section, slug)
    WHERE COALESCE(w.state, 'published') = 'published'
    ORDER BY e.position
  `).all().map((row) => JSON.parse(String(row.content)) as Entry);
}
