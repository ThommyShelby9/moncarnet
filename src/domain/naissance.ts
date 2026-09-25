import { z } from "zod";

export const LIEUX_NAISSANCE = ["centre", "domicile", "route", "hopital"] as const;
export const MODES_NAISSANCE = ["voie_basse", "cesarienne"] as const;
export type LieuNaissance = (typeof LIEUX_NAISSANCE)[number];
export type ModeNaissance = (typeof MODES_NAISSANCE)[number];

export const LIBELLES_LIEU: Record<LieuNaissance, string> = {
  centre: "Au centre de santé",
  domicile: "À la maison",
  route: "En route",
  hopital: "À l'hôpital",
};
export const LIBELLES_MODE: Record<ModeNaissance, string> = { voie_basse: "Voie basse", cesarienne: "Césarienne" };

export interface DeclarationNaissance {
  le: Date;
  lieu: LieuNaissance;
  mode: ModeNaissance;
  sexe: "F" | "M";
  /** Souvent donné plus tard, à la sortie de l'enfant : « Bébé » en attendant. */
  prenom: string | null;
  poidsGrammes: number;
  vaccinsNaissance: boolean;
}

const schema = z.object({
  date: z.iso.date(),
  heure: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  lieu: z.enum(LIEUX_NAISSANCE),
  mode: z.enum(MODES_NAISSANCE),
  sexe: z.enum(["F", "M"]),
  prenom: z.string().trim().max(60).optional(),
  poids: z.string().optional(),
  vaccins: z.string().optional(),
});

const LIBELLES_CHAMPS: Record<string, string> = { date: "la date", heure: "l'heure", lieu: "le lieu", mode: "le mode d'accouchement", sexe: "le sexe" };
const MESSAGE_POIDS = "Indiquez le poids du bébé, par exemple 3,2 kg.";

/** « 3,2 » ou « 3.2 » : des kilos ; « 3200 » : des grammes. */
function lirePoids(saisie: string | undefined): number | null {
  const nombre = Number((saisie ?? "").trim().replace(",", "."));
  if (!saisie?.trim() || !Number.isFinite(nombre) || nombre <= 0) return null;
  const grammes = Math.round(nombre < 10 ? nombre * 1000 : nombre);
  return grammes >= 400 && grammes <= 6500 ? grammes : null;
}

/** Déclaration de naissance saisie par la sage-femme ; l'heure est celle du Bénin (UTC+1). */
export function lireDeclarationNaissance(
  champs: Record<string, string | undefined>,
  maintenant: Date,
): { ok: true; saisie: DeclarationNaissance } | { ok: false; message: string } {
  const lecture = schema.safeParse(Object.fromEntries(Object.entries(champs).filter(([, v]) => v !== "")));
  if (!lecture.success) {
    const aVerifier = [...new Set(lecture.error.issues.map((p) => LIBELLES_CHAMPS[String(p.path[0])] ?? String(p.path[0])))];
    return { ok: false, message: `Vérifiez : ${aVerifier.join(", ")}.` };
  }
  const s = lecture.data;
  const le = new Date(`${s.date}T${s.heure}:00+01:00`);
  if (le.getTime() > maintenant.getTime() + 5 * 60_000) return { ok: false, message: "L'heure de naissance est dans le futur." };
  if (maintenant.getTime() - le.getTime() > 30 * 86_400_000) return { ok: false, message: "La naissance date de plus de 30 jours : voyez l'état civil." };
  const poidsGrammes = lirePoids(s.poids);
  if (poidsGrammes === null) return { ok: false, message: MESSAGE_POIDS };
  return {
    ok: true,
    saisie: { le, lieu: s.lieu, mode: s.mode, sexe: s.sexe, prenom: s.prenom || null, poidsGrammes, vaccinsNaissance: s.vaccins === "on" },
  };
}
