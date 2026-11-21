import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Play } from "lucide-react";
import type { Entry } from "../lib/content";
import { formatDate, resolvePhoto } from "../lib/presentation";

export function EntryCard({ entry }: { entry: Entry }) {
  const photo = resolvePhoto(entry.cover ?? entry.image ?? entry.photos?.[0], entry.coverAlt);
  return (
    <article className={photo ? "story-card" : "list-card"}>
      <Link href={`/${entry.section}/${entry.slug}`}>
        {photo && <div className="story-photo"><Image src={photo.src} alt={photo.alt} unoptimized={photo.unoptimized} fill sizes="(max-width: 569px) 100vw, (max-width: 999px) 50vw, (min-width: 1440px) min(33vw, 720px), 400px" /></div>}
        <div className="story-copy">
          <div className="meta">{entry.video && <span className="video-label"><Play size={13} aria-hidden="true" /> {entry.section === "noticias" ? "Nota en video" : "Video"}{entry.videoDuration && <> · {entry.videoDuration}</>}</span>}{entry.category}{entry.date && <time dateTime={entry.date}>{formatDate(entry.date)}</time>}</div>
          <h3>{entry.title}</h3>
          <p>{entry.description}</p>
        </div>
        {!photo && <ArrowRight size={20} aria-hidden="true" />}
      </Link>
    </article>
  );
}
