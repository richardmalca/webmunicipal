import { auth } from "../../../auth";
import { getDatabase, isLocalCms } from "../../../lib/content";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isLocalCms() || !/^[0-9a-f-]{36}$/.test(id)) return new Response(null, { status: 404 });
  const db = getDatabase();
  const file = db.prepare("SELECT name, mime, length(bytes) AS size FROM cms_files WHERE id = ?").get(id);
  if (!file) return new Response(null, { status: 404 });
  const url = `/archivos/${id}`;
  const published = db.prepare(`
    SELECT 1 FROM entries e LEFT JOIN entry_workflow w USING(section, slug)
    WHERE COALESCE(w.state, 'published') = 'published' AND (
      json_extract(e.content, '$.cover') = ? OR json_extract(e.content, '$.video') = ?
      OR json_extract(e.content, '$.attachment') = ? OR EXISTS (
        SELECT 1 FROM json_each(e.content, '$.photos') WHERE value = ?
      )
    ) LIMIT 1
  `).get(url, url, url, url);
  const institutional = db.prepare("SELECT 1 FROM cms_meta WHERE name = 'institution' AND json_extract(value, '$.profile.logo') = ?").get(url);
  if (!published && !institutional) {
    const session = await auth();
    if (session?.user?.email !== process.env.ADMIN_EMAIL?.toLowerCase() || !session?.user?.email) return new Response(null, { status: 404 });
  }
  const size = Number(file.size);
  const headers = new Headers({
    "Content-Type": String(file.mime),
    "Content-Length": String(size),
    "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(String(file.name)).replace(/'/g, "%27")}`,
    "Accept-Ranges": "bytes",
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "private, no-store",
    "Content-Security-Policy": "default-src 'none'; sandbox",
  });
  const range = request.headers.get("range");
  let start = 0;
  let end = size - 1;
  if (range) {
    const parsed = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!parsed || (!parsed[1] && !parsed[2])) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    if (parsed[1]) {
      start = Number(parsed[1]);
      end = parsed[2] ? Math.min(end, Number(parsed[2])) : end;
    } else {
      start = Math.max(0, size - Number(parsed[2]));
    }
    if (start > end || !Number.isSafeInteger(start) || !Number.isSafeInteger(end)) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    headers.set("Content-Range", `bytes ${start}-${end}/${size}`);
    headers.set("Content-Length", String(end - start + 1));
  }
  const row = db.prepare("SELECT substr(bytes, ?, ?) AS chunk FROM cms_files WHERE id = ?").get(start + 1, end - start + 1, id);
  return new Response(request.method === "HEAD" ? null : Uint8Array.from(row?.chunk as Uint8Array), { status: range ? 206 : 200, headers });
}

export const HEAD = GET;
