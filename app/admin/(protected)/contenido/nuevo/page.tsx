import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ContentForm } from "../../../../../components/admin/content-form";
import { requireAdmin } from "../../../../../lib/admin-auth";
import { limaDay } from "../../../../../lib/metrics";
import { sections } from "../../../../../lib/presentation";

export const metadata = { title: "Nuevo contenido" };

export default async function NewContent({ searchParams }: { searchParams: Promise<{ seccion?: string }> }) {
  await requireAdmin();
  const { seccion } = await searchParams;
  const section = typeof seccion === "string" && Object.hasOwn(sections, seccion) ? seccion : "noticias";
  return <>
    <Link className="cms-back" href="/admin/contenido"><ArrowLeft size={17} aria-hidden="true" /> Contenido</Link>
    <header className="cms-heading"><div><h1>Nuevo contenido</h1><p>Elige la sección y prepara la publicación.</p></div></header>
    <ContentForm defaultSection={section} today={limaDay()} />
  </>;
}
