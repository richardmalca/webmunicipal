import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { InstitutionForm } from "../../../../components/admin/institution-form";
import { InstitutionRecords } from "../../../../components/admin/institution-records";
import { requireAdmin } from "../../../../lib/admin-auth";
import { listManaged } from "../../../../lib/cms";
import { getInstitutionalPages, getInstitutionalProfile } from "../../../../lib/institutional-store";

export const metadata = { title: "Institucional" };

const modules = {
  general: { title: "Información general", description: "Edita la presentación, las funciones y el texto de Imagen Institucional.", path: "" },
  autoridades: { title: "Autoridades", description: "Gestiona las personas de Alcaldía y del Concejo Municipal.", path: "/autoridades" },
  personal: { title: "Personal", description: "Gestiona las personas del directorio y su vínculo con las áreas municipales.", path: "/equipo" },
  organigrama: { title: "Organigrama", description: "Agrega unidades y define de qué unidad superior depende cada una.", path: "/organigrama" },
  paginas: { title: "Páginas", description: "Publica páginas nuevas dentro de Institucional con su propio enlace.", path: "" },
} as const;

export default async function InstitutionalSettings({ searchParams }: { searchParams: Promise<{ modulo?: string }> }) {
  await requireAdmin();
  const { modulo } = await searchParams;
  const key = typeof modulo === "string" && Object.hasOwn(modules, modulo) ? modulo as keyof typeof modules : "general";
  const selected = modules[key];
  const { profile, revision } = getInstitutionalProfile();
  const offices = listManaged().filter((entry) => entry.section === "directorio" && entry.state === "published").map(({ slug, title }) => ({ id: slug, title }));
  const records = key === "autoridades" ? profile.people.filter((person) => person.kind !== "staff")
    : key === "personal" ? profile.people.filter((person) => person.kind === "staff")
    : key === "organigrama" ? profile.units : profile.pages;

  return <>
    <header className="cms-heading"><div><h1>{selected.title}</h1><p>{selected.description}</p></div><Link className="cms-button" href={`/institucional${selected.path}`} target="_blank"><ExternalLink size={17} aria-hidden="true" /> Ver en el portal</Link></header>
    <nav className="cms-module-tabs" aria-label="Módulos institucionales">
      {Object.entries(modules).map(([id, item]) => <Link key={id} href={id === "general" ? "/admin/institucional" : `/admin/institucional?modulo=${id}`} aria-current={key === id ? "page" : undefined}>{item.title}</Link>)}
    </nav>
    {key === "general" ? <InstitutionForm revision={revision}>
      <section className="cms-panel cms-fieldset">
        <h2>Presentación municipal</h2>
        <label>Presentación<textarea name="overview" maxLength={1800} rows={4} defaultValue={profile.overview} required /></label>
        <label>Funciones municipales, una por línea<textarea name="functions" maxLength={1800} rows={4} defaultValue={profile.functions.join("\n")} required /></label>
        {profile.logo && <div className="cms-existing"><a href={profile.logo} target="_blank" rel="noreferrer">Ver logotipo actual</a><label><input type="checkbox" name="removeLogo" value="yes" /> Quitar logotipo personalizado</label></div>}
        <label className="cms-upload"><span>Logotipo institucional<small>JPEG, PNG o WebP · hasta 4 MB</small></span><input type="file" name="logo" accept="image/jpeg,image/png,image/webp" /></label>
        <label>Texto alternativo del logotipo<input name="logoAlt" maxLength={160} defaultValue={profile.logoAlt} /></label>
        <label>Comunicación institucional<textarea name="identity" maxLength={1800} rows={3} defaultValue={profile.identity} required /></label>
      </section>
    </InstitutionForm> : <InstitutionRecords key={key} type={key} records={records} offices={offices} units={profile.units.map(({ id, title }) => ({ id, title }))} destinations={getInstitutionalPages().map(({ slug, title }) => ({ id: slug ? `/institucional/${slug}` : "/institucional", title }))} revision={revision} />}
  </>;
}
