"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { CheckCircle2, CircleAlert, X } from "lucide-react";
import { useRef, type ReactNode } from "react";

export function Feedback({ error, message }: { error?: string; message?: string }) {
  if (!error && !message) return null;
  const Icon = error ? CircleAlert : CheckCircle2;
  return <div className={error ? "cms-feedback cms-feedback-error" : "cms-feedback"} role={error ? "alert" : "status"}><Icon size={19} aria-hidden="true" />{error || message}</div>;
}

export function ConfirmDialog({ open, onOpenChange, title, description, confirm, pending, danger, onConfirm, returnFocus, children }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirm: string;
  pending: boolean;
  danger?: boolean;
  onConfirm: () => void;
  returnFocus?: () => void;
  children?: ReactNode;
}) {
  const cancel = useRef<HTMLButtonElement>(null);
  return (
    <Dialog.Root open={open} onOpenChange={(visible) => { if (!pending) onOpenChange(visible); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="cms-overlay" />
        <Dialog.Content className="cms-dialog" onCloseAutoFocus={(event) => {
          if (returnFocus) {
            event.preventDefault();
            returnFocus();
          }
        }} onOpenAutoFocus={(event) => {
          event.preventDefault();

          cancel.current?.focus();
        }}>
          <div className="cms-dialog-header">
            <Dialog.Title>{title}</Dialog.Title>
            <Dialog.Close className="cms-icon-button" disabled={pending} aria-label="Cerrar diálogo"><X size={20} /></Dialog.Close>
          </div>
          <Dialog.Description>{description}</Dialog.Description>
          {children}
          <div className="cms-dialog-actions">
            <Dialog.Close ref={cancel} className="cms-button" disabled={pending}>Cancelar</Dialog.Close>
            <button className={danger ? "cms-button cms-danger" : "primary-button"} type="button" disabled={pending} onClick={onConfirm}>{pending ? "Guardando…" : confirm}</button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
