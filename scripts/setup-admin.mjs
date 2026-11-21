import { randomBytes, scryptSync } from "node:crypto";
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from "node:fs";

const envFile = ".env.local";
const credentialsFile = ".demo/admin-credentials.txt";

if (existsSync(envFile)) {
  console.log("Ya existe .env.local. Se conservará la configuración actual.");
  if (existsSync(credentialsFile)) console.log(`Consulta ${credentialsFile} para iniciar sesión.`);
} else if (existsSync(credentialsFile)) {
  console.error(`Ya existe ${credentialsFile}, pero falta ${envFile}. Restaura la configuración o mueve ese archivo antes de generar un nuevo acceso.`);
  process.exitCode = 1;
} else {
  const email = "admin@villadelsol.example";
  const password = "VillaDelSol-Demo!";
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");

  mkdirSync(".demo", { recursive: true });
  writeFileSync(credentialsFile, `Correo: ${email}\nContraseña: ${password}\n`, { flag: "wx", mode: 0o600 });
  try {
    writeFileSync(envFile, [
      `AUTH_SECRET=${randomBytes(32).toString("base64url")}`,
      "AUTH_URL=http://localhost:3000",
      `ADMIN_EMAIL=${email}`,
      `ADMIN_PASSWORD_HASH=${salt}:${hash}`,
      "",
    ].join("\n"), { flag: "wx", mode: 0o600 });
  } catch (error) {
    unlinkSync(credentialsFile);
    throw error;
  }
  console.log(`Acceso local configurado. Consulta ${credentialsFile} para iniciar sesión.`);
}
