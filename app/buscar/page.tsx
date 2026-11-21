import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Building2, CalendarDays, ChevronLeft, ChevronRight, ClipboardList, FileText, Search, X } from "lucide-react";
import { EntryCard } from "../../components/entry-card";
import { getEntries } from "../../lib/content";
import { getInstitutionalPages } from "../../lib/institutional-store";
import { normalize, resolvePhoto, sections } from "../../lib/presentation";

const suggestions = ["Licencia de funcionamiento", "Impuesto predial", "Ordenanzas", "Alcaldía"];
const shortcuts = [
  { href: "/tramites", label: "Trámites", description: "Requisitos y pasos", icon: ClipboardList },
  { href: "/transparencia", label: "Transparencia", description: "Normas y documentos PDF", icon: FileText },
  { href: "/institucional/equipo", label: "Directorio de personal", description: "Busca por nombre, cargo o área", icon: Building2 },
  { href: "/agenda", label: "Agenda", description: "Próximas actividades", icon: CalendarDays },
];

export const metadata = { title: "Buscar" };
export const dynamic = "force-dynamic";

function searchUrl(query: string, section = "", page = 1) {
  const params = new URLSearchParams({ q: query });
  if (section) params.set("seccion", section);
  if (page > 1) params.set("pagina", String(page));
  return `/buscar?${params}`;
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { q, seccion, pagina } = await searchParams;
  const query = typeof q === "string" ? q.trim().slice(0, 150) : "";
  const requestedSection = typeof seccion === "string" ? seccion : "";
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  const entries = getEntries();
  const index = [
    ...entries.map((entry) => ({
      href: `/${entry.section}/${entry.slug}`,
      title: entry.title,
      description: entry.description,
      section: entry.section,
      label: sections[entry.section as keyof typeof sections],
      image: resolvePhoto(entry.cover ?? entry.image ?? entry.photos?.[0], entry.coverAlt),
      keywords: [entry.category, entry.body, entry.office, ...(entry.requirements ?? [])].join(" "),
    })),
    ...getInstitutionalPages().map((item) => ({
      href: item.slug ? `/institucional/${item.slug}` : "/institucional",
      title: item.slug ? item.title : "Información institucional",
      description: item.description,
      section: "institucional",
      label: "Institucional",
      image: undefined,
      keywords: "body" in item ? item.body : "",
    })),
  ];
  const matches = query ? index.flatMap((item) => {
    const title = normalize(item.title);
    const summary = normalize(item.description);
    const searchable = [title, summary, normalize(`${item.label} ${item.keywords}`)].join(" ");
    if (!terms.every((term) => searchable.includes(term))) return [];
    const score = (title.includes(normalize(query)) ? 8 : 0) + terms.reduce((sum, term) => sum + (title.includes(term) ? 3 : summary.includes(term) ? 1 : 0), 0);
    return [{ ...item, score }];
  }).sort((left, right) => right.score - left.score) : [];
  const categories = [...new Map(matches.map(({ section, label }) => [section, label]))];
  const section = categories.some(([id]) => id === requestedSection) ? requestedSection : "";
  const filtered = section ? matches.filter((item) => item.section === section) : matches;
  const size = 8;
  const pageCount = Math.max(1, Math.ceil(filtered.length / size));
  const requestedPage = typeof pagina === "string" ? Number(pagina) : 1;
  const page = Number.isSafeInteger(requestedPage) ? Math.min(Math.max(1, requestedPage), pageCount) : 1;
  const visible = filtered.slice((page - 1) * size, page * size);
  const recentNews = query ? [] : entries.filter((entry) => entry.section === "noticias").sort((left, right) => (right.date ?? "").localeCompare(left.date ?? "")).slice(0, 3);

  return (
    <div className="frame subpage portal-search">
      <div className="breadcrumb"><Link href="/">Inicio</Link> / Buscar</div>
      <section className="search-intro" aria-labelledby="search-heading">
        <h1 id="search-heading">Buscar en el portal</h1>
        <p>Encuentra trámites, documentos, áreas municipales y noticias.</p>
        <form action="/buscar" className="portal-search-form" role="search">
          <div className="search-field">
            <label htmlFor="portal-search-input" className="visually-hidden">Palabra o tema</label>
            <Search size={21} aria-hidden="true" />
            <input key={query} id="portal-search-input" type="search" name="q" defaultValue={query} maxLength={150} placeholder="Ej. licencia de funcionamiento" />
          </div>
          <button className="primary-button" type="submit">Buscar</button>
          {query && <Link href="/buscar" className="icon-button" aria-label="Limpiar búsqueda"><X size={19} aria-hidden="true" /></Link>}
        </form>
        <div className="search-suggestions">
          <strong>{query ? "También puedes buscar" : "Búsquedas sugeridas"}</strong>
          <ul>{suggestions.map((item) => <li key={item}><Link href={searchUrl(item)}>{item}</Link></li>)}</ul>
        </div>
      </section>

      <div className="search-layout">
        {query ? (
          <section aria-labelledby="search-results-heading" className="search-content">
            <h2 id="search-results-heading">{filtered.length} {filtered.length === 1 ? "resultado" : "resultados"} para «{query}»</h2>
            {categories.length > 1 && <nav className="search-categories" aria-label="Filtrar resultados por sección">
              <Link href={searchUrl(query)} aria-current={!section ? "page" : undefined}>Todos</Link>
              {categories.map(([id, label]) => <Link key={id} href={searchUrl(query, id)} aria-current={section === id ? "page" : undefined}>{label}</Link>)}
            </nav>}
            {visible.length ? <ul className="search-results">
              {visible.map((item) => <li key={item.href}>
                <Link href={item.href}>
                  {item.image ? <span className="search-thumb"><Image src={item.image.src} alt="" unoptimized={item.image.unoptimized} fill sizes="80px" /></span> : <span className="search-thumb"><FileText size={22} aria-hidden="true" /></span>}
                  <div><p className="meta">{item.label}</p><h3>{item.title}</h3><p>{item.description}</p></div>
                  <ArrowRight size={18} aria-hidden="true" />
                </Link>
              </li>)}
            </ul> : <div className="catalog-empty"><p>Prueba con una palabra más corta o elige una búsqueda sugerida.</p></div>}
            {pageCount > 1 && <nav aria-label="Paginación" className="pagination">
              {page > 1 && <Link href={searchUrl(query, section, page - 1)}><ChevronLeft size={17} aria-hidden="true" /> Anterior</Link>}
              <span>Página {page} de {pageCount}</span>
              {page < pageCount && <Link href={searchUrl(query, section, page + 1)}>Siguiente <ChevronRight size={17} aria-hidden="true" /></Link>}
            </nav>}
          </section>
        ) : (
          <section aria-labelledby="search-news-heading" className="search-content">
            <div className="section-heading"><h2 id="search-news-heading">Últimas noticias</h2><Link href="/noticias" className="text-link">Ver noticias <ArrowRight size={17} aria-hidden="true" /></Link></div>
            <div className="story-grid">{recentNews.map((entry) => <EntryCard key={entry.slug} entry={entry} />)}</div>
          </section>
        )}
        <aside className="search-shortcuts" aria-labelledby="search-shortcuts-heading">
          <h2 id="search-shortcuts-heading">Accesos directos</h2>
          <ul>{shortcuts.map(({ href, label, description, icon: Icon }) => (
            <li key={href}><Link href={href}><span className="catalog-icon"><Icon size={19} aria-hidden="true" /></span><span><strong>{label}</strong><small>{description}</small></span><ArrowRight size={17} aria-hidden="true" /></Link></li>
          ))}</ul>
        </aside>
      </div>
    </div>
  );
}
