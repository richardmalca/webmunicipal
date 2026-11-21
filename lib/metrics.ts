import { getDatabase, getEntries } from "./content";
import { getInstitutionalPages } from "./institutional-store";
import { sections } from "./presentation";

export function limaDay(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "America/Lima" }).format(date);
}

export function metrics() {
  const db = getDatabase();
  const now = new Date();
  const days = Array.from({ length: 7 }, (_, index) => limaDay(new Date(now.getTime() - (6 - index) * 86400000)));
  const found = db.prepare("SELECT day, SUM(total) AS total FROM page_views WHERE day >= ? GROUP BY day").all(days[0]);
  const totals = new Map(found.map((row) => [String(row.day), Number(row.total)]));
  const views = days.map((day) => ({ day, total: totals.get(day) ?? 0 }));
  const institutionTitles = new Map(getInstitutionalPages().map(({ slug, title }) => [slug ? `/institucional/${slug}` : "/institucional", slug ? title : "Institucional"]));
  const entries = new Map(getEntries().map((entry) => [`/${entry.section}/${entry.slug}`, entry.title]));
  const top = db.prepare("SELECT path, SUM(total) AS total FROM page_views WHERE day >= ? GROUP BY path ORDER BY total DESC, path LIMIT 6").all(days[0])
    .map((row) => {
      const path = String(row.path);
      return { path, title: entries.get(path) ?? institutionTitles.get(path) ?? (path === "/" ? "Inicio" : path === "/buscar" ? "Buscar" : sections[path.slice(1) as keyof typeof sections] ?? path), total: Number(row.total) };
    });
  return { views, top, total: views.reduce((sum, day) => sum + day.total, 0) };
}
