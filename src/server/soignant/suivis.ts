import { and, eq, gte, inArray, isNotNull, isNull } from "drizzle-orm";
import { planifier, type EtapePlanifiee } from "@/domain/calendrier";
import { ajouterJours, joursEntre, libelleAge, type DateISO } from "@/domain/dates";
import { suiviDeGrossesse } from "@/domain/grossesse";
import { PROGRAMMES } from "@/domain/programmes";
import { statutEtape } from "@/domain/statuts";
import { dateCourte, dateLongue, libelleDansJours, majuscule } from "@/domain/temps";
import { consignesEnCours } from "../consignes";
import type { Db } from "../db/client";
import { evenements, foyers, inscriptions, patients, rendezVous } from "../db/schema";
import { cleEtape, etapesFaites } from "../requetes/etapes-faites";
import { mesuresDes } from "../requetes/risques";
import { telephonesPrincipaux } from "../requetes/soignant";

export interface LigneSuivi {
  patientId: string;
  prenom: string;
  nom: string;
  libelleAge: string;
  telephone: string | null;
  detail: string;
  /** Ce qui presse : une étape manquée, un chiffre trop haut. */
  alerte: string | null;
  /** Le foyer est suivi par un relais : on peut lui confier une visite. */
  relais: boolean;
  /** La dernière consigne confiée au relais et pas encore suivie d'une visite. */
  consigne: string | null;
}

export interface ListesDeSuivi {
  grossesses: LigneSuivi[];
  vaccins: LigneSuivi[];
  tension: LigneSuivi[];
  perdus: LigneSuivi[];
}

const PROCHE_JOURS = 7;
/** Un vaccin en retard de plus de 6 mois n'est plus « à relancer » : l'enfant relève d'un rattrapage au centre. */
const RETARD_VACCIN_MAX = 180;
/** Perdu de vue : une étape manquée depuis plus d'un mois, aucune venue depuis 3 mois, aucun rendez-vous à venir. */
const PERDU_RETARD = 30;
const PERDU_SANS_VENUE = 90;

type EtapeOuverte = EtapePlanifiee & { statut: "a_venir" | "manquee"; ecart: number };

/** Les listes de travail du centre : les personnes à relancer, par programme (spec §4.5). */
export async function listesDeSuivi(db: Db, etablissementId: string, aujourdhui: DateISO): Promise<ListesDeSuivi> {
  const personnes = await db
    .select({
      id: patients.id,
      prenom: patients.prenom,
      nom: patients.nom,
      dateNaissance: patients.dateNaissance,
      relaisId: foyers.relaisId,
    })
    .from(patients)
    .leftJoin(foyers, eq(patients.foyerId, foyers.id))
    .where(eq(patients.etablissementId, etablissementId));
  const ids = personnes.map((p) => p.id);
  const vide: ListesDeSuivi = { grossesses: [], vaccins: [], tension: [], perdus: [] };
  if (!ids.length) return vide;
  const [lesInscriptions, faites, rdvs, venues, mesures, telephones, consignes] = await Promise.all([
    db.select().from(inscriptions).where(and(inArray(inscriptions.patientId, ids), eq(inscriptions.active, true))),
    etapesFaites(db, ids),
    db
      .select({ patientId: rendezVous.patientId, inscriptionId: rendezVous.inscriptionId, etapeCode: rendezVous.etapeCode, datePrevue: rendezVous.datePrevue })
      .from(rendezVous)
      .where(and(inArray(rendezVous.patientId, ids), isNotNull(rendezVous.creneauId), isNull(rendezVous.annuleLe), gte(rendezVous.datePrevue, aujourdhui))),
    db
      .select({ patientId: evenements.patientId, le: evenements.survenuLe })
      .from(evenements)
      .where(and(inArray(evenements.patientId, ids), inArray(evenements.type, ["consultation", "vaccination"]))),
    mesuresDes(db, ids),
    telephonesPrincipaux(db, ids),
    consignesEnCours(db, ids),
  ]);
  const derniereVenue = new Map<string, Date>();
  for (const v of venues) if (!derniereVenue.has(v.patientId) || v.le > derniereVenue.get(v.patientId)!) derniereVenue.set(v.patientId, v.le);
  const aUnRendezVous = new Set(rdvs.map((r) => r.patientId));

  /** Étapes à rendez-vous ni faites ni déjà réservées, avec leur écart à aujourd'hui (négatif : en retard). */
  const etapesOuvertes = (i: (typeof lesInscriptions)[number]): EtapeOuverte[] =>
    planifier(PROGRAMMES[i.programme], i.dateReference, i.dateInscription).flatMap((etape) => {
      if (!etape.rendezVous || faites.get(i.patientId)?.has(cleEtape(etape.motif, etape.code))) return [];
      if (rdvs.some((r) => r.inscriptionId === i.id && r.etapeCode === etape.code)) return [];
      const statut = statutEtape(etape, false, aujourdhui);
      if (statut === "faite") return [];
      return [{ ...etape, statut, ecart: joursEntre(aujourdhui, etape.datePrevue) }];
    });

  const ligne = (p: (typeof personnes)[number], detail: string, alerte: string | null): LigneSuivi => ({
    patientId: p.id,
    prenom: p.prenom,
    nom: p.nom,
    libelleAge: libelleAge(p.dateNaissance, aujourdhui),
    telephone: telephones.get(p.id) ?? null,
    detail,
    alerte,
    relais: p.relaisId !== null,
    consigne: consignes.get(p.id)?.at(-1)?.texte ?? null,
  });
  const parId = new Map(personnes.map((p) => [p.id, p]));
  const listes: { [K in keyof ListesDeSuivi]: { ligne: LigneSuivi; rang: number }[] } = { grossesses: [], vaccins: [], tension: [], perdus: [] };

  for (const i of lesInscriptions) {
    const p = parId.get(i.patientId)!;
    const ouvertes = etapesOuvertes(i);
    const manquees = ouvertes.filter((e) => e.statut === "manquee");
    if (i.programme === "grossesse") {
      const g = suiviDeGrossesse(i.dateReference, aujourdhui);
      const alerte = manquees.length === 1 ? `${manquees[0]!.libelle} manquée` : manquees.length > 1 ? `${manquees.length} consultations manquées` : null;
      listes.grossesses.push({ ligne: ligne(p, `${g.semaines} SA · terme le ${dateLongue(g.terme)}`, alerte), rang: g.joursAvantTerme });
    }
    if (i.programme === "vaccination") {
      const retard = manquees.filter((e) => -e.ecart <= RETARD_VACCIN_MAX);
      const proches = ouvertes.filter((e) => e.statut === "a_venir" && e.ecart >= 0 && e.ecart <= PROCHE_JOURS);
      if (retard.length) {
        const e = retard[0]!;
        listes.vaccins.push({ ligne: ligne(p, `${e.libelle} (${e.details ?? ""})`, `En retard de ${-e.ecart} jours`), rang: e.ecart });
      } else if (proches.length) {
        const e = proches[0]!;
        listes.vaccins.push({ ligne: ligne(p, `${e.libelle} : ${libelleDansJours(e.ecart)}`, null), rang: 1000 + e.ecart });
      }
    }
    if (i.programme === "hypertension") {
      const derniere = (mesures.get(p.id) ?? []).filter((m) => m.tensionSys !== undefined && m.tensionDia !== undefined).at(-1);
      const haute = derniere && (derniere.tensionSys! >= 140 || derniere.tensionDia! >= 90);
      if (haute || manquees.length) {
        const detail = derniere ? `Dernière tension : ${derniere.tensionSys}/${derniere.tensionDia} (le ${dateCourte(derniere.date)})` : "Aucune tension relevée";
        listes.tension.push({ ligne: ligne(p, detail, manquees.length ? "Contrôle manqué" : null), rang: -(derniere?.tensionSys ?? 0) });
      }
    }
    const ancienne = manquees.filter((e) => -e.ecart > PERDU_RETARD).sort((a, b) => a.ecart - b.ecart)[0];
    const venue = derniereVenue.get(p.id);
    const sansVenue = !venue || venue < new Date(`${ajouterJours(aujourdhui, -PERDU_SANS_VENUE)}T00:00:00Z`);
    if (ancienne && sansVenue && !aUnRendezVous.has(p.id) && !listes.perdus.some((x) => x.ligne.patientId === p.id)) {
      const detail = venue ? `Dernière venue le ${dateCourte(venue.toISOString().slice(0, 10))}` : "Jamais venu au centre depuis l'inscription";
      listes.perdus.push({ ligne: ligne(p, detail, `${majuscule(ancienne.libelle)} : en retard de ${-ancienne.ecart} jours`), rang: ancienne.ecart });
    }
  }
  const trier = (l: { ligne: LigneSuivi; rang: number }[]) =>
    l.sort((a, b) => a.rang - b.rang || a.ligne.nom.localeCompare(b.ligne.nom, "fr") || a.ligne.prenom.localeCompare(b.ligne.prenom, "fr")).map((x) => x.ligne);
  return { grossesses: trier(listes.grossesses), vaccins: trier(listes.vaccins), tension: trier(listes.tension), perdus: trier(listes.perdus) };
}
