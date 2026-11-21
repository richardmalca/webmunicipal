import { scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { getDatabase, isLocalCms } from "./lib/content";

const derive = promisify(scrypt);
const windowMs = 10 * 60 * 1000;

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET,
  trustHost: isLocalCms(),
  pages: { signIn: "/admin/login" },
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(credentials) {
        const configuredEmail = process.env.ADMIN_EMAIL?.toLowerCase();
        const [salt, hash] = process.env.ADMIN_PASSWORD_HASH?.split(":") ?? [];
        if (!isLocalCms() || !configuredEmail || !salt || !hash || !/^[a-f0-9]{128}$/i.test(hash)) return null;
        const email = typeof credentials.email === "string" ? credentials.email.trim().toLowerCase() : "";
        const password = typeof credentials.password === "string" ? credentials.password : "";
        if (!password || password.length > 160 || email.length > 254) return null;
        const db = getDatabase();
        const now = Date.now();
        const record = db.prepare(`
          INSERT INTO login_limits VALUES ('local', 1, ?)
          ON CONFLICT(subject) DO UPDATE SET
            attempts = CASE WHEN expires <= ? THEN 1 ELSE attempts + 1 END,
            expires = CASE WHEN expires <= ? THEN excluded.expires ELSE expires END
          RETURNING attempts
        `).get(now + windowMs, now, now);
        if (Number(record?.attempts) > 8) return null;
        const valid = timingSafeEqual(await derive(password, salt, 64) as Buffer, Buffer.from(hash, "hex"));
        if (!valid || email !== configuredEmail) return null;
        db.prepare("DELETE FROM login_limits WHERE subject = 'local'").run();
        return { id: "local-admin", email: configuredEmail, name: "Administración municipal" };
      },
    }),
  ],
});
