import { notFound, redirect } from "next/navigation";
import { auth } from "../auth";
import { isLocalCms } from "./content";

export async function requireAdmin() {
  if (!isLocalCms()) notFound();
  const session = await auth();
  if (!session?.user?.email || session.user.email !== process.env.ADMIN_EMAIL?.toLowerCase()) redirect("/admin/login");
  return session.user;
}
