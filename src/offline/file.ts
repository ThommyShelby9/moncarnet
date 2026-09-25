import { ageEnAnnees, libelleAge } from "@/domain/dates";
import { inscriptionDonneesSchema } from "@/domain/evenements";
import type { EvenementEntrant, ResultatSync } from "@/domain/synchronisation";
import type { PersonneTournee, Tournee } from "@/domain/tournee";

/** Saisie gardée sur le téléphone jusqu'à ce que le serveur l'ait reçue. */
export interface SaisieEnAttente extends EvenementEntrant {
  /** Ce que le relais lit : « Visite chez Afiavi Dossou ». */
  libelle: string;
  /** Réunit les saisies d'une même visite (signe de danger, tension, visite) : c'est l'identifiant de la visite ou de l'inscription. */
  groupe: string;
  nature: "visite" | "inscription";
  /** Une note vocale part après la saisie, une fois celle-ci reçue. */
  avecNote?: boolean;
}

/** Saisie refusée : elle reste sur le téléphone avec sa raison jusqu'à ce que le relais la retire (spec §10.2). */
export interface Refus {
  saisie: SaisieEnAttente;
  motif: string;
  le: string;
}

export interface Tri {
  restantes: SaisieEnAttente[];
  refus: Refus[];
  /** Saisies reçues (ou déjà reçues) dont la note vocale peut partir. */
  notesAEnvoyer: string[];
  recues: number;
}

/** Range la file après la réponse du serveur ; une saisie sans réponse reste dans la file. */
export function trierReponses(file: SaisieEnAttente[], resultats: ResultatSync[], maintenant: Date): Tri {
  const parId = new Map(resultats.map((r) => [r.id, r]));
  const tri: Tri = { restantes: [], refus: [], notesAEnvoyer: [], recues: 0 };
  for (const saisie of file) {
    const reponse = parId.get(saisie.id);
    if (!reponse) tri.restantes.push(saisie);
    else if (reponse.statut === "refuse") tri.refus.push({ saisie, motif: reponse.motif ?? "Refusée par le serveur.", le: maintenant.toISOString() });
    else {
      tri.recues++;
      if (saisie.avecNote) tri.notesAEnvoyer.push(saisie.id);
    }
  }
  return tri;
}

/** Ce que reçoit le serveur : la saisie, sans ce qui ne sert qu'au téléphone. */
export function versServeur({ id, patientId, type, survenuLe, donnees }: SaisieEnAttente): EvenementEntrant {
  return { id, patientId, type, survenuLe, donnees };
}

const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? "s" : ""}`;

/** « 2 visites et 1 inscription partiront dès que le réseau revient » : on compte ce que le relais a fait, pas les saisies. */
export function texteEnAttente(file: SaisieEnAttente[]): string | null {
  const groupes = new Map(file.map((s) => [s.groupe, s.nature]));
  if (groupes.size === 0) return null;
  const visites = [...groupes.values()].filter((n) => n === "visite").length;
  const inscriptions = groupes.size - visites;
  const morceaux = [visites ? pluriel(visites, "visite") : null, inscriptions ? pluriel(inscriptions, "inscription") : null].filter(Boolean);
  return `${morceaux.join(" et ")} ${groupes.size > 1 ? "partiront" : "partira"} dès que le réseau revient`;
}

/** La tournée telle que le relais la voit : la copie du serveur, plus ce qui a été saisi sur ce téléphone et attend le réseau. */
export function appliquerSaisiesLocales(tournee: Tournee, file: SaisieEnAttente[]): Tournee {
  const vues = new Set(file.filter((s) => s.type === "visite_domicile").map((s) => s.patientId));
  const inscrites = file.flatMap((s) => {
    if (s.type !== "inscription") return [];
    const lecture = inscriptionDonneesSchema.safeParse(s.donnees);
    return lecture.success ? [{ patientId: s.patientId, ...lecture.data }] : [];
  });
  return {
    ...tournee,
    foyers: tournee.foyers.map((foyer) => {
      const nouvelles: PersonneTournee[] = inscrites
        .filter((i) => i.foyerId === foyer.id && !foyer.personnes.some((p) => p.id === i.patientId))
        .map((i) => ({
          id: i.patientId,
          prenom: i.prenom,
          nom: i.nom,
          sexe: i.sexe,
          age: ageEnAnnees(i.dateNaissance, tournee.aujourdhui),
          libelleAge: libelleAge(i.dateNaissance, tournee.aujourdhui),
          telephone: i.telephone ?? null,
          enceinte: i.programme?.code === "grossesse",
          malvoyant: false,
          vueAujourdhui: false,
          raisons: [],
        }));
      return { ...foyer, personnes: [...foyer.personnes, ...nouvelles].map((p) => (vues.has(p.id) ? { ...p, vueAujourdhui: true } : p)) };
    }),
  };
}
