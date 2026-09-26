import { randomUUID } from "node:crypto";
import { and, asc, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { planifier } from "@/domain/calendrier";
import { ageEnAnnees, ajouterJours, depuisDateISO, joursEntre, type DateISO } from "@/domain/dates";
import { agreger, CODES_INDICATEURS, INDICATEURS, moisPrecedents, premierDuMois, type CodeIndicateur, type Valeurs } from "@/domain/pilotage";
import { PROGRAMMES, type CodeProgramme, type MotifRdv } from "@/domain/programmes";
import { texteRappel } from "@/domain/rappels";
import { hacher } from "../auth/mots-de-passe";
import type { Db } from "../db/client";
import * as t from "../db/schema";
import { reserver } from "../patient/reservation";
import { indicateursDesCommunes } from "../requetes/pilotage";
import { COMPTES_DEMO } from "./donnees";

export interface BilanDemo {
  comptes: number;
  foyers: number;
  patients: number;
  rendezVous: number;
  evenements: number;
}

type Hasard = ReturnType<typeof hasard>;

/** Générateur pseudo-aléatoire déterministe (mulberry32) : la démo est identique à chaque remplissage. */
function hasard(graine: number) {
  let a = graine;
  const suivant = () => {
    a = (a + 0x6d2b79f5) | 0;
    let x = Math.imul(a ^ (a >>> 15), 1 | a);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
  return {
    nombre: suivant,
    entier: (min: number, max: number) => min + Math.floor(suivant() * (max - min + 1)),
    parmi: <T,>(liste: readonly T[]): T => liste[Math.floor(suivant() * liste.length)]!,
    chance: (p: number) => suivant() < p,
  };
}

const PRENOMS_F = ["Afiavi", "Bernadette", "Chantal", "Dossi", "Estelle", "Fifamè", "Florence", "Gisèle", "Hortense", "Jocelyne", "Nadège", "Pélagie", "Reine", "Sandrine", "Victoire", "Rose"] as const;
const PRENOMS_M = ["Arsène", "Bienvenu", "Cocou", "Dieudonné", "Éric", "Fiacre", "Gildas", "Hervé", "Kokou", "Mathias", "Noël", "Rodrigue", "Sèdjro", "Wilfried"] as const;
const NOMS = ["Adjovi", "Agossou", "Ahouandjinou", "Assogba", "Gbèdo", "Kpadonou", "Tossou", "Zinsou", "Houénou", "Sossou", "Adanlé", "Dansou", "Hounsa", "Kiki"] as const;
const VILLAGES_BOHICON = ["Bohicon centre", "Gnidjazoun", "Lissèzoun", "Passagon"] as const;
const VILLAGES_SEHOUN = ["Sèhoun", "Kinta", "Adingnigon"] as const;
const ALPHABET_CODE = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const TABLES = [
  "consignes", "rappels", "passages", "indicateurs_zones", "fichiers", "alertes", "liste_attente",
  "contenus_traductions", "contenus", "ordonnances", "evenements", "rendez_vous", "creneaux", "modeles_plages",
  "inscriptions", "responsables", "consentements", "contacts", "patients", "foyers", "sessions", "comptes",
  "etablissements", "communes",
];

interface Personne {
  cle?: string;
  prenom: string;
  nom: string;
  sexe: "F" | "M";
  dateNaissance: DateISO;
  foyerId: string;
  langue?: t.Langue;
  canalPrefere?: t.Canal;
  malvoyant?: boolean;
  antecedents?: { cesarienne?: boolean };
  telephone?: string;
  proprietaireTelephone?: "soi" | "proche" | "relais";
  programmes: { code: CodeProgramme; dateReference: DateISO; dateInscription: DateISO }[];
}

export async function semerDemo(db: Db, { aujourdhui }: { aujourdhui: DateISO }): Promise<BilanDemo> {
  const h = hasard(20260925);
  await db.execute(sql.raw(`TRUNCATE TABLE ${TABLES.map((n) => `"${n}"`).join(", ")} RESTART IDENTITY CASCADE`));

  const codesUtilises = new Set<string>();
  codesUtilises.add("K7P4QX");
  codesUtilises.add("M4R2TN");
  const codeUnique = () => {
    let code = "";
    do code = Array.from({ length: 6 }, () => h.parmi([...ALPHABET_CODE])).join("");
    while (codesUtilises.has(code));
    codesUtilises.add(code);
    return code;
  };

  // --- Lieux ---
  const [bohicon, zogbodomey] = await db
    .insert(t.communes)
    .values([
      { nom: "Bohicon", departement: "Zou", zoneSanitaire: "Zogbodomey-Bohicon-Zakpota" },
      { nom: "Zogbodomey", departement: "Zou", zoneSanitaire: "Zogbodomey-Bohicon-Zakpota" },
    ])
    .returning();
  const [cs, pharmacie] = await db
    .insert(t.etablissements)
    .values([
      { nom: "Centre de santé de Bohicon", type: "centre_sante", communeId: bohicon!.id, telephone: "+2290121000000" },
      { nom: "Pharmacie Sainte-Rita", type: "pharmacie", communeId: bohicon!.id, telephone: "+2290121000001" },
    ])
    .returning();

  // --- Comptes ---
  const lignesComptes = await Promise.all(
    COMPTES_DEMO.map(async (c) => ({
      role: c.role,
      identifiant: c.identifiant,
      nomAffiche: c.nomAffiche,
      empreinteSecret: await hacher(c.secret),
      etablissementId: c.role === "soignant" ? cs!.id : c.role === "pharmacie" ? pharmacie!.id : null,
      communeId: c.role === "relais" || (c.role === "pilotage" && c.portee !== "national") ? bohicon!.id : null,
    })),
  );
  const listeComptes = await db.insert(t.comptes).values(lignesComptes).returning();
  const compte = (identifiant: string) => listeComptes.find((c) => c.identifiant === identifiant)!;
  const relais = compte("koffi.agbessi");
  const firmin = compte("firmin.akpovi");
  const adjoa = compte("adjoa.gbaguidi");
  const pharmacien = compte("pharmacie.sainte-rita");

  // --- Foyers ---
  const creerFoyer = async (nom: string, village: string, communeId: string) => {
    // Koffi est le relais de Sèhoun : il suit les foyers de Zogbodomey.
    const relaisId = communeId === zogbodomey!.id ? relais.id : null;
    const [f] = await db.insert(t.foyers).values({ nom, village, communeId, relaisId }).returning();
    return f!;
  };
  const fHoungbo = await creerFoyer("Houngbo", "Bohicon centre", bohicon!.id);
  const fHounkpatin = await creerFoyer("Hounkpatin", "Lissèzoun", bohicon!.id);
  const fDossou = await creerFoyer("Dossou", "Sèhoun", zogbodomey!.id);
  const fSalifou = await creerFoyer("Salifou", "Sèhoun", zogbodomey!.id);

  // 8 mois et 28 jours : ses vaccins des 9 mois tombent dans 2 jours (scénario de démo, spec §15).
  const naissanceSena = ajouterJours(aujourdhui, -268);
  const personnages: Personne[] = [
    { cle: "codjo", prenom: "Codjo", nom: "Houngbo", sexe: "M", dateNaissance: "1968-03-12", foyerId: fHoungbo.id, canalPrefere: "whatsapp", telephone: "+2290197000001", proprietaireTelephone: "soi",
      programmes: [{ code: "hypertension", dateReference: "2023-05-10", dateInscription: ajouterJours(aujourdhui, -200) }] },
    { cle: "mariam", prenom: "Mariam", nom: "Houngbo", sexe: "F", dateNaissance: "1972-07-02", foyerId: fHoungbo.id, canalPrefere: "whatsapp", telephone: "+2290197000001", proprietaireTelephone: "proche",
      programmes: [{ code: "consultation", dateReference: ajouterJours(aujourdhui, -200), dateInscription: ajouterJours(aujourdhui, -200) }] },
    { cle: "sena", prenom: "Sèna", nom: "Houngbo", sexe: "M", dateNaissance: naissanceSena, foyerId: fHoungbo.id, canalPrefere: "whatsapp", telephone: "+2290197000001", proprietaireTelephone: "proche",
      programmes: [{ code: "vaccination", dateReference: naissanceSena, dateInscription: naissanceSena }] },
    { cle: "awa", prenom: "Awa", nom: "Hounkpatin", sexe: "F", dateNaissance: "2002-04-18", foyerId: fHounkpatin.id, canalPrefere: "whatsapp", telephone: "+2290197000002", proprietaireTelephone: "soi",
      programmes: [{ code: "grossesse", dateReference: ajouterJours(aujourdhui, -(37 * 7 + 2)), dateInscription: ajouterJours(aujourdhui, -(37 * 7 + 2) + 10 * 7) }] },
    { cle: "afiavi", prenom: "Afiavi", nom: "Dossou", sexe: "F", dateNaissance: "1995-01-09", foyerId: fDossou.id, canalPrefere: "sms", telephone: "+2290197000003", proprietaireTelephone: "soi",
      programmes: [{ code: "grossesse", dateReference: ajouterJours(aujourdhui, -29 * 7), dateInscription: ajouterJours(aujourdhui, -19 * 7) }] },
    { cle: "rachida", prenom: "Rachida", nom: "Salifou", sexe: "F", dateNaissance: "1955-02-14", foyerId: fSalifou.id, canalPrefere: "vocal", malvoyant: true, telephone: "+2290197000004", proprietaireTelephone: "proche",
      programmes: [{ code: "diabete", dateReference: "2020-03-01", dateInscription: ajouterJours(aujourdhui, -300) }] },
    { cle: "aicha", prenom: "Aïcha", nom: "Salifou", sexe: "F", dateNaissance: "1985-10-30", foyerId: fSalifou.id, canalPrefere: "whatsapp", telephone: "+2290197000004", proprietaireTelephone: "soi",
      programmes: [{ code: "consultation", dateReference: ajouterJours(aujourdhui, -300), dateInscription: ajouterJours(aujourdhui, -300) }] },
  ];

  // --- Population générée : 20 foyers de 2 à 4 personnes ---
  const population: Personne[] = [];
  for (let i = 0; i < 20; i++) {
    const nom = h.parmi(NOMS);
    const enBohicon = h.chance(0.6);
    const foyer = await creerFoyer(nom, h.parmi(enBohicon ? VILLAGES_BOHICON : VILLAGES_SEHOUN), enBohicon ? bohicon!.id : zogbodomey!.id);
    const taille = h.entier(2, 4);
    for (let j = 0; j < taille; j++) {
      const sexe = h.chance(0.55) ? "F" : "M";
      const profil = h.nombre();
      const personne: Personne = {
        prenom: h.parmi(sexe === "F" ? PRENOMS_F : PRENOMS_M),
        nom,
        sexe,
        dateNaissance: ajouterJours(aujourdhui, -h.entier(20, 70) * 365 - h.entier(0, 364)),
        foyerId: foyer.id,
        canalPrefere: h.parmi(["whatsapp", "sms", "sms", "vocal", "relais"] as const),
        telephone: `+22901${String(h.entier(40_000_000, 99_999_999))}`,
        proprietaireTelephone: h.chance(0.7) ? "soi" : "proche",
        programmes: [],
      };
      const inscription = ajouterJours(aujourdhui, -h.entier(30, 360));
      if (sexe === "F" && profil < 0.25) {
        personne.dateNaissance = ajouterJours(aujourdhui, -h.entier(17, 40) * 365);
        const semaines = h.entier(6, 38);
        const ddr = ajouterJours(aujourdhui, -semaines * 7);
        personne.antecedents = { cesarienne: h.chance(0.1) };
        personne.programmes.push({ code: "grossesse", dateReference: ddr, dateInscription: ajouterJours(ddr, Math.min(semaines, h.entier(6, 14)) * 7) });
      } else if (profil < 0.45) {
        const naissance = ajouterJours(aujourdhui, -h.entier(10, 500));
        personne.dateNaissance = naissance;
        personne.programmes.push({ code: "vaccination", dateReference: naissance, dateInscription: naissance });
      } else if (profil < 0.7) {
        personne.programmes.push({ code: "hypertension", dateReference: ajouterJours(inscription, -h.entier(0, 900)), dateInscription: inscription });
      } else if (profil < 0.8) {
        personne.programmes.push({ code: "diabete", dateReference: ajouterJours(inscription, -h.entier(0, 900)), dateInscription: inscription });
      } else {
        personne.programmes.push({ code: "consultation", dateReference: inscription, dateInscription: inscription });
      }
      population.push(personne);
    }
  }

  // --- Patients, contacts, consentements, inscriptions, rendez-vous, historique ---
  const idsPersonnages: Record<string, string> = {};
  const patientsPopulation: { id: string; programme: CodeProgramme | null; age: number; sexe: "F" | "M"; foyerId: string; naissance: DateISO }[] = [];
  let nbRendezVous = 0;
  let nbEvenements = 0;

  for (const personne of [...personnages, ...population]) {
    const [patient] = await db
      .insert(t.patients)
      .values({
        foyerId: personne.foyerId,
        prenom: personne.prenom,
        nom: personne.nom,
        dateNaissance: personne.dateNaissance,
        sexe: personne.sexe,
        langue: personne.langue ?? "fon",
        canalPrefere: personne.canalPrefere ?? "sms",
        malvoyant: personne.malvoyant ?? false,
        codeCourt: codeUnique(),
        etablissementId: cs!.id,
        antecedents: personne.antecedents ?? {},
      })
      .returning();
    if (personne.cle) idsPersonnages[personne.cle] = patient!.id;
    else
      patientsPopulation.push({
        id: patient!.id,
        programme: personne.programmes[0]?.code ?? null,
        age: ageEnAnnees(personne.dateNaissance, aujourdhui),
        sexe: personne.sexe,
        foyerId: personne.foyerId,
        naissance: personne.dateNaissance,
      });

    if (personne.telephone) {
      await db.insert(t.contacts).values({ patientId: patient!.id, telephone: personne.telephone, role: "principal", proprietaire: personne.proprietaireTelephone ?? "soi" });
      await db.insert(t.consentements).values({ patientId: patient!.id, canal: personne.canalPrefere === "whatsapp" ? "whatsapp" : "sms", recueilliPar: relais.id });
    }

    for (const p of personne.programmes) {
      const [inscription] = await db
        .insert(t.inscriptions)
        .values({ patientId: patient!.id, programme: p.code, dateReference: p.dateReference, dateInscription: p.dateInscription })
        .returning();
      const etapes = planifier(PROGRAMMES[p.code], p.dateReference, p.dateInscription).filter((e) => e.rendezVous);
      for (const [index, etape] of etapes.entries()) {
        await db.insert(t.rendezVous).values({
          patientId: patient!.id,
          inscriptionId: inscription!.id,
          etapeCode: etape.code,
          motif: etape.motif,
          datePrevue: etape.datePrevue,
          moment: "matin",
          etablissementId: cs!.id,
          source: "programme",
        });
        nbRendezVous++;
        if (joursEntre(etape.datePrevue, aujourdhui) <= 0) continue;
        if (!decisionFaite(personne.cle ?? null, p.code, etape.code, index, h.chance(0.8))) continue;
        await db.insert(t.evenements).values({
          id: randomUUID(),
          patientId: patient!.id,
          type: p.code === "vaccination" ? "vaccination" : "consultation",
          auteurId: p.code === "grossesse" || p.code === "vaccination" ? adjoa.id : firmin.id,
          survenuLe: depuisDateISO(etape.datePrevue),
          donnees:
            p.code === "vaccination"
              ? { etape: etape.code, vaccins: (etape.details ?? "").split(", ") }
              : { motif: etape.motif, etape: etape.code, mesures: mesuresPour(p.code, h, personne.cle ?? null) },
        });
        nbEvenements++;
      }
    }
  }

  // --- Relevés de tension de Codjo (surveillance : deux relevés au-dessus de 140/90) ---
  for (const [jours, sys, dia] of [[-120, 150, 95], [-30, 145, 92]] as const) {
    await db.insert(t.evenements).values({
      id: randomUUID(),
      patientId: idsPersonnages.codjo!,
      type: "mesure",
      auteurId: relais.id,
      survenuLe: depuisDateISO(ajouterJours(aujourdhui, jours)),
      donnees: { mesures: { tensionSys: sys, tensionDia: dia } },
    });
    nbEvenements++;
  }

  // --- Une visite de Koffi chez Rachida, il y a 3 jours ---
  await db.insert(t.evenements).values({
    id: randomUUID(),
    patientId: idsPersonnages.rachida!,
    type: "visite_domicile",
    auteurId: relais.id,
    survenuLe: new Date(depuisDateISO(ajouterJours(aujourdhui, -3)).getTime() + 9 * 3_600_000),
    donnees: { constat: "tout_va_bien", noteVocale: false },
  });
  nbEvenements++;

  // --- Awa prépare la naissance : 3 choses sur 6 ---
  await db.insert(t.evenements).values({
    id: randomUUID(),
    patientId: idsPersonnages.awa!,
    type: "plan_naissance",
    auteurId: compte("+2290197000002").id,
    survenuLe: depuisDateISO(ajouterJours(aujourdhui, -2)),
    donnees: { elements: ["lieu", "accompagnant", "sac"] },
  });
  nbEvenements++;

  // --- Carnets familiaux ---
  await db.insert(t.responsables).values([
    { compteId: compte("+2290197000001").id, patientId: idsPersonnages.codjo!, lien: "soi" },
    { compteId: compte("+2290197000001").id, patientId: idsPersonnages.mariam!, lien: "conjoint" },
    { compteId: compte("+2290197000001").id, patientId: idsPersonnages.sena!, lien: "aidant" },
    { compteId: compte("+2290197000002").id, patientId: idsPersonnages.awa!, lien: "soi" },
    { compteId: compte("+2290197000004").id, patientId: idsPersonnages.aicha!, lien: "soi" },
    { compteId: compte("+2290197000004").id, patientId: idsPersonnages.rachida!, lien: "enfant" },
  ]);

  // --- Traitements en cours : ordonnances délivrées à la pharmacie ---
  const ordonnancesDelivrees = [
    {
      patientId: idsPersonnages.codjo!,
      codeRetrait: "K7P4QX",
      joursDepuisDelivrance: 10,
      lignes: [{ medicament: "Amlodipine 5 mg", matin: 0, midi: 0, soir: 1, dureeJours: 30, indication: "la tension", conseil: "avec un verre d'eau" }],
    },
    {
      patientId: idsPersonnages.rachida!,
      codeRetrait: codeUnique(),
      joursDepuisDelivrance: 20,
      lignes: [{ medicament: "Metformine 500 mg", matin: 1, midi: 0, soir: 1, dureeJours: 60, indication: "le diabète", conseil: "pendant le repas" }],
    },
  ];
  for (const o of ordonnancesDelivrees) {
    const emiseLe = depuisDateISO(ajouterJours(aujourdhui, -o.joursDepuisDelivrance));
    const [ordonnance] = await db
      .insert(t.ordonnances)
      .values({ patientId: o.patientId, prescripteurId: firmin.id, lignes: o.lignes, codeRetrait: o.codeRetrait, emiseLe })
      .returning();
    await db.insert(t.evenements).values({
      id: randomUUID(),
      patientId: o.patientId,
      type: "delivrance",
      auteurId: pharmacien.id,
      survenuLe: new Date(emiseLe.getTime() + 10 * 3_600_000),
      donnees: { ordonnanceId: ordonnance!.id },
    });
    nbEvenements++;
  }

  // --- Ordonnance à délivrer : pour la démonstration de la pharmacie ---
  await db.insert(t.ordonnances).values({
    patientId: idsPersonnages.mariam!,
    prescripteurId: firmin.id,
    codeRetrait: "M4R2TN",
    lignes: [{ medicament: "Paracétamol 500 mg", matin: 1, midi: 1, soir: 1, dureeJours: 5, indication: "la fièvre", conseil: "après le repas" }],
  });

  // --- Plages de rendez-vous et places des 3 prochaines semaines ---
  const modeles: { motif: MotifRdv; jours: number[]; moment: "matin" | "apres_midi"; capacite: number }[] = [
    { motif: "consultation", jours: [1, 2, 3, 4, 5], moment: "matin", capacite: 10 },
    { motif: "consultation", jours: [1, 2, 3, 4, 5], moment: "apres_midi", capacite: 8 },
    { motif: "tension", jours: [2, 4], moment: "matin", capacite: 6 },
    { motif: "diabete", jours: [4], moment: "apres_midi", capacite: 6 },
    { motif: "grossesse", jours: [3, 5], moment: "matin", capacite: 8 },
    { motif: "vaccin", jours: [3], moment: "matin", capacite: 12 },
  ];
  await db.insert(t.modelesPlages).values(
    modeles.flatMap((m) => m.jours.map((jourSemaine) => ({ etablissementId: cs!.id, motif: m.motif, jourSemaine, moment: m.moment, capacite: m.capacite }))),
  );
  const places = [];
  for (let d = 0; d <= 21; d++) {
    const date = ajouterJours(aujourdhui, d);
    const jourSemaine = ((depuisDateISO(date).getUTCDay() + 6) % 7) + 1;
    for (const m of modeles) {
      if (m.jours.includes(jourSemaine)) places.push({ etablissementId: cs!.id, motif: m.motif, date, moment: m.moment, capacite: m.capacite });
    }
  }
  await db.insert(t.creneaux).values(places);

  // --- Places déjà prises : la première matinée de consultation et le premier contrôle de tension sont complets
  //     (liste d'attente) ; la séance de vaccination de mercredi garde 3 places (scénario de démo) ---
  // Les places vont à des personnes dont le suivi correspond au motif : pas de femme de 67 ans en consultation de grossesse.
  const PROGRAMME_DU_MOTIF: Partial<Record<MotifRdv, CodeProgramme>> = { grossesse: "grossesse", vaccin: "vaccination", tension: "hypertension", diabete: "diabete" };
  const candidatsPour = (motif: MotifRdv) => {
    const programme = PROGRAMME_DU_MOTIF[motif];
    const liste = programme ? patientsPopulation.filter((p) => p.programme === programme) : patientsPopulation.filter((p) => p.age >= 1);
    return liste.length ? liste : patientsPopulation;
  };
  const aVenir = (await db.select().from(t.creneaux).orderBy(asc(t.creneaux.date), asc(t.creneaux.moment))).filter((c) => c.date > aujourdhui);
  const premier = (motif: MotifRdv, moment?: "matin" | "apres_midi") => aVenir.find((c) => c.motif === motif && (!moment || c.moment === moment))!;
  const consultationComplete = premier("consultation", "matin");
  const tensionComplete = premier("tension");
  const seanceVaccin = premier("vaccin");
  // Une personne n'a qu'une place par jour ; un doublon prend le premier candidat libre, sans tirage de plus (la suite de la démo ne bouge pas).
  const inscritsDuJour = new Map<string, Set<string>>();
  const reservations = aVenir.flatMap((creneau) => {
    const nombre =
      creneau === consultationComplete || creneau === tensionComplete
        ? creneau.capacite
        : creneau === seanceVaccin
          ? creneau.capacite - 3
          : h.entier(0, Math.floor(creneau.capacite / 2));
    const candidats = candidatsPour(creneau.motif);
    const dejaLa = inscritsDuJour.get(creneau.date) ?? new Set<string>();
    inscritsDuJour.set(creneau.date, dejaLa);
    const choisir = () => {
      const tire = h.parmi(candidats);
      const choisi = dejaLa.has(tire.id) ? (candidats.find((p) => !dejaLa.has(p.id)) ?? patientsPopulation.find((p) => !dejaLa.has(p.id))!) : tire;
      dejaLa.add(choisi.id);
      return choisi;
    };
    return Array.from({ length: nombre }, () => ({
      patientId: choisir().id,
      motif: creneau.motif,
      datePrevue: creneau.date,
      moment: creneau.moment,
      creneauId: creneau.id,
      etablissementId: cs!.id,
      source: "patient" as const,
      reserveLe: depuisDateISO(ajouterJours(aujourdhui, -h.entier(1, 10))),
    }));
  });
  await db.insert(t.rendezVous).values(reservations);
  nbRendezVous += reservations.length;

  // --- Rendez-vous déjà réservés : le contrôle de Codjo et la consultation prénatale d'Awa ---
  for (const [identifiant, cle, motif] of [
    ["+2290197000001", "codjo", "tension"],
  ] as const) {
    const creneau = aVenir.find((c) => c.motif === motif && c !== tensionComplete)!;
    const resultat = await reserver(db, {
      compteId: compte(identifiant).id,
      patientId: idsPersonnages[cle]!,
      motif,
      creneauId: creneau.id,
      aujourdhui,
      maintenant: depuisDateISO(ajouterJours(aujourdhui, -3)),
    });
    if (!resultat.ok) throw new Error(`Réservation de démo impossible (${cle}) : ${resultat.erreur}`);
  }

  // --- Consultations d'aujourd'hui : places prises, et une partie des personnes déjà vues ---
  const plagesDuJour = await db.select().from(t.creneaux).where(eq(t.creneaux.date, aujourdhui)).orderBy(asc(t.creneaux.moment));
  // Une personne ne vient qu'une fois dans la journée.
  const venusAujourdhui = new Set<string>();
  const venues = plagesDuJour.flatMap((creneau) => {
    const libres = candidatsPour(creneau.motif).filter((p) => !venusAujourdhui.has(p.id));
    const nombre = Math.min(h.entier(Math.ceil(creneau.capacite / 2), creneau.capacite - 1), libres.length);
    return Array.from({ length: nombre }, () => {
      const choisi = h.parmi(libres.filter((p) => !venusAujourdhui.has(p.id)));
      venusAujourdhui.add(choisi.id);
      return {
        patientId: choisi.id,
        motif: creneau.motif,
        datePrevue: aujourdhui,
        moment: creneau.moment,
        creneauId: creneau.id,
        etablissementId: cs!.id,
        source: "patient" as const,
        reserveLe: depuisDateISO(ajouterJours(aujourdhui, -h.entier(1, 10))),
      };
    });
  });
  if (venues.length) await db.insert(t.rendezVous).values(venues);
  nbRendezVous += venues.length;
  const vusLe = new Map<string, Date>();
  for (const [i, venue] of venues.entries()) {
    if (venue.moment !== "matin" || !h.chance(0.5)) continue;
    const vuLe = new Date(depuisDateISO(aujourdhui).getTime() + (7 * 60 + i * 12) * 60_000);
    vusLe.set(venue.patientId, vuLe);
    await db.insert(t.evenements).values({
      id: randomUUID(),
      patientId: venue.patientId,
      type: "consultation",
      auteurId: venue.motif === "grossesse" ? adjoa.id : firmin.id,
      survenuLe: vuLe,
      donnees: {
        motif: venue.motif,
        mesures: venue.motif === "tension" ? { tensionSys: h.entier(125, 175), tensionDia: h.entier(80, 105) } : {},
      },
    });
    nbEvenements++;
  }

  // --- Salle d'attente du matin : chaque venue a son numéro ; les personnes déjà vues ont été appelées (graine à part) ---
  const hSalle = hasard(20260929);
  let consultationDuMatin = plagesDuJour.find((c) => c.motif === "consultation" && c.moment === "matin");
  let venuesDuMatin: { patientId: string }[] = venues.filter((v) => v.moment === "matin");
  if (!consultationDuMatin) {
    // Pas de plage ce jour (week-end) : la démo ouvre une matinée de consultation, pour que la salle d'attente vive tous les jours.
    [consultationDuMatin] = await db
      .insert(t.creneaux)
      .values({ etablissementId: cs!.id, motif: "consultation", date: aujourdhui, moment: "matin", capacite: 8 })
      .returning();
    const libres = [...patientsPopulation.filter((x) => x.age >= 1)];
    const choisis = Array.from({ length: 5 }, () => libres.splice(hSalle.entier(0, libres.length - 1), 1)[0]!);
    await db.insert(t.rendezVous).values(
      choisis.map((c) => ({
        patientId: c.id,
        motif: "consultation" as const,
        datePrevue: aujourdhui,
        moment: "matin" as const,
        creneauId: consultationDuMatin!.id,
        etablissementId: cs!.id,
        source: "patient" as const,
        reserveLe: depuisDateISO(ajouterJours(aujourdhui, -hSalle.entier(1, 6))),
      })),
    );
    nbRendezVous += choisis.length;
    venuesDuMatin = choisis.map((c) => ({ patientId: c.id }));
    // Les deux premières personnes ont déjà été reçues.
    for (const [i, c] of choisis.slice(0, 2).entries()) vusLe.set(c.id, new Date(depuisDateISO(aujourdhui).getTime() + (7 * 60 + i * 15) * 60_000));
  }
  if (venuesDuMatin.length) {
    await db.insert(t.passages).values(
      venuesDuMatin.map((v, i) => {
        const appeleLe = vusLe.get(v.patientId) ?? null;
        // Arrivées entre 7 h et 9 h (heure du Bénin), avant l'appel pour les personnes déjà vues.
        const arriveLe = new Date(depuisDateISO(aujourdhui).getTime() + (6 * 60 + i * 9 + hSalle.entier(0, 5)) * 60_000);
        return { etablissementId: cs!.id, patientId: v.patientId, jour: aujourdhui, numero: i + 1, arriveLe: appeleLe && appeleLe < arriveLe ? new Date(appeleLe.getTime() - 20 * 60_000) : arriveLe, appeleLe, appelePar: appeleLe ? firmin.id : null };
      }),
    );
  }

  // --- Mariam a une place ce matin : Codjo dira qu'ils sont arrivés, et suivra son tour ---
  let rdvMariam: string | null = null;
  if (consultationDuMatin) {
    const [rdv] = await db.insert(t.rendezVous).values({
      patientId: idsPersonnages.mariam!,
      motif: "consultation",
      datePrevue: aujourdhui,
      moment: "matin",
      creneauId: consultationDuMatin.id,
      etablissementId: cs!.id,
      source: "patient",
      reserveLe: depuisDateISO(ajouterJours(aujourdhui, -2)),
    }).returning({ id: t.rendezVous.id });
    rdvMariam = rdv!.id;
    nbRendezVous++;
  }

  // --- Rappels (canaux simulés) : Mariam a répondu « Je viendrai » ; Codjo n'a pas encore répondu ; Afiavi n'a pas été jointe ---
  const centreRappel = "Centre de santé de Bohicon";
  const il = (jours: number, heures: number) => new Date(depuisDateISO(ajouterJours(aujourdhui, jours)).getTime() + heures * 3_600_000);
  if (rdvMariam) {
    await db.insert(t.rappels).values({
      patientId: idsPersonnages.mariam!,
      rendezVousId: rdvMariam,
      canal: "whatsapp",
      telephone: "+2290197000001",
      contenu: texteRappel({ pour: "Mariam", vaccin: false, date: aujourdhui, moment: "matin", centre: centreRappel, canal: "whatsapp" }),
      envoyeLe: il(-2, 8),
      statut: "repondu",
      reponse: "viendra",
      reponduLe: il(-2, 9),
    });
  }
  const [rdvCodjo] = await db
    .select()
    .from(t.rendezVous)
    .where(and(eq(t.rendezVous.patientId, idsPersonnages.codjo!), isNotNull(t.rendezVous.creneauId), isNull(t.rendezVous.annuleLe)));
  if (rdvCodjo) {
    await db.insert(t.rappels).values({
      patientId: idsPersonnages.codjo!,
      rendezVousId: rdvCodjo.id,
      canal: "whatsapp",
      telephone: "+2290197000001",
      contenu: texteRappel({ pour: null, vaccin: false, date: rdvCodjo.datePrevue, moment: rdvCodjo.moment, centre: centreRappel, canal: "whatsapp" }),
      envoyeLe: il(0, 7),
    });
  }
  const [cpn3Afiavi] = await db
    .select()
    .from(t.rendezVous)
    .where(and(eq(t.rendezVous.patientId, idsPersonnages.afiavi!), eq(t.rendezVous.etapeCode, "cpn3")));
  if (cpn3Afiavi) {
    const pourAfiavi = (canal: "sms" | "vocal") =>
      texteRappel({ pour: null, vaccin: false, date: cpn3Afiavi.datePrevue, moment: cpn3Afiavi.moment, centre: centreRappel, canal });
    await db.insert(t.rappels).values([
      { patientId: idsPersonnages.afiavi!, rendezVousId: cpn3Afiavi.id, canal: "sms", telephone: "+2290197000003", contenu: pourAfiavi("sms"), envoyeLe: il(-1, 8), statut: "sans_reponse" },
      { patientId: idsPersonnages.afiavi!, rendezVousId: cpn3Afiavi.id, canal: "vocal", telephone: "+2290197000003", contenu: pourAfiavi("vocal"), envoyeLe: il(-1, 11), statut: "sans_reponse" },
      {
        patientId: idsPersonnages.afiavi!,
        rendezVousId: cpn3Afiavi.id,
        canal: "relais",
        telephone: null,
        contenu: "À prévenir de vive voix : les rappels par téléphone sont restés sans réponse.",
        envoyeLe: il(-1, 14),
      },
    ]);
  }

  // --- Alertes des 30 derniers jours, toutes prises en charge : délais réalistes pour le pilotage ---
  const delais = [4, 6, 7, 9, 11, 12, 14, 18, 26];
  for (const [i, minutes] of delais.entries()) {
    const personne = h.parmi(patientsPopulation.filter((p) => p.age >= 1));
    const creeeLe = new Date(depuisDateISO(ajouterJours(aujourdhui, -(3 + i * 3))).getTime() + (8 + i) * 3_600_000);
    const evenementId = randomUUID();
    await db.insert(t.evenements).values({
      id: evenementId,
      patientId: personne.id,
      type: "signalement_danger",
      survenuLe: creeeLe,
      donnees: { signes: [h.parmi(["fievre", "douleur", "respiration"] as const)], source: "proche" },
    });
    await db.insert(t.alertes).values({
      patientId: personne.id,
      evenementId,
      etablissementId: cs!.id,
      creeeLe,
      echeance: new Date(creeeLe.getTime() + 15 * 60_000),
      priseEnChargePar: i % 2 ? firmin.id : adjoa.id,
      priseEnChargeLe: new Date(creeeLe.getTime() + minutes * 60_000),
    });
    nbEvenements++;
  }

  // --- Naissances de l'année : chaque bébé de moins d'un an né d'une femme de son foyer ---
  for (const bebe of patientsPopulation.filter((p) => p.programme === "vaccination" && p.age === 0)) {
    const mere = patientsPopulation.find((p) => p.foyerId === bebe.foyerId && p.sexe === "F" && p.age >= 17 && p.age <= 45);
    if (!mere) continue;
    const le = new Date(depuisDateISO(bebe.naissance).getTime() + 7 * 3_600_000);
    await db.insert(t.evenements).values({
      id: randomUUID(),
      patientId: mere.id,
      type: "accouchement",
      auteurId: adjoa.id,
      survenuLe: le,
      donnees: {
        le: le.toISOString(),
        lieu: h.chance(0.8) ? "centre" : "domicile",
        mode: h.chance(0.9) ? "voie_basse" : "cesarienne",
        enfant: { id: bebe.id, sexe: bebe.sexe, poidsGrammes: h.entier(2600, 3900) },
      },
    });
    nbEvenements++;
  }

  // --- Un an de suivi à Bohicon (carnets sans compte) : des chiffres parlants pour le pilotage de la zone ---
  nbEvenements += await semerSuiviBohicon(db, { aujourdhui, communeId: bohicon!.id, etablissementId: cs!.id, sageFemme: adjoa.id, infirmier: firmin.id, codeUnique });

  // --- Historique : les autres zones du pays (fictives), et les 5 mois passés de la zone de la démo autour de ses valeurs du jour ---
  const maintenantDemo = new Date(depuisDateISO(aujourdhui).getTime() + 12 * 3_600_000);
  const zoneEnDirect = agreger([...(await indicateursDesCommunes(db, [bohicon!.id, zogbodomey!.id], aujourdhui, maintenantDemo)).values()]);
  await db.insert(t.indicateursZones).values([...indicateursFictifs(aujourdhui), ...historiqueDeLaZone(zoneEnDirect, aujourdhui)]);

  // --- Liste d'attente des deux plages complètes : l'agenda du centre montre qui attend une place (graine à part) ---
  const hAttente = hasard(20260930);
  for (const [creneau, nombre] of [[consultationComplete, 3], [tensionComplete, 2]] as const) {
    const inscrits = new Set(reservations.filter((r) => r.creneauId === creneau.id).map((r) => r.patientId));
    const libres = candidatsPour(creneau.motif).filter((p) => !inscrits.has(p.id));
    const choisis = Array.from({ length: Math.min(nombre, libres.length) }, () => libres.splice(hAttente.entier(0, libres.length - 1), 1)[0]!);
    if (choisis.length) {
      await db.insert(t.listeAttente).values(
        choisis.map((p, i) => ({
          patientId: p.id,
          etablissementId: cs!.id,
          motif: creneau.motif,
          dateSouhaitee: creneau.date,
          moment: creneau.moment,
          creeLe: new Date(depuisDateISO(ajouterJours(aujourdhui, -2)).getTime() + (9 + i) * 3_600_000),
        })),
      );
    }
  }

  // --- Contenus de base (texte français ; l'audio arrive au plan 6) ---
  const contenus = [
    { code: "rappel_rendez_vous", categorie: "rappel", pictogramme: "ph-calendar-dots", texte: "Rappel : vous avez un rendez-vous au centre de santé. Pensez à votre carnet." },
    { code: "rendez_vous_manque", categorie: "rappel", pictogramme: "ph-calendar-dots", texte: "Vous n'avez pas pu venir à votre rendez-vous. Choisissez un autre jour." },
    { code: "prise_soir", categorie: "rappel", pictogramme: "ph-moon", texte: "Ce soir : prenez votre comprimé avec un verre d'eau." },
    { code: "danger_conseil", categorie: "danger", pictogramme: "hi-alert-circle", texte: "Allez au centre de santé maintenant ou appelez-le. N'attendez pas." },
  ];
  for (const c of contenus) {
    const [contenu] = await db.insert(t.contenus).values({ code: c.code, categorie: c.categorie, pictogramme: c.pictogramme }).returning();
    await db.insert(t.contenusTraductions).values({ contenuId: contenu!.id, langue: "fr", texte: c.texte });
  }

  const nbPatients = personnages.length + population.length;
  const nbFoyers = (await db.select({ id: t.foyers.id }).from(t.foyers)).length;
  return { comptes: listeComptes.length, foyers: nbFoyers, patients: nbPatients, rendezVous: nbRendezVous, evenements: nbEvenements };
}

/** Pour les personnages, l'historique est fixé par la spec ; pour les autres, il suit le hasard. */
function decisionFaite(cle: string | null, programme: CodeProgramme, etape: string, index: number, hasardFait: boolean): boolean {
  if (cle === "afiavi") return etape === "cpn1";
  if (cle === "awa" || cle === "sena" || cle === "codjo" || cle === "rachida") return true;
  return index === 0 ? true : hasardFait && programme !== "consultation";
}

/** Mesures prises en consultation : fixes pour les personnages (leur niveau de risque est connu), aléatoires sinon. */
function mesuresPour(programme: CodeProgramme, h: Hasard, cle: string | null): Record<string, number> {
  if (cle === "codjo") return { tensionSys: 148, tensionDia: 94 };
  if (cle === "rachida") return { glycemieGL: 1.4 };
  if (cle === "awa") return { tensionSys: 118, tensionDia: 76, poidsKg: 68 };
  if (cle === "afiavi") return { tensionSys: 120, tensionDia: 78, poidsKg: 62 };
  if (programme === "hypertension") return { tensionSys: h.entier(125, 170), tensionDia: h.entier(80, 105) };
  if (programme === "diabete") return { glycemieGL: Math.round((1 + h.nombre() * 1.2) * 100) / 100 };
  if (programme === "grossesse") return { tensionSys: h.entier(100, 135), tensionDia: h.entier(60, 88), poidsKg: h.entier(55, 85) };
  return {};
}

const ZONES_FICTIVES: [string, string][] = [
  ["Abomey-Calavi / Sô-Ava", "Atlantique"],
  ["Cotonou 1-4", "Littoral"],
  ["Covè / Ouinhi / Zangnanado", "Zou"],
  ["Dassa-Zoumè / Glazoué", "Collines"],
  ["Djougou / Copargo / Ouaké", "Donga"],
  ["Kandi / Gogounou / Ségbana", "Alibori"],
  ["Lokossa / Athiémé", "Mono"],
  ["Natitingou / Boukoumbé / Toucountouna", "Atacora"],
  ["Parakou / N'Dali", "Borgou"],
  ["Porto-Novo / Aguégués / Sèmè-Podji", "Ouémé"],
];

/** Taux de départ (bas, haut) et effectifs (petit, grand) par indicateur : valeurs fictives mais plausibles. */
const PROFILS: Record<CodeIndicateur, { taux?: [number, number]; effectif: [number, number]; minutes?: [number, number] }> = {
  cpn4: { taux: [0.38, 0.7], effectif: [120, 600] },
  naissances_centre: { taux: [0.7, 0.95], effectif: [150, 700] },
  penta3: { taux: [0.7, 0.95], effectif: [150, 700] },
  rr1: { taux: [0.62, 0.9], effectif: [140, 650] },
  hta_controles: { taux: [0.24, 0.55], effectif: [200, 900] },
  alertes_15min: { taux: [0.55, 0.95], effectif: [20, 90] },
  alertes_delai: { effectif: [20, 90], minutes: [8, 28] },
  visites_relais: { effectif: [300, 1500] },
  etapes_manquees: { effectif: [40, 300] },
};

/** Indicateurs mensuels fictifs des 10 autres zones du pays (6 mois, dont le mois en cours). Graine à part : le reste de la démo ne change pas. */
function indicateursFictifs(aujourdhui: DateISO) {
  const h = hasard(20260926);
  const mois = premierDuMois(aujourdhui);
  const lignes: (typeof t.indicateursZones.$inferInsert)[] = [];
  for (const [zone, departement] of ZONES_FICTIVES) {
    const base = Object.fromEntries(CODES_INDICATEURS.map((c) => [c, h.nombre()])) as Record<CodeIndicateur, number>;
    const lesMois = [...moisPrecedents(mois, 5), mois];
    for (const [rang, m] of lesMois.entries()) {
      for (const code of CODES_INDICATEURS) {
        const p = PROFILS[code];
        const effectif = Math.max(1, Math.round((p.effectif[0] + base[code] * (p.effectif[1] - p.effectif[0])) * (0.9 + h.nombre() * 0.2)));
        if (p.taux) {
          const taux = Math.min(0.99, p.taux[0] + base[code] * (p.taux[1] - p.taux[0]) + rang * 0.01 + (h.nombre() - 0.5) * 0.04);
          lignes.push({ zone, departement, mois: m, code, numerateur: Math.round(effectif * taux), denominateur: effectif });
        } else if (p.minutes) {
          const minutes = p.minutes[0] + base[code] * (p.minutes[1] - p.minutes[0]) - rang * 0.4;
          lignes.push({ zone, departement, mois: m, code, numerateur: Math.round(effectif * minutes), denominateur: effectif });
        } else {
          lignes.push({ zone, departement, mois: m, code, numerateur: effectif, denominateur: 0 });
        }
      }
    }
  }
  return lignes;
}

const ZONE_DEMO = "Zogbodomey-Bohicon-Zakpota";

/**
 * Un an de suivi dans la commune de Bohicon, en carnets sans compte (insérés par lots) : grossesses menées à terme et naissances,
 * bébés vaccinés, grossesses en cours, jeunes enfants, hypertendus et leurs relevés. Assez de monde pour que la zone ait des chiffres
 * parlants, alors que Zogbodomey reste une petite commune où le masquage se voit. Graine à part : le reste de la démo ne bouge pas.
 */
async function semerSuiviBohicon(
  db: Db,
  e: { aujourdhui: DateISO; communeId: string; etablissementId: string; sageFemme: string; infirmier: string; codeUnique: () => string },
): Promise<number> {
  const h = hasard(20260927);
  const lesFoyers: { id: string; nom: string; village: string; communeId: string }[] = [];
  const lesPatients: (typeof t.patients.$inferInsert & { id: string; dateNaissance: DateISO })[] = [];
  const lesInscriptions: (typeof t.inscriptions.$inferInsert)[] = [];
  const lesEvenements: (typeof t.evenements.$inferInsert)[] = [];
  const le = (d: DateISO, heures = 9) => new Date(depuisDateISO(d).getTime() + heures * 3_600_000);
  const nouveauFoyer = () => {
    const foyer = { id: randomUUID(), nom: h.parmi(NOMS), village: h.parmi(VILLAGES_BOHICON), communeId: e.communeId };
    lesFoyers.push(foyer);
    return foyer;
  };
  const personne = (foyer: { id: string; nom: string }, sexe: "F" | "M", dateNaissance: DateISO, mereId?: string) => {
    const p = {
      id: randomUUID(),
      foyerId: foyer.id,
      prenom: h.parmi(sexe === "F" ? PRENOMS_F : PRENOMS_M),
      nom: foyer.nom,
      sexe,
      dateNaissance,
      codeCourt: e.codeUnique(),
      etablissementId: e.etablissementId,
      canalPrefere: h.parmi(["whatsapp", "sms", "sms", "vocal"] as const),
      mereId,
    };
    lesPatients.push(p);
    return p;
  };
  const consulter = (patientId: string, jour: DateISO, donnees: Record<string, unknown>, auteurId: string) =>
    lesEvenements.push({ id: randomUUID(), patientId, type: "consultation", auteurId, survenuLe: le(jour), donnees });
  const vacciner = (enfantId: string, naissance: DateISO) => {
    lesInscriptions.push({ patientId: enfantId, programme: "vaccination", dateReference: naissance, dateInscription: naissance });
    const chances: Record<string, number> = { naissance: 0.95, "6sem": 0.9, "10sem": 0.86, "14sem": 0.8, "9mois": 0.74, "15mois": 0.62 };
    for (const etape of planifier(PROGRAMMES.vaccination, naissance, naissance)) {
      if (joursEntre(etape.datePrevue, e.aujourdhui) < 0 || !h.chance(chances[etape.code] ?? 0.7)) continue;
      lesEvenements.push({
        id: randomUUID(),
        patientId: enfantId,
        type: "vaccination",
        auteurId: e.sageFemme,
        survenuLe: le(ajouterJours(etape.datePrevue, h.entier(0, 6))),
        donnees: { etape: etape.code, vaccins: (etape.details ?? "").split(", ") },
      });
    }
  };
  const suivreGrossesse = (mereId: string, ddr: DateISO, active: boolean) => {
    const inscription = ajouterJours(ddr, 8 * 7);
    lesInscriptions.push({ patientId: mereId, programme: "grossesse", dateReference: ddr, dateInscription: inscription, active });
    const chances: Record<string, number> = { cpn1: 0.95, cpn2: 0.85, cpn3: 0.72, cpn4: 0.62 };
    for (const etape of planifier(PROGRAMMES.grossesse, ddr, inscription)) {
      if (!etape.rendezVous || joursEntre(etape.datePrevue, e.aujourdhui) < 0 || !h.chance(chances[etape.code] ?? 0)) continue;
      const mesures = { tensionSys: h.entier(100, 138), tensionDia: h.entier(60, 88), poidsKg: h.entier(55, 85) };
      consulter(mereId, ajouterJours(etape.datePrevue, h.entier(-3, 5)), { motif: "grossesse", etape: etape.code, mesures }, e.sageFemme);
    }
  };

  // Mères qui ont accouché dans l'année, et leur bébé.
  for (let i = 0; i < 16; i++) {
    const foyer = nouveauFoyer();
    const mere = personne(foyer, "F", ajouterJours(e.aujourdhui, -h.entier(18, 38) * 365));
    const naissance = ajouterJours(e.aujourdhui, -h.entier(20, 350));
    suivreGrossesse(mere.id, ajouterJours(naissance, -h.entier(266, 287)), false);
    const sexe = h.chance(0.5) ? "F" : "M";
    const bebe = personne(foyer, sexe, naissance, mere.id);
    const lieu = h.chance(0.86) ? "centre" : h.chance(0.5) ? "hopital" : "domicile";
    lesEvenements.push({
      id: randomUUID(),
      patientId: mere.id,
      type: "accouchement",
      auteurId: e.sageFemme,
      survenuLe: le(naissance, 5),
      donnees: {
        le: le(naissance, 5).toISOString(),
        lieu,
        mode: h.chance(0.88) ? "voie_basse" : "cesarienne",
        enfant: { id: bebe.id, sexe, poidsGrammes: h.entier(2500, 3900) },
      },
    });
    vacciner(bebe.id, naissance);
  }
  // Grossesses en cours.
  for (let i = 0; i < 8; i++) {
    const mere = personne(nouveauFoyer(), "F", ajouterJours(e.aujourdhui, -h.entier(17, 40) * 365));
    suivreGrossesse(mere.id, ajouterJours(e.aujourdhui, -h.entier(14, 39) * 7), true);
  }
  // Enfants de 10 mois à 2 ans : vaccins des 9 et 15 mois.
  for (let i = 0; i < 12; i++) {
    const enfant = personne(nouveauFoyer(), h.chance(0.5) ? "F" : "M", ajouterJours(e.aujourdhui, -h.entier(300, 720)));
    vacciner(enfant.id, enfant.dateNaissance);
  }
  // Hypertendus, deux relevés dans les 6 derniers mois ; un peu moins de la moitié ont une tension contrôlée.
  for (let i = 0; i < 30; i++) {
    const foyer = i % 2 === 0 ? nouveauFoyer() : lesFoyers[lesFoyers.length - 1]!;
    const malade = personne(foyer, h.chance(0.5) ? "F" : "M", ajouterJours(e.aujourdhui, -h.entier(42, 75) * 365));
    lesInscriptions.push({
      patientId: malade.id,
      programme: "hypertension",
      dateReference: ajouterJours(e.aujourdhui, -h.entier(200, 1500)),
      dateInscription: ajouterJours(e.aujourdhui, -h.entier(150, 360)),
    });
    const controlee = h.chance(0.46);
    for (const jours of [h.entier(100, 170), h.entier(10, 90)]) {
      const mesures = controlee
        ? { tensionSys: h.entier(118, 138), tensionDia: h.entier(70, 88) }
        : { tensionSys: h.entier(142, 178), tensionDia: h.entier(91, 106) };
      consulter(malade.id, ajouterJours(e.aujourdhui, -jours), { motif: "tension", mesures }, e.infirmier);
    }
  }

  await db.insert(t.foyers).values(lesFoyers);
  // Les mères et leurs bébés dans la même instruction : la contrainte mere_id est vérifiée à la fin de l'instruction.
  await db.insert(t.patients).values(lesPatients);
  await db.insert(t.inscriptions).values(lesInscriptions);
  await db.insert(t.evenements).values(lesEvenements);
  return lesEvenements.length;
}

/** Les 5 mois passés de la zone de la démo, autour de ses valeurs du jour : une tendance qui a du sens. */
function historiqueDeLaZone(actuel: Valeurs, aujourdhui: DateISO) {
  const h = hasard(20260928);
  return moisPrecedents(premierDuMois(aujourdhui), 5).flatMap((mois, rang) =>
    CODES_INDICATEURS.map((code) => {
      const { numerateur, denominateur } = actuel[code];
      // Plus le mois est ancien, plus on s'éloigne de la valeur du jour : les indicateurs progressent doucement.
      const recul = 5 - rang;
      const ligne = { zone: ZONE_DEMO, departement: "Zou", mois, code };
      const unite = INDICATEURS[code].unite;
      if (unite === "nombre") return { ...ligne, numerateur: Math.max(0, Math.round(numerateur * (0.8 + h.nombre() * 0.4))), denominateur: 0 };
      const effectif = Math.max(5, Math.round(Math.max(denominateur, 5) * (0.85 + h.nombre() * 0.3)));
      if (unite === "minutes") {
        const moyenne = denominateur ? numerateur / denominateur : 14;
        return { ...ligne, numerateur: Math.round(effectif * (moyenne + recul * 0.6 + (h.nombre() - 0.5) * 2)), denominateur: effectif };
      }
      const taux = denominateur ? numerateur / denominateur : 0.5;
      const t = Math.min(0.99, Math.max(0.05, taux - recul * 0.015 + (h.nombre() - 0.5) * 0.04));
      return { ...ligne, numerateur: Math.round(effectif * t), denominateur: effectif };
    }),
  );
}
