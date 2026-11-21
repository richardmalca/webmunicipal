import type { CmsFile } from "./cms";
import { getDatabase, isLocalCms } from "./content";
import { council, departmentStaff, institutionalPages, management, mayor, organization } from "./institutional";

export type Person = {
  id: string;
  kind: "mayor" | "council" | "staff";
  name: string;
  role: string;
  description: string;
  area: string;
  office: string;
};
export type Unit = { id: string; title: string; description: string; parent: string; office: string; href?: string };
export type InstitutionPage = { id: string; slug: string; title: string; description: string; body: string };
export type InstitutionProfile = {
  logo?: string;
  logoAlt?: string;
  overview: string;
  functions: string[];
  identity: string;
  people: Person[];
  units: Unit[];
  pages: InstitutionPage[];
};

const legacyDefaults = {
  overview: "Un municipio distrital ficticio. En esta demo, sus áreas atienden consultas, organizan actividades y gestionan los espacios y servicios que usa el vecindario.",
  functions: [
    "Orientar al vecino en sus consultas y trámites municipales.",
    "Coordinar el cuidado de parques, vías y espacios de uso público.",
    "Facilitar la participación vecinal y el acceso a la información municipal.",
  ],
  identity: "El área de Imagen Institucional coordina comunicados, materiales gráficos y la cobertura de actividades de la demo.",
  mayor, council, management, departmentStaff, organization,
};

function fromLegacy(profile: typeof legacyDefaults): InstitutionProfile {
  const people: Person[] = [
    { ...profile.mayor, id: "alcaldia-1", kind: "mayor", area: "Alcaldía", office: "" },
    ...profile.council.map((person, index): Person => ({ ...person, id: `concejo-${index + 1}`, kind: "council", area: "Concejo Municipal", office: "" })),
    ...profile.management.map((person, index): Person => ({ ...person, id: `gerencia-${index + 1}`, kind: "staff", description: "", office: "" })),
    ...Object.entries(profile.departmentStaff).flatMap(([office, [first, firstRole, second, secondRole]]) =>
      [[first, firstRole], [second, secondRole]].flatMap(([name, role], index): Person[] => name && role
        ? [{ name, role, id: `${office}-${index + 1}`, kind: "staff", description: "", area: "", office }]
        : [])),
  ];
  const [government, ...departments] = profile.organization;
  const units: Unit[] = [
    { id: "gobierno", title: government.title, description: government.description, parent: "", office: "" },
    { id: "concejo", title: "Concejo Municipal", description: "", parent: "gobierno", office: "", href: "/institucional/autoridades#concejo" },
    { id: "alcaldia", title: "Alcaldía", description: "", parent: "gobierno", office: "", href: "/institucional/autoridades#alcaldia" },
    { id: "gerencia", title: "Gerencia Municipal", description: "", parent: "alcaldia", office: "" },
    ...departments.flatMap((group, index): Unit[] => {
      const id = `grupo-${index + 1}`;
      return [
        { id, title: group.title, description: group.description, parent: "gerencia", office: "" },
        ...group.links.map(({ label, href }, index) => ({
          id: `${id}-${index + 1}`, title: label, description: "", parent: id,
          office: href.startsWith("/directorio/") ? href.split("/").at(-1)! : "",
          href: href.startsWith("/directorio/") ? undefined : href,
        })),
      ];
    }),
  ];
  return { overview: profile.overview, functions: profile.functions, identity: profile.identity, people, units, pages: [] };
}

export function getInstitutionalProfile(): { profile: InstitutionProfile; revision: number } {
  const row = isLocalCms() ? getDatabase().prepare("SELECT value FROM cms_meta WHERE name = 'institution'").get() : undefined;
  if (!row) return { profile: fromLegacy(legacyDefaults), revision: 0 };
  const saved = JSON.parse(String(row.value)) as { profile: InstitutionProfile | typeof legacyDefaults; revision: number };
  return { revision: saved.revision, profile: "people" in saved.profile ? saved.profile : fromLegacy(saved.profile) };
}

export function getInstitutionalPages(): (InstitutionPage | (typeof institutionalPages)[number])[] {
  return [...institutionalPages, ...getInstitutionalProfile().profile.pages];
}

export function storeInstitutionalProfile(profile: InstitutionProfile, revision: number, file?: CmsFile) {
  const db = getDatabase();
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = db.prepare(`
      INSERT INTO cms_meta (name, value)
      SELECT 'institution', ?
      WHERE ? = 0 OR EXISTS (SELECT 1 FROM cms_meta WHERE name = 'institution')
      ON CONFLICT(name) DO UPDATE SET value = excluded.value
      WHERE json_extract(cms_meta.value, '$.revision') = ?
    `).run(JSON.stringify({ profile, revision: revision + 1 }), revision, revision);
    if (result.changes !== 1) {
      db.exec("ROLLBACK");
      return false;
    }
    if (file) db.prepare("INSERT INTO cms_files VALUES (?, ?, ?, ?)").run(file.id, file.name, file.mime, file.bytes);
    db.exec("COMMIT");
    return true;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
