import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ChevronLeft, ChevronRight, ClipboardList, Download, FileText, Search } from "lucide-react";
import { EntryCard } from "../../components/entry-card";
import { getEntries, type Entry } from "../../lib/content";
import { formatDate, normalize, sections } from "../../lib/presentation";

const descriptions: Record<keyof typeof sections, string> = {
  noticias: "Comunicados, actividades y novedades de Villa del Sol.",
  avisos: "Horarios especiales, desvíos y anuncios de los servicios municipales.",
  tramites: "Consulta los requisitos, los pasos y el área que atiende cada solicitud.",
  directorio: "Ubica las áreas municipales y consulta sus horarios de atención.",
  transparencia: "Consulta ordenanzas, acuerdos, actas y documentos de gestión del municipio ficticio.",
  agenda: "Fechas, horarios y lugares de las actividades del distrito.",
  galerias: "Recorre Villa del Sol a través de series de fotografías referenciales.",
  videos: "Mira notas periodísticas en video y montajes audiovisuales del portal.",
};

type CatalogQuery = Record<string, string | string[] | undefined>;

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  return { title: sections[section as keyof typeof sections] };
}

function DocumentList({ entries }: { entries: Entry[] }) {
  return (
    <div className="document-list">
      <div className="document-header" aria-hidden="true"><span>Documento</span><span>Publicación</span><span>Archivo</span></div>
      <ul>
        {entries.map((entry) => (
          <li key={entry.slug} className="document-row">
            <div className="document-title">
              <span className="catalog-icon"><FileText size={20} aria-hidden="true" /></span>
              <div>
                <span className="meta">{entry.category}</span>
                <Link href={`/transparencia/${entry.slug}`}>{entry.title}</Link>
                <p>{entry.description}</p>
              </div>
            </div>
            {entry.date && <time dateTime={entry.date}>{formatDate(entry.date, { day: "numeric", month: "short", year: "numeric" })}</time>}
            {entry.attachment && <a className="document-download" download href={entry.attachment} aria-label={`Descargar ${entry.title} en PDF`}><Download size={17} aria-hidden="true" /> PDF</a>}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ServiceList({ entries }: { entries: Entry[] }) {
  return (
    <ul className="service-list">
      {entries.map((entry) => (
        <li key={entry.slug}>
          <Link href={`/tramites/${entry.slug}`}>
            <span className="catalog-icon"><ClipboardList size={21} aria-hidden="true" /></span>
            <div>
              <p className="meta">{entry.category}</p>
              <h3>{entry.title}</h3>
              <p>{entry.description}</p>
              {entry.office && <span className="service-office">{entry.office}</span>}
            </div>
            <ArrowRight className="service-arrow" size={18} aria-hidden="true" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default async function SectionPage({ params, searchParams }: {
  params: Promise<{ section: string }>;
  searchParams: Promise<CatalogQuery>;
}) {
  const { section } = await params;
  const query = await searchParams;
  if (!Object.hasOwn(sections, section)) notFound();
  const key = section as keyof typeof sections;
  const title = sections[key];
  const getQuery = (name: string) => typeof query[name] === "string" ? query[name] : "";
  const category = getQuery("tipo");
  const year = getQuery("anio");
  const search = getQuery("q").trim();
  const terms = normalize(search).split(/\s+/).filter(Boolean);
  const requestedPage = Number(getQuery("pagina"));
  const format = key === "noticias" ? getQuery("formato") : "";
  const entries = getEntries().filter((entry) => entry.section === key || (key === "videos" && Boolean(entry.video)));
  const categories = [...new Set(entries.map((entry) => entry.category))].sort((left, right) => left.localeCompare(right, "es"));
  const years = [...new Set(entries.flatMap((entry) => entry.date ? [entry.date.slice(0, 4)] : []))].sort().reverse();
  const filtered = entries.filter((entry) => {
    const searchable = normalize([entry.title, entry.description, entry.category, entry.office, entry.body].join(" "));
    const matchesFormat = format === "video" ? Boolean(entry.video) : format !== "texto" || !entry.video;
    return matchesFormat && (!category || entry.category === category) && (!year || entry.date?.startsWith(year)) && terms.every((term) => searchable.includes(term));
  }).sort((left, right) => {
    const byDate = (right.date ?? "").localeCompare(left.date ?? "");
    return key === "agenda" ? -byDate : byDate;
  });
  const hasIndex = key === "tramites" || key === "transparencia";
  const imageGrid = key === "noticias" || key === "galerias" || key === "videos";
  const pageSize = imageGrid ? 9 : 8;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const page = Number.isSafeInteger(requestedPage) ? Math.min(Math.max(requestedPage, 1), pageCount) : 1;
  const start = (page - 1) * pageSize;
  const visible = filtered.slice(start, start + pageSize);
  const hasFilters = Boolean(category || year || search || format);

  function catalogUrl(nextCategory: string, nextPage = 1) {
    const values = new URLSearchParams();
    if (search) values.set("q", search);
    if (nextCategory) values.set("tipo", nextCategory);
    if (year) values.set("anio", year);
    if (format) values.set("formato", format);
    if (nextPage > 1) values.set("pagina", String(nextPage));
    return values.size ? `/${key}?${values}` : `/${key}`;
  }

  const resultLabel = key === "tramites" ? ["trámite", "trámites"] : key === "transparencia" ? ["documento", "documentos"] : ["resultado", "resultados"];

  return (
    <div className="frame subpage catalog-page">
      <header className="catalog-heading">
        <div className="breadcrumb"><Link href="/">Inicio</Link> / {title}</div>
        <h1>{title}</h1>
        <p>{descriptions[key]}</p>
      </header>
      <div className={hasIndex ? "catalog-layout has-index" : "catalog-layout"}>
        {hasIndex && (
          <aside className="catalog-index" aria-labelledby="catalog-index-heading">
            <h2 id="catalog-index-heading">{key === "transparencia" ? "Tipos de documento" : "Categorías"}</h2>
            <nav aria-labelledby="catalog-index-heading">
              <Link href={catalogUrl("")} aria-current={!category ? "page" : undefined}><span>{key === "transparencia" ? "Todos los documentos" : "Todos los trámites"}</span><span>{entries.length}</span></Link>
              {categories.map((item) => <Link key={item} href={catalogUrl(item)} aria-current={category === item ? "page" : undefined}><span>{item}</span><span>{entries.filter((entry) => entry.category === item).length}</span></Link>)}
            </nav>
            {key === "tramites" && <Link className="catalog-help" href="/directorio">Consultar el directorio <ArrowRight size={16} aria-hidden="true" /></Link>}
          </aside>
        )}
        <section className="catalog-results" aria-label={`Resultados de ${title}`}>
          <form action={`/${key}`} className="filters catalog-filters">
            <label className="catalog-search">Buscar en {title.toLowerCase()}<input type="search" name="q" defaultValue={search} placeholder={key === "tramites" ? "Ej. impuesto predial" : key === "transparencia" ? "Ej. ordenanza o presupuesto" : "Escribe una palabra clave"} /></label>
            {categories.length > 1 && <label>{key === "transparencia" ? "Tipo de documento" : "Categoría"}<select name="tipo" defaultValue={category}><option value="">{key === "transparencia" ? "Todos" : "Todas"}</option>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>}
            {key === "noticias" && <label>Formato<select name="formato" aria-label="Formato" defaultValue={format}><option value="">Todos</option><option value="texto">Nota escrita</option><option value="video">Nota en video</option></select></label>}
            {years.length > 1 && <label>Año<select name="anio" aria-label="Año" defaultValue={year}><option value="">Todos</option>{years.map((item) => <option key={item}>{item}</option>)}</select></label>}
            <button className="primary-button" type="submit"><Search size={17} aria-hidden="true" /> Buscar</button>
          </form>
          <div className="catalog-summary">
            <h2>{filtered.length} {resultLabel[filtered.length === 1 ? 0 : 1]}{search && <> para «{search}»</>}</h2>
            {hasFilters && <Link href={`/${key}`}>Quitar filtros</Link>}
          </div>
          {!visible.length ? <p className="catalog-empty">Prueba con otra palabra o cambia los filtros.</p> :
            key === "transparencia" ? <DocumentList entries={visible} /> :
            key === "tramites" ? <ServiceList entries={visible} /> :
            <div className={imageGrid ? "story-grid" : "entry-list"}>
              {visible.map((entry) => <EntryCard key={entry.slug} entry={entry} />)}
            </div>
          }
          {pageCount > 1 && <nav aria-label="Paginación" className="pagination">
            {page > 1 && <Link href={catalogUrl(category, page - 1)}><ChevronLeft size={17} aria-hidden="true" /> Anterior</Link>}
            <span>Página {page} de {pageCount}</span>
            {page < pageCount && <Link href={catalogUrl(category, page + 1)}>Siguiente <ChevronRight size={17} aria-hidden="true" /></Link>}
          </nav>}
        </section>
      </div>
    </div>
  );
}
