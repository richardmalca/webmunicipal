"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { Menu, Search, X, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { resolvePhoto, sections } from "../lib/presentation";

const navigation = [
  { id: "municipio", label: "Institucional", links: [
    { href: "/institucional", label: "Información general" },
    { href: "/institucional/autoridades", label: "Alcaldía y regidores" },
    { href: "/institucional/organigrama", label: "Organigrama" },
    { href: "/institucional/equipo", label: "Directorio de personal" },
    { href: "/institucional/imagen-institucional", label: "Imagen institucional" },
    { href: "/directorio", label: sections.directorio + " de áreas" },
  ] },
  { id: "actualidad", label: "Actualidad", links: [
    { href: "/noticias", label: sections.noticias },
    { href: "/avisos", label: sections.avisos },
    { href: "/agenda", label: sections.agenda },
  ] },
  { id: "tramites", label: sections.tramites, href: "/tramites" },
  { id: "transparencia", label: sections.transparencia, href: "/transparencia" },
  { id: "multimedia", label: "Multimedia", links: [
    { href: "/galerias", label: sections.galerias },
    { href: "/videos", label: sections.videos },
  ] },
];

export function Header({ institutionLinks }: { institutionLinks: { href: string; label: string }[] }) {
  const menu = navigation.map((group) => group.id === "municipio" ? { ...group, links: [...(group.links ?? []), ...institutionLinks] } : group);
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string>();
  const header = useRef<HTMLElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const activeGroup = menu.find((group) => (group.links ?? [group]).some(({ href }) => href && (pathname === href || pathname.startsWith(href + "/"))));
  const activeLink = activeGroup?.links?.find(({ href }) => pathname === href)
    ?? activeGroup?.links?.find(({ href }) => pathname.startsWith(href + "/"))
    ?? activeGroup;
  const label = activeLink?.label ?? (pathname === "/" ? "Inicio" : pathname === "/buscar" ? "Buscar" : pathname === "/editor" ? "Editor local" : undefined);

  function closeNavigation() {
    setOpen(false);
    setExpanded(undefined);
  }

  useEffect(() => {
    if (!open && !expanded) return;
    function dismiss(event: PointerEvent) {
      if (event.target instanceof Node && !header.current?.contains(event.target)) {
        setOpen(false);
        setExpanded(undefined);
      }
    }
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [open, expanded]);

  function current(href: string) {
    if (pathname === href) return "page";
    if (href === activeLink?.href) return "location";
  }

  function navigationItems(surface: "desktop" | "mobile") {
    return (
      <>
        <Link className="nav-item" href="/" onClick={closeNavigation} aria-current={current("/")}>Inicio</Link>
        {menu.map(({ id, label: title, href, links }) => {
          if (href) return <Link key={id} className="nav-item" href={href} onClick={closeNavigation} aria-current={current(href)}>{title}</Link>;
          const revealed = expanded === id;
          const panelId = `${surface}-${id}`;
          return (
            <div key={id} className="nav-group" onBlur={(event) => {
              if (surface === "desktop" && revealed && !event.currentTarget.contains(event.relatedTarget)) setExpanded(undefined);
            }}>
              <button id={`${panelId}-trigger`} className="nav-item" type="button" data-active={activeGroup?.id === id || undefined} aria-expanded={revealed} aria-controls={panelId} onClick={() => setExpanded(revealed ? undefined : id)}>
                {title}<ChevronDown size={15} aria-hidden="true" />
              </button>
              <ul id={panelId} className="nav-submenu" hidden={!revealed}>
                {links?.map(({ href: link, label: name }) => (
                  <li key={link}><Link href={link} onClick={closeNavigation} aria-current={current(link)}>{name}</Link></li>
                ))}
              </ul>
            </div>
          );
        })}
      </>
    );
  }

  return (
    <header ref={header} className="site-header" onKeyDown={(event) => {
      if (event.key !== "Escape") return;
      if (open) {
        closeNavigation();
        menuButton.current?.focus();
      } else if (expanded) {
        setExpanded(undefined);
        header.current?.querySelector<HTMLButtonElement>(`#desktop-${expanded}-trigger`)?.focus();
      }
    }}>
      <div className="frame header-row">
        <Link href="/" className="brand" onClick={closeNavigation}>
          <Image src="/icon.svg" width={48} height={48} alt="" />
          <span><small>Municipalidad ficticia</small><strong>Villa del Sol</strong></span>
        </Link>
        <nav className="desktop-nav" aria-label="Menú principal">{navigationItems("desktop")}</nav>
        <div className="header-actions">
          <Link href="/buscar" className="icon-button" aria-label="Buscar" aria-current={pathname === "/buscar" ? "page" : undefined} onClick={closeNavigation}><Search size={20} /></Link>
          <button ref={menuButton} type="button" className="icon-button menu-toggle" onClick={() => {
            if (open) closeNavigation();
            else {
              setOpen(true);
              setExpanded(activeGroup?.links ? activeGroup.id : undefined);
            }
          }} aria-expanded={open} aria-controls={open ? "mobile-nav" : undefined} aria-label={open ? "Cerrar menú" : "Abrir menú"}>{open ? <X size={22} /> : <Menu size={22} />}</button>
        </div>
      </div>
      {label && <div className="frame mobile-location">
        <span>Estás en</span>
        {activeLink?.href && pathname !== activeLink.href
          ? <Link href={activeLink.href} onClick={closeNavigation}>{label}</Link>
          : <strong>{label}</strong>}
      </div>}
      <MotionConfig reducedMotion="user">
        <AnimatePresence>
          {open && <motion.nav id="mobile-nav" className="mobile-nav frame" aria-label="Menú principal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.13 }}>{navigationItems("mobile")}</motion.nav>}
        </AnimatePresence>
      </MotionConfig>
    </header>
  );
}

export function Gallery({ photos }: { photos: string[] }) {
  const [active, setActive] = useState(0);
  const photo = photos[active];
  const credit = resolvePhoto(photo)!;
  const move = (step: number) => setActive((index) => (index + step + photos.length) % photos.length);

  return (
    <section className="gallery" aria-label="Galería de fotos">
      <figure>
        <div key={photo} className="gallery-photo">
          <Image src={credit.src} alt={credit.alt} unoptimized={credit.unoptimized} fill sizes="(max-width: 959px) 100vw, (max-width: 1800px) 70vw, 1280px" />
        </div>
        <figcaption className="gallery-caption" aria-live="polite">
          <div>
            <span className="gallery-count">Foto {active + 1} de {photos.length}</span>
            <strong>{credit.title ?? credit.alt}</strong>
            {credit.caption && <p>{credit.caption}</p>}
            {"url" in credit && <a href={credit.url}>Fuente de la foto</a>}
          </div>
          <div className="gallery-arrows">
            <button className="icon-button" onClick={() => move(-1)} aria-label="Foto anterior"><ChevronLeft size={22} /></button>
            <button className="icon-button" onClick={() => move(1)} aria-label="Siguiente foto"><ChevronRight size={22} /></button>
          </div>
        </figcaption>
      </figure>
      <div className="gallery-thumbnails" role="group" aria-label="Elegir una foto">
        {photos.map((item, index) => (
          <button key={item} type="button" aria-pressed={index === active} aria-label={resolvePhoto(item)?.title ?? `Foto ${index + 1}`} onClick={() => setActive(index)}>
            <Image src={resolvePhoto(item)!.src} alt="" unoptimized={resolvePhoto(item)!.unoptimized} fill sizes="(max-width: 600px) 28vw, 120px" />
          </button>
        ))}
      </div>
    </section>
  );
}
