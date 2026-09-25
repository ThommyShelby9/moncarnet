import { randomBytes, scrypt as scryptRappel, timingSafeEqual, type ScryptOptions } from "node:crypto";

function scrypt(secret: string, sel: Buffer, longueur: number, options: ScryptOptions): Promise<Buffer> {
  return new Promise((resoudre, rejeter) =>
    scryptRappel(secret, sel, longueur, options, (erreur, cle) => (erreur ? rejeter(erreur) : resoudre(cle))),
  );
}

const N = 16384;
const R = 8;
const P = 1;
const LONGUEUR = 32;
const MEMOIRE_MAX = 64 * 1024 * 1024;

/** Empreinte au format scrypt$N$r$p$sel$cle (base64url). */
export async function hacher(secret: string): Promise<string> {
  const sel = randomBytes(16);
  const cle = await scrypt(secret, sel, LONGUEUR, { N, r: R, p: P, maxmem: MEMOIRE_MAX });
  return ["scrypt", N, R, P, sel.toString("base64url"), cle.toString("base64url")].join("$");
}

export async function verifier(secret: string, empreinte: string): Promise<boolean> {
  const [algo, n, r, p, sel, cle] = empreinte.split("$");
  if (algo !== "scrypt" || !n || !r || !p || !sel || !cle) return false;
  const attendue = Buffer.from(cle, "base64url");
  const calculee = await scrypt(secret, Buffer.from(sel, "base64url"), attendue.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
    maxmem: MEMOIRE_MAX,
  });
  return calculee.length === attendue.length && timingSafeEqual(calculee, attendue);
}
