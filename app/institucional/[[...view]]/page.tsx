import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Building2, Download, FileText, Landmark, Network, Users, Megaphone } from "lucide-react";
import { getEntries } from "../../../lib/content";
import { getInstitutionalPages, getInstitutionalProfile, type InstitutionProfile, type Unit } from "../../../lib/institutional-store";
import { normalize } from "../../../lib/presentation";

type PageProps = {
  params: Promise<{ view?: string[] }>;
  searchParams: Promise<{ q?: string; area?: string }>;
};

const sectionIcons = [Landmark, Network, Users, Megaphone];

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Pick<PageProps, "params">) {
  const { view = [] } = await params;
  const page = getInstitutionalPages().find(({ slug }) => slug === view.join("/"));
  return { title: page?.slug ? page.title : "Institucional" };
}

function PersonCard({ name, role, description }: { name: string; role: string; description: string }) {
  const initials = name.split(" ").slice(0, 2).map((part) => part[0]).join("");
  return (
    <article className="person-card">
      <span className="person-avatar" aria-hidden="true">{initials}</span>
      <div><p className="meta">{role}</p><h3>{name}</h3><p>{description}</p></div>
    </article>
  );
}

function Overview({ profile }: { profile: InstitutionProfile }) {
  return (
    <>
      <section className="institution-feature">
        <div>
          <h2>Municipalidad de Villa del Sol</h2>
          <p>{profile.overview}</p>
          <Link href="/directorio" className="primary-button">Ver áreas y contactos <ArrowRight size={17} aria-hidden="true" /></Link>
        </div>
        <div className="institution-photo"><Image src="/photos/plaza.jpg" alt="Plaza de Armas de Cusco, fotografía de referencia" fill sizes="(max-width: 760px) 100vw, 45vw" /></div>
      </section>
      <div className="institution-grid">
        {getInstitutionalPages().slice(1).map(({ slug, title, description }, index) => {
          const Icon = sectionIcons[index] ?? FileText;
          return <Link className="institution-link" key={slug} href={`/institucional/${slug}`}><Icon size={23} aria-hidden="true" /><span><strong>{title}</strong><small>{description}</small></span><ArrowRight size={18} aria-hidden="true" /></Link>;
        })}
      </div>
      <section className="institution-copy">
        <h2>Funciones municipales</h2>
        <ul>{profile.functions.map((item, index) => <li key={index}>{item}</li>)}</ul>
      </section>
    </>
  );
}

function Authorities({ people }: Pick<InstitutionProfile, "people">) {
  const mayor = people.filter((person) => person.kind === "mayor");
  const council = people.filter((person) => person.kind === "council");
  return (
    <>
      <section className="institution-group" id="alcaldia" aria-labelledby="mayor-heading">
        <h2 id="mayor-heading">Alcaldía</h2>
        {mayor.length ? <div className="institution-grid">{mayor.map((person) => <PersonCard key={person.id} {...person} />)}</div> : <p>No hay autoridades publicadas en Alcaldía.</p>}
      </section>
      <section className="institution-group" id="concejo" aria-labelledby="council-heading">
        <h2 id="council-heading">Concejo Municipal</h2>
        {council.length ? <div className="institution-grid">{council.map((person) => <PersonCard key={person.id} {...person} />)}</div> : <p>No hay integrantes publicados en el Concejo.</p>}
      </section>
    </>
  );
}

function Organization({ units }: Pick<InstitutionProfile, "units">) {
  const offices = new Map(getEntries().filter((entry) => entry.section === "directorio").map((entry) => [entry.slug, entry.title]));
  const tree = new Map<string, Unit[]>();
  for (const unit of units) tree.set(unit.parent, [...(tree.get(unit.parent) ?? []), unit]);

  function branch(parent: string) {
    const children = tree.get(parent);
    if (!children?.length) return null;
    return <ul className="organization-branches">{children.map(({ id, title, description, office, href }) => {
      const officeName = offices.get(office);
      const destination = officeName ? `/directorio/${office}` : href;
      return <li key={id}>
        <div className="organization-node">
          <Building2 size={19} aria-hidden="true" />
          <div>
            {destination ? <Link href={destination}>{title}</Link> : <strong>{title}</strong>}
            {description && <p>{description}</p>}
          </div>
        </div>
        {branch(id)}
      </li>;
    })}</ul>;
  }
  return <section className="organization-structure" aria-label="Estructura municipal">{branch("") ?? <p>El municipio todavía no ha publicado su estructura.</p>}</section>;
}

function Staff({ q = "", area = "", profile }: { q?: string; area?: string; profile: InstitutionProfile }) {
  const search = typeof q === "string" ? q.trim() : "";
  const offices = new Map(getEntries().filter((entry) => entry.section === "directorio").map((entry) => [entry.slug, entry.title]));
  const personnel = profile.people.flatMap((person) => {
    const department = person.kind === "mayor" ? "Alcaldía" : person.kind === "council" ? "Concejo Municipal" : offices.get(person.office) ?? person.area;
    if (!department) return [];
    const href = person.kind === "mayor" ? "/institucional/autoridades#alcaldia"
      : person.kind === "council" ? "/institucional/autoridades#concejo"
      : offices.has(person.office) ? `/directorio/${person.office}` : undefined;
    return [{ ...person, area: department, href }];
  });
  const areas = [...new Set(personnel.map((person) => person.area))].sort((left, right) => left.localeCompare(right, "es"));
  const selectedArea = areas.includes(area) ? area : "";
  const terms = normalize(search).split(/\s+/).filter(Boolean);
  const results = personnel.filter((person) => (!selectedArea || person.area === selectedArea) && terms.every((term) => normalize(`${person.name} ${person.role} ${person.area}`).includes(term)));

  return (
    <section aria-labelledby="staff-heading">
      <form className="filters catalog-filters" action="/institucional/equipo">
        <label className="catalog-search">Buscar personal<input name="q" type="search" defaultValue={search} placeholder="Nombre, cargo o área" /></label>
        <label>Área<select name="area" aria-label="Área" defaultValue={selectedArea}><option value="">Todas las áreas</option>{areas.map((item) => <option key={item}>{item}</option>)}</select></label>
        <button className="primary-button" type="submit">Buscar</button>
      </form>
      <div className="catalog-summary"><h2 id="staff-heading">{results.length} {results.length === 1 ? "persona" : "personas"}</h2>{(search || selectedArea) && <Link href="/institucional/equipo">Quitar filtros</Link>}</div>
      {results.length ? <ul className="staff-list">{results.map(({ id, name, area: department, role, href }) => (
        <li key={id}><div><strong>{name}</strong><span>{role}</span></div>{href ? <Link href={href}>{department}<ArrowRight size={15} aria-hidden="true" /></Link> : <span>{department}</span>}</li>
      ))}</ul> : <p className="catalog-empty">Prueba otro nombre o consulta todas las áreas.</p>}
    </section>
  );
}

function Identity({ identity, logo, logoAlt }: Pick<InstitutionProfile, "identity" | "logo" | "logoAlt">) {
  return (
    <>
      <section className="institution-feature identity-feature">
        <div><h2>Marca municipal</h2><p>El símbolo reúne un arco, un sol y el perfil del valle. Identifica la comunicación y los recursos visuales de la municipalidad ficticia.</p><a className="primary-button" href={logo ?? "/icon.svg"} download><Download size={18} aria-hidden="true" /> Descargar logotipo</a></div>
        <div className="identity-logo"><Image src={logo ?? "/icon.svg"} alt={logoAlt ?? "Logotipo de Villa del Sol"} width={128} height={128} unoptimized={Boolean(logo)} /><strong>Villa del Sol</strong></div>
      </section>
      <section className="institution-copy">
        <h2>Comunicación institucional</h2>
        <p>{identity}</p>
        <Link href="/institucional/equipo?area=Imagen+Institucional" className="text-link">Ver equipo de comunicación <ArrowRight size={16} aria-hidden="true" /></Link>
      </section>
    </>
  );
}

export default async function InstitutionalPage({ params, searchParams }: PageProps) {
  const { view = [] } = await params;
  const page = getInstitutionalPages().find(({ slug }) => slug === view.join("/"));
  if (!page) notFound();
  const query = await searchParams;
  const { profile } = getInstitutionalProfile();

  return (
    <div className="frame subpage catalog-page">
      <header className="catalog-heading">
        <div className="breadcrumb"><Link href="/">Inicio</Link> / {page.slug ? <><Link href="/institucional">Institucional</Link> / {page.title}</> : "Institucional"}</div>
        <h1>{page.slug ? page.title : "Institucional"}</h1>
        <p>{page.description} Los nombres y cargos de esta demo son ficticios.</p>
      </header>
      <div className="institution-layout">
        <nav className="institution-nav" aria-label="Secciones institucionales">
          {getInstitutionalPages().map(({ slug, title }) => <Link key={slug} href={slug ? `/institucional/${slug}` : "/institucional"} aria-current={slug === page.slug ? "page" : undefined}>{title}</Link>)}
          <Link href="/directorio">Directorio de áreas</Link>
        </nav>
        <div className="institution-content">
          {"body" in page && <article className="institution-copy">{page.body.split(/\r?\n/).filter(Boolean).map((line, index) => <p key={index}>{line}</p>)}</article>}
          {page.slug === "" && <Overview profile={profile} />}
          {page.slug === "autoridades" && <Authorities people={profile.people} />}
          {page.slug === "organigrama" && <Organization units={profile.units} />}
          {page.slug === "equipo" && <Staff {...query} profile={profile} />}
          {page.slug === "imagen-institucional" && <Identity identity={profile.identity} logo={profile.logo} logoAlt={profile.logoAlt} />}
        </div>
      </div>
    </div>
  );
}
