import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth } from "../../../auth";
import { isLocalCms } from "../../../lib/content";
import { LoginForm } from "../../../components/admin/login-form";

export const metadata = { title: "Iniciar sesión" };

export default async function LoginPage() {
  if (!isLocalCms()) notFound();
  const session = await auth();
  if (session?.user?.email && session.user.email === process.env.ADMIN_EMAIL?.toLowerCase()) redirect("/admin");

  return (
    <main className="cms-login">
      <div className="cms-login-image"><Image src="/photos/plaza.jpg" alt="Plaza de Armas de Cusco, fotografía referencial" fill sizes="(max-width: 850px) 100vw, 47vw" preload /></div>
      <div className="cms-login-main">
        <Link className="cms-back" href="/"><ArrowLeft size={18} aria-hidden="true" /> Volver al portal</Link>
        <section className="cms-login-panel">
          <Image src="/icon.svg" alt="" width={54} height={54} />
          <h1>Administración de Villa del Sol</h1>
          <p>Ingresa para publicar contenido y revisar la actividad del portal.</p>
          <LoginForm />
        </section>
      </div>
    </main>
  );
}
