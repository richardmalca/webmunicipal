"use client";

import { Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Building2, CalendarDays, ClipboardList, FileText, Images, LayoutDashboard, Megaphone, Newspaper, Phone, Video } from "lucide-react";

const editorial = [
  { id: "noticias", label: "Noticias", icon: Newspaper },
  { id: "avisos", label: "Avisos", icon: Megaphone },
  { id: "agenda", label: "Agenda", icon: CalendarDays },
  { id: "galerias", label: "Galerías", icon: Images },
  { id: "videos", label: "Videos", icon: Video },
];

const services = [
  { id: "tramites", label: "Trámites", icon: ClipboardList },
  { id: "directorio", label: "Directorio de áreas", icon: Phone },
  { id: "transparencia", label: "Transparencia", icon: FileText },
];

function Navigation() {
  const pathname = usePathname();
  const filters = useSearchParams();
  const section = pathname.split("/")[3] === "nuevo" ? filters.get("seccion") : pathname.split("/")[3] || filters.get("seccion");
  const content = pathname.startsWith("/admin/contenido");

  return <nav className="cms-nav" aria-label="Panel de administración">
    <Link href="/admin" aria-current={pathname === "/admin" ? "page" : undefined}><LayoutDashboard size={18} aria-hidden="true" /> Resumen</Link>
    <Link href="/admin/contenido" aria-current={content && !section ? "location" : undefined}><Newspaper size={18} aria-hidden="true" /> Todo el contenido</Link>
    <Link href="/admin/institucional" aria-current={pathname === "/admin/institucional" ? "location" : undefined}><Building2 size={18} aria-hidden="true" /> Institucional</Link>
    <div className="cms-nav-group">
      <span>Publicaciones</span>
      {editorial.map(({ id, label, icon: Icon }) => <Link key={id} href={`/admin/contenido?seccion=${id}`} aria-current={content && section === id ? "location" : undefined}><Icon size={17} aria-hidden="true" />{label}</Link>)}
    </div>
    <div className="cms-nav-group">
      <span>Servicios municipales</span>
      {services.map(({ id, label, icon: Icon }) => <Link key={id} href={`/admin/contenido?seccion=${id}`} aria-current={content && section === id ? "location" : undefined}><Icon size={17} aria-hidden="true" />{label}</Link>)}
    </div>
  </nav>;
}

export function AdminNavigation() {
  return <Suspense fallback={null}><Navigation /></Suspense>;
}
