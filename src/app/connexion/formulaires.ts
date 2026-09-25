import { z } from "zod";
import { normaliserTelephone } from "@/domain/telephone";

export type EtatFormulaire = { message?: string };

type Lecture<T> = ({ ok: true } & T) | { ok: false; message: string };

const schemaPatient = z.object({
  telephone: z.string().trim().min(1, "Indiquez votre numéro de téléphone."),
  code: z.string().regex(/^\d{4}$/, "Le code doit avoir 4 chiffres."),
});

const schemaPersonnel = z.object({
  identifiant: z.string().trim().toLowerCase().min(3, "Indiquez votre identifiant."),
  motDePasse: z.string().min(8, "Le mot de passe a au moins 8 caractères."),
});

export function lireConnexionPatient(fd: FormData): Lecture<{ identifiant: string; code: string }> {
  const lu = schemaPatient.safeParse({ telephone: fd.get("telephone") ?? "", code: fd.get("code") ?? "" });
  if (!lu.success) return { ok: false, message: lu.error.issues[0]!.message };
  const telephone = normaliserTelephone(lu.data.telephone);
  if (!telephone) return { ok: false, message: "Ce numéro n'est pas un numéro béninois valide." };
  return { ok: true, identifiant: telephone, code: lu.data.code };
}

export function lireConnexionPersonnel(fd: FormData): Lecture<{ identifiant: string; motDePasse: string }> {
  const lu = schemaPersonnel.safeParse({ identifiant: fd.get("identifiant") ?? "", motDePasse: fd.get("motDePasse") ?? "" });
  if (!lu.success) return { ok: false, message: lu.error.issues[0]!.message };
  return { ok: true, ...lu.data };
}

export function heureBenin(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Porto-Novo" })
    .format(date)
    .replace(":", " h ");
}

export function messageEchec(raison: "identifiants" | "verrouille", jusqua: Date | undefined, publicVise: "patient" | "personnel"): string {
  if (raison === "verrouille" && jusqua) return `Trop d'essais. Vous pourrez réessayer à ${heureBenin(jusqua)}.`;
  return publicVise === "patient" ? "Numéro ou code incorrect." : "Identifiant ou mot de passe incorrect.";
}
