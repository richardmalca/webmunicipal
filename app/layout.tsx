import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell } from "../components/public-shell";
import { getInstitutionalProfile } from "../lib/institutional-store";
import { isLocalCms } from "../lib/content";
import { sections } from "../lib/presentation";
import "@fontsource-variable/source-sans-3";
import "@fontsource-variable/source-serif-4";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Villa del Sol | Portal municipal", template: "%s | Villa del Sol" },
  description: "Portal municipal ficticio para demostración. Consulta noticias, avisos, trámites y actividades.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-PE">
      <body>
        <PublicShell track={isLocalCms()} institutionLinks={getInstitutionalProfile().profile.pages.map(({ slug, title }) => ({ href: `/institucional/${slug}`, label: title }))} footer={
        <footer className="site-footer">
          <div className="frame footer-row">
            <div><strong>Villa del Sol</strong><p>Municipalidad ficticia · Proyecto de portafolio</p></div>
            <nav aria-label="Enlaces del pie de página">
              <Link href="/institucional">Institucional</Link>
              {["avisos", "galerias", "videos", "directorio", "transparencia"].map((key) => <Link key={key} href={`/${key}`}>{sections[key as keyof typeof sections]}</Link>)}
              {process.env.NODE_ENV === "development" && !process.env.VERCEL && <Link href="/admin">Panel de administración</Link>}
            </nav>
          </div>
        </footer>
        }>{children}</PublicShell>
      </body>
    </html>
  );
}
