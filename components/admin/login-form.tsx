"use client";

import { useActionState } from "react";
import { ArrowRight } from "lucide-react";
import { login } from "../../app/admin/actions";
import { Feedback } from "./dialog";

export function LoginForm() {
  const [state, submit, pending] = useActionState(login, {});
  return (
    <form noValidate className="cms-form cms-login-form" action={submit}>
      <label>Correo de administración<input type="email" name="email" autoComplete="username" placeholder="admin@villadelsol.example" maxLength={254} required /></label>
      <label>Contraseña<input type="password" name="password" autoComplete="current-password" maxLength={160} required /></label>
      <Feedback error={state.error} />
      <button className="primary-button" disabled={pending}>{pending ? "Ingresando…" : "Iniciar sesión"} <ArrowRight size={18} aria-hidden="true" /></button>
    </form>
  );
}
