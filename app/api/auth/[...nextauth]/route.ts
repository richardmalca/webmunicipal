import { handlers } from "../../../../auth";
import { isLocalCms } from "../../../../lib/content";

export function GET(request: Parameters<typeof handlers.GET>[0]) {
  return isLocalCms() ? handlers.GET(request) : new Response(null, { status: 404 });
}

export function POST(request: Parameters<typeof handlers.POST>[0]) {
  return isLocalCms() ? handlers.POST(request) : new Response(null, { status: 404 });
}
