"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Header } from "./interactive";

export function PublicShell({ children, footer, track, institutionLinks }: { children: ReactNode; footer: ReactNode; track: boolean; institutionLinks: { href: string; label: string }[] }) {
  const pathname = usePathname();
  const admin = pathname === "/admin" || pathname.startsWith("/admin/") || pathname === "/editor";
  const lastPath = useRef<string>(null);

  useEffect(() => {
    if (!track || admin || lastPath.current === pathname) return;
    lastPath.current = pathname;
    void fetch("/api/views", { method: "POST", headers: { "x-page-path": pathname }, keepalive: true }).catch(() => {});
  }, [admin, pathname, track]);

  if (admin) return children;
  return <><a className="skip-link" href="#contenido">Ir al contenido</a><Header institutionLinks={institutionLinks} /><main id="contenido">{children}</main>{footer}</>;
}
