import type { ReactNode } from "react";
import "./admin.css";

export const metadata = { robots: { index: false, follow: false } };

export default function AdminRoot({ children }: { children: ReactNode }) {
  return children;
}
