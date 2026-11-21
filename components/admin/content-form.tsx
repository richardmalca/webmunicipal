"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Archive, ExternalLink, Upload } from "lucide-react";
import { removeArchivedContent, saveContent, setContentState } from "../../app/admin/actions";
import type { ManagedEntry, EntryState } from "../../lib/cms";
import { resolvePhoto, sections } from "../../lib/presentation";
import { ConfirmDialog, Feedback } from "./dialog";

type Result = { error?: string; message?: string; href?: string };

export function StateControl({ entry, target }: { entry: Pick<ManagedEntry, "section" | "slug" | "revision" | "title">; target: EntryState | "delete" }) {
  const router = useRouter();
  const button = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [feedback, setFeedback] = useState<Result>({});
  const action = target === "delete" ? "Eliminar" : target === "archived" ? "Archivar" : target === "published" ? "Publicar" : "Retirar";
  return (
    <div className="cms-state-control">
      <button ref={button} className="cms-button" type="button" onClick={() => { setFeedback({}); setOpen(true); }}>{target === "archived" && <Archive size={16} aria-hidden="true" />}{action}</button>
      {!open && <Feedback {...feedback} />}
      <ConfirmDialog open={open} onOpenChange={setOpen} returnFocus={() => (button.current ?? document.getElementById("cms-content"))?.focus()} title={`${action} contenido`} description={target === "delete" ? `«${entry.title}» y sus archivos sin otras referencias se eliminarán definitivamente.` : target === "published" ? `«${entry.title}» aparecerá en el portal público.` : `«${entry.title}» saldrá del portal. Podrás publicarlo de nuevo desde el panel.`} confirm={action} pending={pending} danger={target !== "published"} onConfirm={() => start(async () => {
        try {
          const result = target === "delete" ? await removeArchivedContent(entry.section, entry.slug, entry.revision) : await setContentState(entry.section, entry.slug, entry.revision, target);
          if (!result.error) {
            setOpen(false);
            if (result.href) router.replace(result.href);
            else router.refresh();
          }
          setFeedback(result);
        } catch {
          setFeedback({ error: "No se pudo aplicar el cambio. Vuelve a intentarlo." });
        }
      })}><Feedback {...feedback} /></ConfirmDialog>
    </div>
  );
}

function UploadField({ label, name, accept, note, multiple }: { label: string; name: string; accept: string; note: string; multiple?: boolean }) {
  return <label className="cms-upload"><Upload size={18} aria-hidden="true" /><span>{label}<small>{note}</small></span><input type="file" name={name} accept={accept} multiple={multiple} /></label>;
}

export function ContentForm({ entry, defaultSection, today }: { entry?: ManagedEntry; defaultSection: string; today: string }) {
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const submitButton = useRef<HTMLButtonElement | null>(null);
  const work = useRef<FormData>(null);
  const [section, setSection] = useState(entry?.section ?? defaultSection);
  const [confirm, showConfirm] = useState(false);
  const [feedback, setFeedback] = useState<Result>({});
  const [pending, start] = useTransition();
  const cover = resolvePhoto(entry?.cover ?? entry?.image, entry?.coverAlt);
  const acceptsVideo = section === "noticias" || section === "videos";
  const acceptsMedia = acceptsVideo || section === "galerias";

  function save(data: FormData) {
    start(async () => {
      try {
        const result = await saveContent(data);
        if (result.error) {
          setFeedback(result);
          return;
        }
        showConfirm(false);
        form.current?.querySelectorAll<HTMLInputElement>('input[type="file"], input[type="checkbox"]').forEach((input) => {
          if (input.type === "file") input.value = "";
          else input.checked = false;
        });
        if (!entry && result.href) {
          router.replace(result.href + "?guardado=" + (data.get("intent") === "publish" ? "publicado" : "borrador"));
        } else {
          setFeedback(result);
          router.refresh();
        }
      } catch {
        setFeedback({ error: "No pudimos procesar la solicitud. Revisa el tamaño de los archivos y vuelve a intentarlo." });
      }
    });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const invalid = event.currentTarget.querySelector<HTMLElement>(":invalid");
    if (invalid) {
      setFeedback({ error: "Completa los campos obligatorios y revisa los límites de cada campo." });
      invalid.focus();
      return;
    }
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    submitButton.current = submitter;
    const intent = submitter?.value === "publish" ? "publish" : "draft";
    const data = new FormData(event.currentTarget);
    data.set("intent", intent);
    setFeedback({});
    if (intent === "publish" || entry?.state === "published") {
      work.current = data;
      showConfirm(true);
    } else save(data);
  }

  return <>
    {!confirm && feedback.error && <Feedback error={feedback.error} />}
    <form noValidate className="cms-form cms-form-layout" ref={form} onSubmit={submit}>
      {entry && <><input type="hidden" name="slug" value={entry.slug} /><input type="hidden" name="revision" value={entry.revision} /><input type="hidden" name="section" value={entry.section} /></>}
      <div className="cms-form-main">
        <section className="cms-panel cms-fieldset">
          <h2>Información principal</h2>
          {!entry && <label>Sección<select name="section" value={section} onChange={(event) => setSection(event.target.value)}>{Object.entries(sections).map(([id, title]) => <option key={id} value={id}>{title}</option>)}</select></label>}
          <label>Título<input name="title" maxLength={140} defaultValue={entry?.title} required /></label>
          <label>Resumen<textarea name="description" maxLength={400} rows={3} defaultValue={entry?.description} required /></label>
          <label>Contenido<textarea name="body" maxLength={20000} rows={8} defaultValue={entry?.body} required /></label>
        </section>
        {section === "tramites" && <section className="cms-panel cms-fieldset"><h2>Guía del trámite</h2><label>Área responsable<input name="office" maxLength={120} defaultValue={entry?.office} /></label><label>Requisitos, uno por línea<textarea name="requirements" rows={4} defaultValue={entry?.requirements?.join("\n")} /></label><label>Pasos, uno por línea<textarea name="steps" rows={4} defaultValue={entry?.steps?.join("\n")} /></label></section>}
        {(acceptsMedia || section === "transparencia") && <section className="cms-panel cms-fieldset">
          <h2>Archivos de la publicación</h2>
          {acceptsMedia && <>
            {cover && <div className="cms-existing"><a href={cover.src} target="_blank" rel="noreferrer">Ver portada actual</a><label><input type="checkbox" name="removeCover" value="yes" /> Quitar portada</label></div>}
            <UploadField name="cover" label="Imagen de portada" note="JPEG, PNG o WebP · hasta 4 MB" accept="image/jpeg,image/png,image/webp" />
            <label>Texto alternativo de portada<input name="coverAlt" maxLength={160} defaultValue={entry?.coverAlt ?? cover?.alt} /></label>
          </>}
          {acceptsVideo && <>
            {entry?.video && <div className="cms-existing"><a href={entry.video} target="_blank" rel="noreferrer">Ver video actual</a><label><input type="checkbox" name="removeVideo" value="yes" /> Quitar video</label></div>}
            <UploadField name="video" label="Video" note="MP4 o WebM · hasta 18 MB" accept="video/mp4,video/webm" />
            <div className="cms-fields-row"><label>Duración<input name="videoDuration" placeholder="0:45" maxLength={12} defaultValue={entry?.videoDuration} /></label><label>Crédito audiovisual<input name="videoCredit" maxLength={120} defaultValue={entry?.videoCredit} /></label></div>
          </>}
          {section === "galerias" && <>
            {Boolean(entry?.photos?.length) && <div className="cms-existing"><span>{entry?.photos?.length} fotos guardadas</span><label><input type="checkbox" name="replaceGallery" value="yes" /> Reemplazar las fotos actuales</label></div>}
            <UploadField name="gallery" label="Fotos de la galería" note="Hasta 4 por guardado · 4 MB por foto" accept="image/jpeg,image/png,image/webp" multiple />
          </>}
          {section === "transparencia" && <>
            {entry?.attachment && <div className="cms-existing"><a href={entry.attachment} target="_blank" rel="noreferrer">Ver PDF actual</a><label><input type="checkbox" name="removeAttachment" value="yes" /> Quitar PDF</label></div>}
            <UploadField name="attachment" label="Documento PDF" note="Hasta 8 MB" accept="application/pdf" />
          </>}
        </section>}
      </div>
      <aside className="cms-form-sidebar">
        <section className="cms-panel cms-fieldset">
          <h2>Publicación</h2>
          <label>Categoría<input name="category" maxLength={70} defaultValue={entry?.category} required /></label>
          <label>Fecha<input type="date" name="date" defaultValue={entry ? entry.date : today} required={section === "agenda"} /></label>
          {entry?.state === "published" && <Link className="cms-button" href={`/${entry.section}/${entry.slug}`} target="_blank"><ExternalLink size={17} aria-hidden="true" /> Ver publicación</Link>}
          <div className="cms-form-actions">
            <button type="submit" className="primary-button" disabled={pending} value="publish">{entry?.state === "published" ? "Actualizar publicación" : "Publicar"}</button>
            <button type="submit" className="cms-button" disabled={pending} value="draft">{entry?.state === "published" ? "Retirar a borrador" : "Guardar borrador"}</button>
          </div>
          {!confirm && <Feedback message={pending ? "Guardando cambios…" : feedback.message} />}
        </section>
        {entry && <StateControl entry={entry} target={entry.state === "archived" ? "delete" : "archived"} />}
      </aside>
    </form>
    <ConfirmDialog open={confirm} onOpenChange={showConfirm} returnFocus={() => submitButton.current?.focus()} title={work.current?.get("intent") === "publish" ? "Publicar en el portal" : "Retirar del portal"} description={work.current?.get("intent") === "publish" ? "Los cambios serán visibles en el sitio público." : "La publicación se guardará como borrador y dejará de aparecer en el sitio público."} confirm={work.current?.get("intent") === "publish" ? "Confirmar publicación" : "Confirmar retiro"} pending={pending} onConfirm={() => { if (work.current) save(work.current); }}><Feedback {...feedback} /></ConfirmDialog>
  </>;
}
