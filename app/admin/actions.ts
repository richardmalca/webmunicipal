"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { AuthError } from "next-auth";
import { signIn, signOut } from "../../auth";
import { requireAdmin } from "../../lib/admin-auth";
import { isLocalCms, type Entry } from "../../lib/content";
import { changeState, findManaged, getAssetUrl, storeEntry, deleteArchived, uniqueSlug, workflow, type CmsFile, type EntryState } from "../../lib/cms";
import { sections } from "../../lib/presentation";
import { getInstitutionalPages, getInstitutionalProfile, storeInstitutionalProfile, type InstitutionProfile } from "../../lib/institutional-store";
import { notFound } from "next/navigation";

type Feedback = { error?: string; message?: string; href?: string };

function field(data: FormData, name: string) {
  const value = data.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function lines(data: FormData, name: string) {
  return field(data, name).split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

export async function login(_previous: Feedback, data: FormData): Promise<Feedback> {
  if (!isLocalCms()) notFound();
  const email = field(data, "email");
  const password = data.get("password");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || typeof password !== "string" || !password) return { error: "Ingresa un correo válido y tu contraseña." };
  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/admin",
    });
    return {};
  } catch (error) {
    if (error instanceof AuthError) return { error: "No pudimos iniciar sesión. Verifica tus credenciales o espera unos minutos antes de reintentar." };
    throw error;
  }
}

export async function logout() {
  await requireAdmin();
  await signOut({ redirectTo: "/admin/login" });
}

const limits = { image: 4, pdf: 8, video: 18 };

async function readUpload(file: FormDataEntryValue | null, kind: keyof typeof limits): Promise<CmsFile | undefined> {
  if (!(file instanceof File) || !file.size) return undefined;
  if (file.size > limits[kind] * 1024 * 1024) throw new Error(`El archivo «${file.name}» supera el límite de ${limits[kind]} MB.`);
  const bytes = Buffer.from(await file.arrayBuffer());
  let mime: string | undefined;
  if (kind === "image") {
    if (bytes.subarray(0, 3).toString("hex") === "ffd8ff") mime = "image/jpeg";
    else if (bytes.subarray(0, 8).toString("hex") === "89504e470d0a1a0a") mime = "image/png";
    else if (bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") mime = "image/webp";
  } else if (kind === "pdf" && bytes.toString("ascii", 0, 5) === "%PDF-") {
    mime = "application/pdf";
  } else if (kind === "video") {
    if (bytes.toString("ascii", 4, 8) === "ftyp") mime = "video/mp4";
    else if (bytes.subarray(0, 4).toString("hex") === "1a45dfa3") mime = "video/webm";
  }
  if (!mime) throw new Error(`El formato de «${file.name}» no es válido para este campo.`);
  return { id: randomUUID(), name: file.name.replace(/[\u0000-\u001f\u007f/\\]/g, "").slice(0, 120), mime, bytes };
}

function refreshContent(section: string, slug: string) {
  for (const path of ["/", "/buscar", "/videos", "/admin", "/admin/contenido", `/admin/contenido/${section}/${slug}`, `/${section}`, `/${section}/${slug}`]) revalidatePath(path);
}

function publicationError(entry: Entry) {
  if (entry.section === "galerias" && !entry.photos?.length) return "Agrega al menos una foto antes de publicar la galería.";
  if (entry.section === "videos" && !entry.video) return "Adjunta un archivo de video antes de publicar.";
  if (entry.section === "agenda" && !entry.date) return "Indica la fecha de la actividad.";
}

export async function saveContent(data: FormData): Promise<Feedback> {
  await requireAdmin();
  const section = field(data, "section");
  const slug = field(data, "slug");
  const title = field(data, "title");
  const description = field(data, "description");
  const category = field(data, "category");
  const body = field(data, "body");
  const date = field(data, "date");
  const state: EntryState = field(data, "intent") === "publish" ? "published" : "draft";
  const revision = Number(field(data, "revision"));
  const current = slug ? findManaged(section, slug) : undefined;
  if (!Object.hasOwn(sections, section) || !title || !description || !category || !body || title.length > 140 || description.length > 400 || body.length > 20000 || category.length > 70) {
    return { error: "Completa el título, el resumen, la categoría y el contenido dentro de los límites indicados." };
  }
  if (slug && (!current || current.revision !== revision)) return { error: "El registro cambió. Recarga la ficha antes de volver a guardar." };
  if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date)) return { error: "Selecciona una fecha válida." };

  const { state: oldState, revision: oldRevision, updatedAt, ...previous } = current ?? {};
  const entry: Entry = { ...previous, section, slug: slug || uniqueSlug(section, title), title, description, category, body, date: date || undefined };
  const files: CmsFile[] = [];
  const canVideo = section === "noticias" || section === "videos";
  const canCover = canVideo || section === "galerias";
  try {
    if (canCover) {
      const cover = await readUpload(data.get("cover"), "image");
      if (cover) {
        files.push(cover);
        entry.cover = getAssetUrl(cover);
      } else if (field(data, "removeCover") === "yes") {
        delete entry.cover;
        delete entry.image;
      }
      entry.coverAlt = field(data, "coverAlt").slice(0, 160) || undefined;
      if (entry.cover && !entry.coverAlt) return { error: "Agrega un texto alternativo para la portada." };
    }
    if (canVideo) {
      const video = await readUpload(data.get("video"), "video");
      if (video) {
        files.push(video);
        entry.video = getAssetUrl(video);
        delete entry.videoSource;
        delete entry.captions;
      } else if (field(data, "removeVideo") === "yes") {
        delete entry.video;
        delete entry.videoSource;
        delete entry.captions;
      }
      entry.videoDuration = entry.video ? field(data, "videoDuration").slice(0, 12) || undefined : undefined;
      entry.videoCredit = entry.video ? field(data, "videoCredit").slice(0, 120) || undefined : undefined;
    }
    if (section === "transparencia") {
      const document = await readUpload(data.get("attachment"), "pdf");
      if (document) {
        files.push(document);
        entry.attachment = getAssetUrl(document);
      } else if (field(data, "removeAttachment") === "yes") delete entry.attachment;
    }
    if (section === "galerias") {
      const selected = data.getAll("gallery").filter((item) => item instanceof File && item.size);
      if (selected.length > 4) return { error: "Selecciona hasta cuatro fotografías por guardado." };
      const photos = (await Promise.all(selected.map((item) => readUpload(item, "image")))).filter((item) => item !== undefined);
      files.push(...photos);
      const existing = field(data, "replaceGallery") === "yes" ? [] : (entry.photos ?? []);
      entry.photos = [...existing, ...photos.map(getAssetUrl)];
      if (entry.photos.length > 24) return { error: "Cada galería admite hasta 24 fotografías." };
    }
    if (section === "tramites") {
      entry.office = field(data, "office").slice(0, 120) || undefined;
      entry.requirements = lines(data, "requirements").slice(0, 20);
      entry.steps = lines(data, "steps").slice(0, 20);
    }
    if (files.reduce((sum, file) => sum + file.bytes.byteLength, 0) > 24 * 1024 * 1024) return { error: "Los archivos adjuntos superan 24 MB en total." };
    const issue = state === "published" && publicationError(entry);
    if (issue) return { error: issue };
    if (!storeEntry(entry, state, current ? revision : null, files)) return { error: "Otro cambio se guardó primero. Recarga y vuelve a intentarlo." };
    refreshContent(section, entry.slug);
    return { message: state === "published" ? "Contenido publicado en el portal." : "Borrador guardado.", href: `/admin/contenido/${section}/${entry.slug}` };
  } catch (error) {
    if (error instanceof Error && (error.message.startsWith("El archivo") || error.message.startsWith("El formato"))) return { error: error.message };
    return { error: "El cambio no se guardó. Comprueba los archivos e inténtalo otra vez." };
  }
}

export async function setContentState(section: string, slug: string, revision: number, state: EntryState): Promise<Feedback> {
  await requireAdmin();
  if (!Object.hasOwn(workflow, state) || !Object.hasOwn(sections, section)) return { error: "El estado solicitado no está disponible." };
  const current = findManaged(section, slug);
  if (!current || current.revision !== revision || current.state === state) return { error: "El contenido cambió. Actualiza la lista antes de intentarlo otra vez." };
  const issue = state === "published" && publicationError(current);
  if (issue) return { error: issue };
  if (!changeState(section, slug, state, revision)) return { error: "Otro cambio se guardó primero. Actualiza la lista." };
  refreshContent(section, slug);
  return { message: state === "archived" ? "Contenido archivado." : state === "published" ? "Contenido publicado." : "Contenido retirado del portal." };
}



function saveProfile(profile: InstitutionProfile, revision: number, message: string, file?: CmsFile): Feedback {
  if (!storeInstitutionalProfile(profile, revision, file)) return { error: "Otro cambio se guardó primero. Recarga antes de reintentar." };
  revalidatePath("/institucional/[[...view]]", "page");
  revalidatePath("/admin/institucional");
  revalidatePath("/buscar");

  return { message };
}

export async function saveInstitution(data: FormData): Promise<Feedback> {
  await requireAdmin();
  const { profile, revision } = getInstitutionalProfile();
  if (field(data, "revision") !== String(revision)) return { error: "La información cambió. Recarga el formulario." };
  const overview = field(data, "overview");
  const identity = field(data, "identity");
  const functions = lines(data, "functions");
  if (!overview || !identity || !functions.length || functions.length > 40 || [overview, identity, ...functions].some((item) => item.length > 1800)) {
    return { error: "Completa la presentación, las funciones y la información de comunicación." };
  }
  try {
    const file = await readUpload(data.get("logo"), "image");
    const logo = file ? getAssetUrl(file) : field(data, "removeLogo") === "yes" ? undefined : profile.logo;
    const logoAlt = logo ? field(data, "logoAlt").slice(0, 160) : undefined;
    if (logo && !logoAlt) return { error: "Agrega un texto alternativo para el logotipo." };
    const result = saveProfile({ ...profile, overview, identity, functions, logo, logoAlt }, revision, "Información institucional publicada.", file);
    if (!result.error) revalidatePath("/", "layout");
    return result;
  } catch (error) {
    return { error: error instanceof Error && /^El (archivo|formato)/.test(error.message) ? error.message : "No se pudo guardar la información institucional." };
  }
}

export async function saveInstitutionRecord(data: FormData): Promise<Feedback> {
  await requireAdmin();
  const { profile, revision } = getInstitutionalProfile();
  if (field(data, "revision") !== String(revision)) return { error: "La lista cambió. Recarga antes de editar." };
  const kind = field(data, "recordType");
  const existingId = field(data, "id");
  const id = existingId || randomUUID();
  const title = field(data, "title");
  const description = field(data, "description");
  const role = field(data, "role");
  const area = field(data, "area");
  const office = field(data, "office");
  if (!title || title.length > 120 || description.length > 1800 || role.length > 120 || area.length > 120) return { error: "Revisa el nombre y los límites de los campos." };
  if (office && !findManaged("directorio", office)) return { error: "Selecciona un área válida del directorio." };
  if (kind === "autoridades" || kind === "personal") {
    const record = profile.people.find((person) => person.id === existingId);
    if (existingId && (!record || (record.kind === "staff") !== (kind === "personal"))) return { error: "La persona ya no está disponible." };
    if (!role || (kind === "personal" && !office && !area)) return { error: "Indica el cargo y el área de la persona." };
    const personKind = field(data, "kind");
    if (kind === "autoridades" && personKind !== "council" && personKind !== "mayor") return { error: "Selecciona Alcaldía o Concejo." };
    const nextKind = kind === "personal" ? "staff" : personKind === "mayor" ? "mayor" : "council";
    const person = { id, name: title, role, description, area, office, kind: nextKind } as const;
    return saveProfile({ ...profile, people: record ? profile.people.map((item) => item.id === id ? person : item) : [...profile.people, person] }, revision, "Persona publicada en el portal.");
  }
  if (kind === "organigrama") {
    const record = profile.units.find((item) => item.id === existingId);
    if (existingId && !record) return { error: "La unidad ya no está disponible." };
    const parent = field(data, "parent");
    const byId = new Map(profile.units.map((item) => [item.id, item]));
    if (parent && !byId.has(parent)) return { error: "La unidad superior no existe." };
    for (let node = parent; node; node = byId.get(node)?.parent ?? "") {
      if (node === id) return { error: "La unidad superior no puede depender de esta misma unidad." };
    }
    const href = field(data, "destination");
    const existingSpecialLink = record?.href && href === record.href;
    if (href && !existingSpecialLink && !getInstitutionalPages().some(({ slug }) => href === (slug ? `/institucional/${slug}` : "/institucional"))) return { error: "Selecciona un enlace institucional válido." };
    const unit = { id, title, description, parent, office, href: href || undefined };
    return saveProfile({ ...profile, units: record ? profile.units.map((item) => item.id === id ? unit : item) : [...profile.units, unit] }, revision, "Organigrama actualizado.");
  }
  if (kind === "paginas") {
    const record = profile.pages.find((item) => item.id === existingId);
    if (existingId && !record) return { error: "La página ya no está disponible." };
    const body = field(data, "body");
    if (!description || !body || body.length > 20000) return { error: "Completa el resumen y el contenido de la página." };
    const base = title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 72).replace(/^-|-$/g, "") || "pagina";
    const slug = record?.slug ?? (getInstitutionalPages().some((item) => item.slug === base) ? `${base}-${id.slice(0, 8)}` : base);
    const page = { id, slug, title, description, body };
    const result = saveProfile({ ...profile, pages: record ? profile.pages.map((item) => item.id === id ? page : item) : [...profile.pages, page] }, revision, "Página publicada en Institucional.");
    if (!result.error) revalidatePath("/", "layout");
    return result;
  }
  return { error: "El módulo solicitado no existe." };
}

export async function removeInstitutionRecord(kind: string, id: string, revision: number): Promise<Feedback> {
  await requireAdmin();
  const saved = getInstitutionalProfile();
  if (revision !== saved.revision) return { error: "La lista cambió. Recarga antes de eliminar." };
  const { profile } = saved;
  if (kind === "organigrama") {
    const item = profile.units.find((unit) => unit.id === id);
    if (!item) return { error: "La unidad ya no está disponible." };
    return saveProfile({ ...profile, units: profile.units.filter((unit) => unit.id !== id).map((unit) => unit.parent === id ? { ...unit, parent: item.parent } : unit) }, revision, "Unidad eliminada del organigrama.");
  }
  if (kind === "paginas" && profile.pages.some((page) => page.id === id)) {
    const page = profile.pages.find((item) => item.id === id)!;
    const href = `/institucional/${page.slug}`;
    const units = profile.units.map((unit) => unit.href === href ? { ...unit, href: undefined } : unit);
    const result = saveProfile({ ...profile, units, pages: profile.pages.filter((item) => item.id !== id) }, revision, "Página eliminada del portal.");
    if (!result.error) revalidatePath("/", "layout");

    return result;
  }
  if (profile.people.some((person) => person.id === id && (kind === "autoridades" ? person.kind !== "staff" : kind === "personal" && person.kind === "staff"))) {
    return saveProfile({ ...profile, people: profile.people.filter((person) => person.id !== id) }, revision, "Persona eliminada del listado público.");
  }
  return { error: "El registro ya no está disponible." };
}

export async function removeArchivedContent(section: string, slug: string, revision: number): Promise<Feedback> {
  await requireAdmin();
  if (!Object.hasOwn(sections, section) || !deleteArchived(section, slug, revision)) return { error: "Solo se pueden eliminar registros archivados que no hayan cambiado." };
  refreshContent(section, slug);
  return { message: "Contenido eliminado definitivamente.", href: `/admin/contenido?seccion=${section}&eliminado=1` };
}
