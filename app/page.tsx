import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays, ChevronRight, ClipboardList, FileText, Images, Megaphone, Phone, Play } from "lucide-react";
import { EntryCard } from "../components/entry-card";
import { getEntries } from "../lib/content";
import { formatDate, resolvePhoto } from "../lib/presentation";

const shortcuts = [
  { href: "/tramites", title: "Trámites", description: "Requisitos y orientación", icon: ClipboardList },
  { href: "/directorio", title: "Directorio", description: "Áreas y contactos", icon: Phone },
  { href: "/transparencia", title: "Transparencia", description: "Documentos y acuerdos", icon: FileText },
  { href: "/agenda", title: "Agenda", description: "Actividades para vecinos", icon: CalendarDays },
];

export const dynamic = "force-dynamic";

export default function HomePage() {
  const entries = getEntries();
  const [featured, ...news] = entries.filter((entry) => entry.section === "noticias");
  const recentNews = news.sort((left, right) => (right.date ?? "").localeCompare(left.date ?? "")).slice(0, 6);
  const videoStory = recentNews.find((entry) => entry.video);
  const notice = entries.find((entry) => entry.section === "avisos");
  const events = entries.filter((entry) => entry.section === "agenda").slice(0, 4);
  const storyUrl = featured ? `/noticias/${featured.slug}` : "/noticias";
  const cover = resolvePhoto(featured?.cover ?? featured?.image, featured?.coverAlt);
  const gallery = entries.find((entry) => entry.section === "galerias");

  return (
    <div className="frame home">
      {notice && <div className="notice">
        <Megaphone size={19} aria-hidden="true" />
        <strong>Aviso municipal</strong>
        <Link href={`/avisos/${notice.slug}`}>{notice.title}<ChevronRight size={17} aria-hidden="true" /></Link>
      </div>}

      <div className={featured ? "home-overview" : "home-overview home-overview-empty"}>
        {featured && <section className={cover ? "hero" : "hero hero-no-photo"} aria-labelledby="featured-title">
          <div className="hero-copy">
            <h1 id="featured-title">{featured.title}</h1>
            <p>{featured.description}</p>
            <Link className="primary-button" href={storyUrl}>Leer la noticia <ArrowRight size={18} aria-hidden="true" /></Link>
          </div>
          {cover && <div className="hero-media">
            <Image src={cover.src} alt={cover.alt} unoptimized={cover.unoptimized} fill sizes="(max-width: 899px) 100vw, (min-width: 1440px) min(68vw, 1500px), 66vw" preload />
          </div>}
        </section>}

        <section className="service-panel" aria-labelledby="services-heading">
          <h2 id="services-heading">Servicios municipales</h2>
          <nav className="shortcuts" aria-labelledby="services-heading">
            {shortcuts.map(({ href, title, description, icon: Icon }) => (
              <Link key={href} href={href}>
                <span className="shortcut-icon"><Icon size={23} aria-hidden="true" /></span>
                <span><strong>{title}</strong><small>{description}</small></span>
                <ChevronRight className="shortcut-arrow" size={17} aria-hidden="true" />
              </Link>
            ))}
          </nav>
        </section>
      </div>

      <section className="home-section" aria-labelledby="news-heading">
        <div className="section-heading"><h2 id="news-heading">Últimas noticias</h2><Link className="text-link" href="/noticias">Ver noticias <ArrowRight size={17} /></Link></div>
        <div className="story-grid home-news">{!recentNews.length && <p>No hay noticias recientes.</p>}{recentNews.map((entry) => <EntryCard key={entry.slug} entry={entry} />)}</div>
      </section>

      <div className="home-section community-grid">
        <section aria-labelledby="agenda-heading">
          <div className="section-heading"><h2 id="agenda-heading">Agenda local</h2><Link className="text-link" href="/agenda">Ver agenda <ArrowRight size={17} /></Link></div>
          <div className="agenda-list">{events.map((event) => <Link key={event.slug} href={`/agenda/${event.slug}`}><time dateTime={event.date}><b>{formatDate(event.date!, { day: "numeric" })}</b>{formatDate(event.date!, { month: "short" })}</time><span><strong>{event.title}</strong><small>{event.description}</small></span><ArrowRight size={18} /></Link>)}</div>
        </section>
        <section className="media-section" aria-labelledby="media-heading">
          <h2 id="media-heading">Villa del Sol en imágenes</h2>
          {gallery && <Link href={`/galerias/${gallery.slug}`}><Images size={22} aria-hidden="true" /><span><strong>{gallery.title}</strong><small>{gallery.description}</small></span><ArrowRight size={18} aria-hidden="true" /></Link>}
          {videoStory && <Link href={`/noticias/${videoStory.slug}`}><Play size={22} aria-hidden="true" /><span><strong>{videoStory.title}</strong><small>Nota en video · {videoStory.videoDuration}</small></span><ArrowRight size={18} aria-hidden="true" /></Link>}
        </section>
      </div>
    </div>
  );
}
