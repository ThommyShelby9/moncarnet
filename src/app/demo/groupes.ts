import type { CompteDemo } from "@/server/demo/donnees";

export interface GroupeDemo {
  titre: string;
  texte: string;
  comptes: CompteDemo[];
}

const ORDRE_PRO: Record<string, number> = { soignant: 0, relais: 1, pharmacie: 2 };

/** L'ordre dans lequel le jury découvre la plateforme : les deux parcours usagers, puis ceux qui les accompagnent. */
export function groupesDemo(comptes: CompteDemo[]): GroupeDemo[] {
  const parcours = comptes.filter((c) => c.parcours?.length).sort((a, b) => (a.nomAffiche.startsWith("Awa") ? -1 : b.nomAffiche.startsWith("Awa") ? 1 : 0));
  const pros = comptes.filter((c) => c.role in ORDRE_PRO).sort((a, b) => ORDRE_PRO[a.role]! - ORDRE_PRO[b.role]!);
  const etat = comptes.filter((c) => c.role === "pilotage");
  const autres = comptes.filter((c) => !parcours.includes(c) && !pros.includes(c) && !etat.includes(c));
  return [
    { titre: "Deux parcours à suivre", texte: "Une future maman jusqu'à la naissance de son bébé, et un patient au quotidien.", comptes: parcours },
    { titre: "Soignants, relais et pharmacie", texte: "Ceux qui accompagnent les patients, au centre et dans les villages.", comptes: pros },
    { titre: "L'État", texte: "Des indicateurs sans aucun nom, pour décider.", comptes: etat },
    { titre: "Autres comptes", texte: "", comptes: autres },
  ].filter((g) => g.comptes.length > 0);
}
