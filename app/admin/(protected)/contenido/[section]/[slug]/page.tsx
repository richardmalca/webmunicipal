import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ContentForm } from "../../../../../../components/admin/content-form";
import { Feedback } from "../../../../../../components/admin/dialog";
import { requireAdmin } from "../../../../../../lib/admin-auth";
import { findManaged, workflow } from "../../../../../../lib/cms";
import { sections } from "../../../../../../lib/presentation";

export const metadata = { title: "Editar contenido" };

export default async function EditContent({ params, searchParams }: { params: Promise<{ section: string; slug: string }>; searchParams: Promise<{ guardado?: string }> }) {
  await requireAdmin();
  const { section, slug } = await params;
  const { guardado } = await searchParams;
  const entry = findManaged(section, slug);
  if (!entry) notFound();

  return <>
    <Link className="cms-back" href={`/admin/contenido?seccion=${section}`}><ArrowLeft size={17} aria-hidden="true" /> {sections[section as keyof typeof sections]}</Link>
    <header className="cms-heading"><div><h1>Editar contenido</h1><p>{entry.title}</p></div><span className={`cms-state cms-state-${entry.state}`}>{workflow[entry.state]}</span></header>
    {guardado && <Feedback message={guardado === "publicado" ? "Contenido publicado en el portal." : "Borrador guardado."} />}
    <ContentForm entry={entry} defaultSection={section} today="" />
  </>;
}
