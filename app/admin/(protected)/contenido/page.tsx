import Link from "next/link";
import { ExternalLink, ChevronLeft, ChevronRight, Plus, Search } from "lucide-react";
import { Feedback } from "../../../../components/admin/dialog";
import { requireAdmin } from "../../../../lib/admin-auth";
import { listManaged, workflow } from "../../../../lib/cms";
import { normalize, sections } from "../../../../lib/presentation";

export const metadata = { title: "Contenido" };

export default async function ContentList({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const query = await searchParams;
  const q = typeof query.q === "string" ? query.q.trim().slice(0, 150) : "";
  const section = typeof query.seccion === "string" && Object.hasOwn(sections, query.seccion) ? query.seccion : "";
  const state = typeof query.estado === "string" && Object.hasOwn(workflow, query.estado) ? query.estado : "";
  const entries = listManaged().filter((entry) => (!section || entry.section === section) && (!state || entry.state === state) && normalize(entry.title + " " + entry.category).includes(normalize(q)));
  const size = 14;
  const max = Math.max(1, Math.ceil(entries.length / size));
  const wanted = typeof query.pagina === "string" ? Number(query.pagina) : 1;
  const page = Number.isSafeInteger(wanted) ? Math.max(1, Math.min(max, wanted)) : 1;
  const visible = entries.slice((page - 1) * size, page * size);
  function url(next: number) {
    const params = new URLSearchParams({ pagina: String(next) });
    if (q) params.set("q", q);
    if (section) params.set("seccion", section);
    if (state) params.set("estado", state);
    return `/admin/contenido?${params}`;
  }
  return <>
    <header className="cms-heading"><div><h1>{section ? sections[section as keyof typeof sections] : "Contenido"}</h1><p>Gestiona las publicaciones y los archivos de todas las secciones.</p></div><Link className="primary-button" href={`/admin/contenido/nuevo${section ? `?seccion=${section}` : ""}`}><Plus size={18} aria-hidden="true" /> Nuevo contenido</Link></header>
    {query.eliminado === "1" && <Feedback message="Contenido eliminado definitivamente." />}
    <nav className="cms-module-tabs cms-content-tabs" aria-label="Secciones de contenido">
      <Link href="/admin/contenido" aria-current={!section ? "page" : undefined}>Todas</Link>
      {Object.entries(sections).map(([id, label]) => <Link key={id} href={`/admin/contenido?seccion=${id}`} aria-current={id === section ? "page" : undefined}>{label}</Link>)}
    </nav>
    <section className="cms-panel cms-list">
      <form action="/admin/contenido" className="cms-form cms-filters">
        <label>Buscar contenido<input name="q" type="search" defaultValue={q} placeholder="Título o categoría" /></label>
        <label>Sección<select name="seccion" aria-label="Sección" defaultValue={section}><option value="">Todas</option>{Object.entries(sections).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
        <label>Estado<select name="estado" aria-label="Estado" defaultValue={state}><option value="">Todos</option>{Object.entries(workflow).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
        <button className="cms-button"><Search size={17} aria-hidden="true" /> Filtrar</button>
      </form>
      <div className="cms-panel-heading"><h2>{entries.length} {entries.length === 1 ? "registro" : "registros"}</h2>{(q || section || state) && <Link className="text-link" href="/admin/contenido">Quitar filtros</Link>}</div>
      {visible.length ? <ul className="cms-records">{visible.map((entry) => <li key={`${entry.section}/${entry.slug}`}>
        <div><Link href={`/admin/contenido/${entry.section}/${entry.slug}`}>{entry.title}</Link><small>{sections[entry.section as keyof typeof sections]} · {entry.category}{entry.video && " · Video"}{entry.attachment && " · PDF"}</small></div>
        <span className={`cms-state cms-state-${entry.state}`}>{workflow[entry.state]}</span>
        <div className="cms-record-actions"><Link className="cms-button" href={`/admin/contenido/${entry.section}/${entry.slug}`}>Editar <span className="visually-hidden">{entry.title}</span></Link>{entry.state === "published" && <Link className="cms-icon-button" href={`/${entry.section}/${entry.slug}`} target="_blank" aria-label={`Ver ${entry.title} en el portal`}><ExternalLink size={18} /></Link>}</div>
      </li>)}</ul> : <p className="catalog-empty">No hay contenido que coincida con estos filtros.</p>}
      {max > 1 && <nav className="pagination" aria-label="Paginación">{page > 1 && <Link href={url(page - 1)}><ChevronLeft size={17} /> Anterior</Link>}<span>Página {page} de {max}</span>{page < max && <Link href={url(page + 1)}>Siguiente <ChevronRight size={17} /></Link>}</nav>}
    </section>
  </>;
}
