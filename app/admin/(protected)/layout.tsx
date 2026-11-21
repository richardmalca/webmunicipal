import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { ExternalLink, LogOut } from "lucide-react";
import { requireAdmin } from "../../../lib/admin-auth";
import { AdminNavigation } from "../../../components/admin/navigation";
import { logout } from "../actions";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdmin();
  return (
    <div className="cms">
      <a className="skip-link" href="#cms-content">Ir al contenido</a>
      <aside className="cms-sidebar">
        <Link href="/admin" className="cms-brand"><Image src="/icon.svg" width={42} height={42} alt="" /><span><strong>Villa del Sol</strong><small>Administración municipal</small></span></Link>
        <AdminNavigation />
        <div className="cms-account">
          <Link href="/" className="cms-button"><ExternalLink size={17} aria-hidden="true" /> Ver portal</Link>
          <form action={logout}><button className="cms-button" type="submit"><LogOut size={17} aria-hidden="true" /> Cerrar sesión</button></form>
        </div>
      </aside>
      <main className="cms-main" id="cms-content" tabIndex={-1}>{children}</main>
    </div>
  );
}
