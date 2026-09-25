import { normaliserCode } from "./ordonnances";
import { normaliserTelephone } from "./telephone";

export function sansAccents(texte: string): string {
  return texte.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
}

export interface Recherche {
  telephone: string | null;
  code: string | null;
  mots: string[];
}

/** Une seule case de recherche : un numéro, un code de carnet ou un nom (le code et le nom sont essayés tous les deux). */
export function analyserRecherche(saisie: string): Recherche {
  const texte = saisie.trim();
  return {
    telephone: /^[\d\s+().-]{8,}$/.test(texte) ? normaliserTelephone(texte) : null,
    code: normaliserCode(texte),
    mots: sansAccents(texte).split(/\s+/).filter(Boolean),
  };
}

export function correspondAuNom(personne: { prenom: string; nom: string }, mots: string[]): boolean {
  if (mots.length === 0) return false;
  const nomComplet = sansAccents(`${personne.prenom} ${personne.nom}`);
  return mots.every((mot) => nomComplet.includes(mot));
}
