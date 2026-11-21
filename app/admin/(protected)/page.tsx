import Link from "next/link";
import { Archive, ArrowRight, Eye, FileClock, FileCheck2, Plus } from "lucide-react";
import { requireAdmin } from "../../../lib/admin-auth";
import { listManaged, workflow } from "../../../lib/cms";
import { metrics } from "../../../lib/metrics";
import { formatDate, sections } from "../../../lib/presentation";

export const metadata = { title: "Panel de administración" };
export const dynamic = "force-dynamic";

export default async function Dashboard() {
  await requireAdmin();
  const entries = listManaged();
  const activity = metrics();
  const max = Math.max(1, ...activity.views.map((day) => day.total));
  const cards = [
    { label: "Visitas en 7 días", value: activity.total, icon: Eye },
    { label: "Publicaciones activas", value: entries.filter(({state}) => state === "published").length, icon: FileCheck2 },
    { label: "Borradores", value: entries.filter(({state}) => state === "draft").length, icon: FileClock },
    { label: "Archivados", value: entries.filter(({state}) => state === "archived").length, icon: Archive },
  ];
  const recent = entries.filter((entry) => entry.updatedAt).slice(0, 5);

  return (
    <>
      <header className="cms-heading">
        <div><h1>Resumen del portal</h1><p>Actividad de los últimos siete días, según la hora de Lima.</p></div>
        <Link href="/admin/contenido/nuevo" className="primary-button"><Plus size={18} aria-hidden="true" /> Nuevo contenido</Link>
      </header>
      <div className="cms-kpis">{cards.map(({ label, value, icon: Icon }) => <article key={label}><Icon size={20} aria-hidden="true" /><p>{label}</p><strong>{value.toLocaleString("es-PE")}</strong></article>)}</div>
      <div className="cms-overview-grid">
        <section className="cms-panel cms-chart">
          <h2>Visitas por día</h2>
          <p>Cargas de páginas públicas en esta demo local.</p>
          <ol className="cms-bars">
            {activity.views.map(({ day, total }) => <li key={day}><strong>{total}</strong><div className="cms-bar-track"><span style={{ height: total ? `${total / max * 100}%` : "2px" }} /></div><time dateTime={day}>{formatDate(day, { weekday: "short", day: "numeric" })}</time></li>)}
          </ol>
        </section>
        <section className="cms-panel">
          <h2>Páginas más vistas</h2>
          {activity.top.length ? <ol className="cms-top-pages">{activity.top.map(({ path, title, total }) => <li key={path}><Link href={path}>{title}</Link><strong>{total}</strong></li>)}</ol> : <p>Las visitas se mostrarán al navegar por el portal público.</p>}
        </section>
      </div>
      <section className="cms-panel">
        <div className="cms-panel-heading"><h2>Últimos cambios</h2><Link className="text-link" href="/admin/contenido">Ver contenido <ArrowRight size={17} aria-hidden="true" /></Link></div>
        {recent.length ? <ul className="cms-top-pages">{recent.map((entry) => <li key={`${entry.section}/${entry.slug}`}><Link href={`/admin/contenido/${entry.section}/${entry.slug}`}>{entry.title}</Link><span>{sections[entry.section as keyof typeof sections]} · {workflow[entry.state]}</span></li>)}</ul> : <p>Aquí aparecerán las publicaciones que guardes, publiques o archives.</p>}
      </section>
    </>
  );
}
