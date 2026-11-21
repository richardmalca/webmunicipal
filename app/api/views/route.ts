import { getDatabase, getEntries, isLocalCms } from "../../../lib/content";
import { getInstitutionalPages } from "../../../lib/institutional-store";
import { sections } from "../../../lib/presentation";
import { limaDay } from "../../../lib/metrics";

export async function POST(request: Request) {
  if (!isLocalCms()) return new Response(null, { status: 404 });
  if (request.headers.get("origin") !== process.env.AUTH_URL) return new Response(null, { status: 403 });
  const path = request.headers.get("x-page-path") ?? "";
  if (path.length > 180 || !/^\/(?:[a-z0-9-]+(?:\/[a-z0-9-]+)?)?$/.test(path)) return new Response(null, { status: 400 });
  const [, section, slug] = path.split("/");
  const known = path === "/" || path === "/buscar"
    || (section === "institucional" && getInstitutionalPages().some((item) => item.slug === (slug ?? "")))
    || (Object.hasOwn(sections, section) && (!slug || getEntries().some((entry) => entry.section === section && entry.slug === slug)));
  if (known) getDatabase().prepare(`
    INSERT INTO page_views VALUES (?, ?, 1)
    ON CONFLICT(day, path) DO UPDATE SET total = total + 1
  `).run(limaDay(), path);
  return new Response(null, { status: 204 });
}
