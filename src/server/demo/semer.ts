import { randomUUID } from "node:crypto";
import { asc, sql } from "drizzle-orm";
import { planifier } from "@/domain/calendrier";
import { ajouterJours, depuisDateISO, joursEntre, type DateISO } from "@/domain/dates";
import { PROGRAMMES, type CodeProgramme, type MotifRdv } from "@/domain/programmes";
import { hacher } from "../auth/mots-de-passe";
import type { Db } from "../db/client";
import * as t from "../db/schema";
import { reserver } from "../patient/reservation";
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
  "alertes", "liste_attente",
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
      { nom: "Bohicon", departement: "Zou" },
      { nom: "Zogbodomey", departement: "Zou" },
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
      communeId: c.role === "pilotage" || c.role === "relais" ? bohicon!.id : null,
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
    const [f] = await db.insert(t.foyers).values({ nom, village, communeId, relaisId: relais.id }).returning();
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
      programmes: [{ code: "grossesse", dateReference: ajouterJours(aujourdhui, -32 * 7), dateInscription: ajouterJours(aujourdhui, -24 * 7) }] },
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
  const idsPopulation: string[] = [];
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
    else idsPopulation.push(patient!.id);

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
  const aVenir = (await db.select().from(t.creneaux).orderBy(asc(t.creneaux.date), asc(t.creneaux.moment))).filter((c) => c.date > aujourdhui);
  const premier = (motif: MotifRdv, moment?: "matin" | "apres_midi") => aVenir.find((c) => c.motif === motif && (!moment || c.moment === moment))!;
  const consultationComplete = premier("consultation", "matin");
  const tensionComplete = premier("tension");
  const seanceVaccin = premier("vaccin");
  const reservations = aVenir.flatMap((creneau) => {
    const nombre =
      creneau === consultationComplete || creneau === tensionComplete
        ? creneau.capacite
        : creneau === seanceVaccin
          ? creneau.capacite - 3
          : h.entier(0, Math.floor(creneau.capacite / 2));
    return Array.from({ length: nombre }, () => ({
      patientId: h.parmi(idsPopulation),
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
    ["+2290197000002", "awa", "grossesse"],
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
