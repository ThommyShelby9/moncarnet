import { z } from "zod";
import { LIBELLE_MOMENT_POSOLOGIE, MOMENTS_PRISE } from "./temps";
import type { LigneTraitement } from "./traitements";

/** Sans I, O, 0 ni 1 : faciles à confondre à l'oral comme à l'écrit. */
export const ALPHABET_CODE = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const FORMAT_CODE = /^[A-HJ-NP-Z2-9]{6}$/;

const aleatoireSur = () => crypto.getRandomValues(new Uint32Array(1))[0]! / 2 ** 32;

/** Code de retrait à 6 caractères, à donner au patient pour la pharmacie. */
export function genererCodeRetrait(aleatoire: () => number = aleatoireSur): string {
  return Array.from({ length: 6 }, () => ALPHABET_CODE[Math.floor(aleatoire() * ALPHABET_CODE.length)]).join("");
}

/** « k7p 4qx » → « K7P4QX » ; null si ce ne peut pas être un code. */
export function normaliserCode(saisie: string): string | null {
  const code = saisie.toUpperCase().replace(/[\s-]/g, "");
  return FORMAT_CODE.test(code) ? code : null;
}

const SANS_PRISE = "indiquez au moins une prise (matin, midi ou soir).";
const prises = z.coerce.number().int().min(0).max(6);
const texteFacultatif = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v || undefined);

const ligneSchema = z
  .object({
    medicament: z.string().trim().min(2).max(80),
    matin: prises,
    midi: prises,
    soir: prises,
    dureeJours: z.coerce.number().int().min(1).max(180),
    indication: texteFacultatif(60),
    conseil: texteFacultatif(80),
  })
  .refine((l) => l.matin + l.midi + l.soir > 0, { message: SANS_PRISE });

export const MAX_LIGNES = 4;

/** Lit les lignes d'un formulaire (« lignes.0.medicament »…) ; une ligne sans médicament est ignorée. */
export function lireLignes(champs: Record<string, unknown>): { ok: true; lignes: LigneTraitement[] } | { ok: false; message: string } {
  const lignes: LigneTraitement[] = [];
  for (let i = 0; i < MAX_LIGNES; i++) {
    const champ = (nom: string) => champs[`lignes.${i}.${nom}`];
    const medicament = String(champ("medicament") ?? "").trim();
    if (!medicament) continue;
    const lecture = ligneSchema.safeParse({
      medicament,
      matin: champ("matin") ?? 0,
      midi: champ("midi") ?? 0,
      soir: champ("soir") ?? 0,
      dureeJours: champ("dureeJours"),
      indication: champ("indication") ?? "",
      conseil: champ("conseil") ?? "",
    });
    if (!lecture.success) {
      const sansPrise = lecture.error.issues.some((p) => p.message === SANS_PRISE);
      return { ok: false, message: `Ligne ${i + 1} : ${sansPrise ? SANS_PRISE : "vérifiez les comprimés (0 à 6 par moment) et la durée (1 à 180 jours)."}` };
    }
    lignes.push(lecture.data);
  }
  return lignes.length ? { ok: true, lignes } : { ok: false, message: "Ajoutez au moins un médicament." };
}

export function quantiteTotale(ligne: LigneTraitement): number {
  return (ligne.matin + ligne.midi + ligne.soir) * ligne.dureeJours;
}

/** Posologie en phrases courtes : lue au patient à la pharmacie. */
export function texteDePosologie(ligne: LigneTraitement): string {
  const debut = ligne.indication ? `${ligne.medicament}, pour ${ligne.indication}.` : `${ligne.medicament}.`;
  const prisesDuJour = MOMENTS_PRISE.filter((m) => ligne[m] > 0).map(
    (m) => `${LIBELLE_MOMENT_POSOLOGIE[m]} : ${ligne[m]} comprimé${ligne[m] > 1 ? "s" : ""}.`,
  );
  const fin = `Pendant ${ligne.dureeJours} jour${ligne.dureeJours > 1 ? "s" : ""}${ligne.conseil ? `, ${ligne.conseil}` : ""}.`;
  return [debut, ...prisesDuJour, fin].join(" ");
}
