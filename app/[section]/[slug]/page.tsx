import Image from "next/image";
import Link from "next/link";
import { Download, ExternalLink } from "lucide-react";
import { notFound } from "next/navigation";
import { EntryCard } from "../../../components/entry-card";
import { Gallery } from "../../../components/interactive";
import { getEntries } from "../../../lib/content";
import { formatDate, resolvePhoto, sections } from "../../../lib/presentation";

const relatedSections: Record<string, string[]> = {
  noticias: ["noticias", "galerias"],
  avisos: ["avisos", "agenda"],
  tramites: ["tramites", "directorio"],
  directorio: ["directorio", "tramites"],
  transparencia: ["transparencia", "noticias"],
  agenda: ["agenda", "noticias"],
  galerias: ["videos", "noticias"],
  videos: ["galerias", "noticias"],
};

type PageProps = { params: Promise<{ section: string; slug: string }> };

export const dynamic = "force-dynamic";

async function findEntry(params: PageProps["params"]) {
  const { section, slug } = await params;
  return getEntries().find((entry) => entry.section === section && entry.slug === slug);
}

export async function generateMetadata({ params }: PageProps) {
  const entry = await findEntry(params);
  return { title: entry?.title, description: entry?.description };
}

export default async function DetailPage({ params }: PageProps) {
  const entry = await findEntry(params);
  if (!entry) notFound();
  const title = sections[entry.section as keyof typeof sections];

  const photo = resolvePhoto(entry.cover ?? entry.image, entry.coverAlt);
  const entries = getEntries();
  const office = entry.office ? entries.find((item) => item.section === "directorio" && item.title === entry.office) : undefined;
  const postcardGallery = entry.slug === "postales-en-video" && entries.some((item) => item.section === "galerias" && item.slug === "postales-de-la-plaza");
  const otherEntries = entries.filter((item) => item.section !== entry.section || item.slug !== entry.slug);
  const related = (entry.video
    ? otherEntries.filter((item) => item.video).sort((left, right) => (right.date ?? "").localeCompare(left.date ?? ""))
    : (relatedSections[entry.section] ?? []).flatMap((section) => otherEntries.filter((item) => item.section === section)))
    .slice(0, 3);

  const heading = (
    <header className="detail-heading">
      <h1 id="detail-title">{entry.title}</h1>
      <p className="article-lead">{entry.description}</p>
      <div className="meta">
        {entry.section === "noticias" && entry.video && <span className="video-label">Nota en video</span>}
        <span>{entry.category}</span>
        {entry.date && <time dateTime={entry.date}>{formatDate(entry.date)}</time>}
      </div>
    </header>
  );

  return (
    <div className={entry.video ? "frame subpage detail-page video-detail" : "frame subpage detail-page"}>
      <div className="breadcrumb"><Link href="/">Inicio</Link> / <Link href={`/${entry.section}`}>{title}</Link></div>
      {entry.video && heading}
      <div className="detail-layout">
        <article className="article detail-article" aria-labelledby="detail-title">
          {!entry.video && heading}
          {Boolean(entry.photos?.length) && <Gallery photos={entry.photos ?? []} />}
          {entry.video && <figure className="article-media">
            <video controls playsInline preload="metadata" poster={photo?.src} aria-label={entry.title} src={entry.video}>
              {entry.captions && <track kind="captions" src={entry.captions} srcLang="es" label="Español" />}
            </video>
            <figcaption>
              {entry.videoSource ? <>Video referencial sin narración · <a href={entry.videoSource}>{entry.videoCredit}</a></> : entry.slug === "postales-en-video" ? <>Montaje fotográfico{postcardGallery && <> · <Link href="/galerias/postales-de-la-plaza">Ver fotografías y fuentes</Link></>}</> : (entry.videoCredit || "Video de la publicación")}
              {entry.videoDuration && <span> · {entry.videoDuration}</span>}
            </figcaption>
          </figure>}
          {photo && !entry.photos?.length && !entry.video && <figure className="article-media">
            <div className="article-photo"><Image src={photo.src} alt={photo.alt} unoptimized={photo.unoptimized} fill sizes="(max-width: 959px) 100vw, (max-width: 1800px) 70vw, 1280px" /></div>
            {photo.url && <figcaption>Fotografía referencial · <a href={photo.url}>Fuente de la foto</a></figcaption>}
          </figure>}
          {entry.requirements && (
            <div className="procedure-guide">
              <dl className="procedure-facts">
                <div><dt>Área responsable</dt><dd>{office ? <Link href={`/directorio/${office.slug}`}>{office.title}</Link> : entry.office}</dd></div>
                <div><dt>Modalidad</dt><dd>Orientación presencial</dd></div>
              </dl>
              <section aria-labelledby="requirements-heading">
                <h2 id="requirements-heading">Requisitos</h2>
                <ul>{entry.requirements.map((requirement) => <li key={requirement}>{requirement}</li>)}</ul>
              </section>
              {entry.steps && <section aria-labelledby="procedure-heading">
                <h2 id="procedure-heading">Pasos para orientarte</h2>
                <ol>{entry.steps.map((step) => <li key={step}>{step}</li>)}</ol>
              </section>}
            </div>
          )}
          <div className="article-body">{entry.body.split("\n").map((line, index) => <p key={index}>{line}</p>)}</div>
          {entry.section === "directorio" && <Link className="text-link" href={`/institucional/equipo?area=${encodeURIComponent(entry.title)}`}>Ver personal de esta área</Link>}
          {entry.attachment && <div className="attachment-actions">
            <a className="primary-button" href={entry.attachment} target="_blank" rel="noreferrer">Ver PDF <ExternalLink size={17} aria-hidden="true" /></a>
            <a className="document-download" href={entry.attachment} download><Download size={17} aria-hidden="true" /> Descargar PDF</a>
          </div>}
        </article>
        {related.length > 0 && (
          <aside className="related-section" aria-labelledby="related-heading">
            <h2 id="related-heading">{entry.video ? "Más videos" : "Te podría interesar"}</h2>
            <div className="related-grid">
              {related.map((item) => <EntryCard key={`${item.section}/${item.slug}`} entry={item} />)}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
