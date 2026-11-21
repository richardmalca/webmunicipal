import { notFound, redirect } from "next/navigation";
import { isLocalCms } from "../../lib/content";

export default function EditorPage() {
  if (!isLocalCms()) notFound();
  redirect("/admin/contenido");
}
