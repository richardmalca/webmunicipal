"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ExternalLink, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { removeInstitutionRecord, saveInstitutionRecord } from "../../app/admin/actions";
import type { InstitutionPage, Person, Unit } from "../../lib/institutional-store";
import { normalize } from "../../lib/presentation";
import { ConfirmDialog, Feedback } from "./dialog";

type RecordType = "autoridades" | "personal" | "organigrama" | "paginas";
type RecordItem = Person | Unit | InstitutionPage;
type Option = { id: string; title: string };

const singular = { autoridades: "autoridad", personal: "persona", organigrama: "unidad", paginas: "página" };

function recordTitle(item: RecordItem) {
  return "name" in item ? item.name : item.title;
}

export function InstitutionRecords({ type, records, offices, units, destinations, revision }: {
  type: RecordType;
  records: RecordItem[];
  offices: Option[];
  units: Option[];
  destinations: Option[];
  revision: number;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState<{ kind: "create" } | { kind: "edit" | "remove"; item: RecordItem }>();
  const [pending, start] = useTransition();
  const [feedback, setFeedback] = useState<{ error?: string; message?: string }>({});
  const [status, setStatus] = useState("");
  const form = useRef<HTMLFormElement>(null);
  const returnTo = useRef<HTMLElement>(null);
  const add = useRef<HTMLButtonElement>(null);
  const active = dialog && "item" in dialog ? dialog.item : undefined;
  const person = active && "name" in active ? active : undefined;
  const unit = active && "parent" in active ? active : undefined;
  const page = active && "slug" in active ? active : undefined;
  const showOffice = type === "personal" || type === "organigrama";
  const found = records.filter((item) => normalize([recordTitle(item), item.description, "role" in item ? item.role + " " + item.area + " " + (offices.find((office) => office.id === item.office)?.title ?? "") : ""].join(" ")).includes(normalize(search.trim())));

  function open(kind: "create" | "edit" | "remove", target: HTMLElement, item?: RecordItem) {
    returnTo.current = target;
    setFeedback({});
    setStatus("");
    if (kind === "create") setDialog({ kind });
    else if (item) setDialog({ kind, item });
  }

  function run(operation: () => Promise<{ error?: string; message?: string }>) {
    start(async () => {
      try {
        const result = await operation();
        if (result.error) {
          setFeedback(result);
          return;
        }
        setStatus(result.message ?? "");
        setDialog(undefined);
        router.refresh();
      } catch {
        setFeedback({ error: "No se guardaron los cambios. Vuelve a intentarlo." });
      }
    });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const invalid = event.currentTarget.querySelector<HTMLElement>(":invalid");
    if (invalid) {
      setFeedback({ error: "Completa los campos requeridos antes de guardar." });
      invalid.focus();
      return;
    }
    const data = new FormData(event.currentTarget);
    run(() => saveInstitutionRecord(data));
  }

  return <section className="cms-panel">
    <div className="cms-record-tools">
      <label className="cms-record-search"><Search size={18} aria-hidden="true" /><span className="visually-hidden">Filtrar registros</span><input type="search" value={search} placeholder="Filtrar registros" onChange={(event) => setSearch(event.target.value)} /></label>
      <button ref={add} className="primary-button" type="button" onClick={(event) => open("create", event.currentTarget)}><Plus size={18} aria-hidden="true" /> Agregar {singular[type]}</button>
    </div>
    <Feedback message={status} />
    <p className="cms-record-count">{found.length} {found.length === 1 ? "registro" : "registros"}</p>
    {found.length ? <ul className="cms-records cms-institution-records">
      {found.map((item) => {
        const title = recordTitle(item);
        const info = "role" in item ? [item.role, offices.find((office) => office.id === item.office)?.title ?? item.area].filter(Boolean).join(" · ")
          : "parent" in item ? units.find((parent) => parent.id === item.parent)?.title ?? "Nivel principal" : item.description;
        return <li key={item.id}>
          <div><strong>{title}</strong><small>{info}</small></div>
          <div className="cms-record-actions">
            {"slug" in item && <Link className="cms-icon-button" href={`/institucional/${item.slug}`} target="_blank" aria-label={`Ver ${title}`}><ExternalLink size={17} /></Link>}
            <button className="cms-icon-button" type="button" aria-label={`Editar ${title}`} onClick={(event) => open("edit", event.currentTarget, item)}><Pencil size={17} /></button>
            <button className="cms-icon-button" type="button" aria-label={`Eliminar ${title}`} onClick={(event) => open("remove", event.currentTarget, item)}><Trash2 size={17} /></button>
          </div>
        </li>;
      })}
    </ul> : <p className="catalog-empty">{search ? "Prueba otro nombre o cargo." : "Agrega el primer registro para que aparezca en el portal."}</p>}
    <ConfirmDialog open={Boolean(dialog)} onOpenChange={(visible) => { if (!visible) setDialog(undefined); }} returnFocus={() => (returnTo.current?.isConnected ? returnTo.current : add.current)?.focus()}
      title={`${dialog?.kind === "remove" ? "Eliminar" : dialog?.kind === "edit" ? "Editar" : "Agregar"} ${singular[type]}`}
      description={dialog?.kind === "remove"
        ? type === "organigrama" ? `Se eliminará «${active ? recordTitle(active) : ""}». Sus unidades dependientes pasarán al nivel superior.` : `Se quitará «${active ? recordTitle(active) : ""}» del portal público.`
        : "Los cambios se reflejarán en el portal al guardar."}
      confirm={dialog?.kind === "remove" ? "Eliminar" : "Guardar"}
      pending={pending} danger={dialog?.kind === "remove"}
      onConfirm={() => {
        if (dialog?.kind === "remove" && active) run(() => removeInstitutionRecord(type, active.id, revision));
        else form.current?.requestSubmit();
      }}>
      {dialog && dialog.kind !== "remove" && <form key={active?.id ?? "new"} ref={form} className="cms-form cms-fieldset" noValidate onSubmit={submit}>
        <input type="hidden" name="recordType" value={type} />
        <input type="hidden" name="id" value={active?.id ?? ""} />
        <input type="hidden" name="revision" value={revision} />
        <label>{type === "paginas" ? "Título" : "Nombre"}<input name="title" maxLength={120} defaultValue={active ? recordTitle(active) : ""} required /></label>
        {(type === "autoridades" || type === "personal") && <label>Cargo<input name="role" maxLength={120} defaultValue={person?.role} required /></label>}
        {type === "autoridades" && <label>Órgano<select name="kind" defaultValue={person?.kind === "mayor" ? "mayor" : "council"}><option value="mayor">Alcaldía</option><option value="council">Concejo Municipal</option></select></label>}
        {type === "personal" && <label>Área interna, si no está en el directorio<input name="area" maxLength={120} defaultValue={person?.area} /></label>}
        {showOffice && <label>Vincular al directorio<select name="office" defaultValue={person?.office ?? unit?.office ?? ""}><option value="">Sin vínculo</option>{offices.map((office) => <option key={office.id} value={office.id}>{office.title}</option>)}</select></label>}
        {type === "organigrama" && <label>Unidad superior<select name="parent" defaultValue={unit?.parent ?? ""}><option value="">Nivel principal</option>{units.filter((item) => item.id !== unit?.id).map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>}
        {type === "organigrama" && <label>Vincular una página institucional<select name="destination" defaultValue={unit?.href ?? ""}><option value="">Sin vínculo</option>
          {unit?.href && !destinations.some((item) => item.id === unit.href) && <option value={unit.href}>Enlace actual</option>}
          {destinations.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
        </select></label>}
        <label>{type === "paginas" ? "Resumen" : "Descripción"}<textarea name="description" maxLength={1800} rows={2} defaultValue={active?.description} required={type === "paginas"} /></label>
        {type === "paginas" && <label>Contenido<textarea name="body" maxLength={20000} rows={6} defaultValue={page?.body} required /></label>}
      </form>}
      <Feedback {...feedback} />
    </ConfirmDialog>
  </section>;
}
