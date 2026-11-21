import Link from "next/link";

export default function NotFound() {
  return <div className="frame subpage"><h1>Página no encontrada</h1><p className="article-lead">La página solicitada ya no está disponible o la dirección cambió.</p><Link href="/" className="primary-button">Volver al inicio</Link></div>;
}
