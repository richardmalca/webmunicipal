export const sections = {
  noticias: "Noticias",
  avisos: "Avisos",
  tramites: "Trámites",
  directorio: "Directorio",
  transparencia: "Transparencia",
  agenda: "Agenda",
  galerias: "Galerías",
  videos: "Videos",
} as const;

export const photoCredits: Record<string, { alt: string; url: string; title?: string; caption?: string }> = {
  plaza: { title: "La plaza al aire libre", caption: "Los jardines y senderos rodean el centro de la plaza, con las torres de la catedral al fondo.", alt: "Plaza de Armas de Cusco bajo un cielo azul", url: "https://unsplash.com/photos/TuaegWPTqyU" },
  comunidad: { title: "Una pausa junto a la fuente", caption: "Los bancos y el césped reúnen a quienes cruzan la plaza y a quienes se quedan a conversar.", alt: "Personas reunidas frente a una fuente en Cusco", url: "https://unsplash.com/photos/kBRjkENt2GE" },
  cultura: { title: "Frente a la catedral", caption: "La fachada de piedra domina la explanada por donde pasean vecinos y visitantes.", alt: "Personas en la plaza frente a la catedral de Cusco", url: "https://unsplash.com/photos/cLxtFRLRoNk" },
  "biblioteca-itinerante": { alt: "Libros en un estante, fotograma de referencia", url: "https://www.pexels.com/video/choosing-a-book-from-the-bookshelves-6334041/" },
  "feria-de-productores": { alt: "Puestos de un mercado al aire libre, fotograma de referencia", url: "https://www.pexels.com/video/street-vendors-selling-vegetables-in-the-street-4102789/" },
  "huertos-comunitarios": { alt: "Preparación de una planta para trasplante, fotograma de referencia", url: "https://www.pexels.com/video/a-person-gardening-6508939/" },
  verde: { alt: "Colinas verdes entre la niebla", url: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05" },
};

export function formatDate(date: string, options: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" }) {
  return new Intl.DateTimeFormat("es-PE", { ...options, timeZone: "UTC" }).format(new Date(date + "T12:00:00Z"));
}

export function normalize(text: string) {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}



export function resolvePhoto(value?: string, alt?: string): { src: string; alt: string; unoptimized: boolean; title?: string; caption?: string; url?: string } | undefined {
  if (!value) return undefined;
  if (value.startsWith("/archivos/")) return { src: value, alt: alt || "Fotografía de la publicación", unoptimized: true };
  const photo = photoCredits[value];
  return photo ? { ...photo, src: `/photos/${value}.jpg`, unoptimized: false } : undefined;
}
