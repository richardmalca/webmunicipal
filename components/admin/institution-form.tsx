"use client";

import { useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { saveInstitution } from "../../app/admin/actions";
import { ConfirmDialog, Feedback } from "./dialog";

export function InstitutionForm({ children, revision }: { children: ReactNode; revision: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [feedback, setFeedback] = useState<{ error?: string; message?: string }>({});
  const work = useRef<FormData>(null);
  const form = useRef<HTMLFormElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  return <>
    <form ref={form} noValidate className="cms-form cms-institution-form" onSubmit={(event) => {
      event.preventDefault();
      const invalid = event.currentTarget.querySelector<HTMLElement>(":invalid");
      if (invalid) {
        setFeedback({ error: "Completa los campos obligatorios antes de publicar." });
        invalid.closest("details")?.setAttribute("open", "");
        invalid.focus();
        return;
      }
      work.current = new FormData(event.currentTarget);
      setFeedback({});
      setOpen(true);
    }}>
      <input type="hidden" name="revision" value={revision} />
      {!open && <Feedback {...feedback} />}
      {children}
      <div className="cms-form-actions"><button ref={trigger} className="primary-button" type="submit" disabled={pending}>Publicar cambios</button></div>
    </form>
    <ConfirmDialog open={open} onOpenChange={setOpen} returnFocus={() => trigger.current?.focus()} title="Publicar información institucional" description="El portal mostrará la nueva presentación, las funciones y el texto de comunicación institucional." confirm="Confirmar cambios" pending={pending} onConfirm={() => start(async () => {
      if (!work.current) return;
      try {
        const result = await saveInstitution(work.current);
        setFeedback(result);
        if (!result.error) {
          setOpen(false);
          form.current?.querySelectorAll<HTMLInputElement>('input[type="file"], input[type="checkbox"]').forEach((input) => { if (input.type === "file") input.value = ""; else input.checked = false; });
          router.refresh();
        }
      } catch {
        setFeedback({ error: "No se pudieron guardar los cambios. Vuelve a intentarlo." });
      }
    })}><Feedback {...feedback} /></ConfirmDialog>
  </>;
}
