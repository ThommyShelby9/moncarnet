import { describe, expect, it } from "vitest";
import { avancement, raisonsDe, trierFoyers, urgenceDuFoyer, type EtatPersonne } from "@/domain/tournee";

const calme: EtatPersonne = { alertesOuvertes: 0, etapesManquees: [], risque: { niveau: "normal", motifs: [] }, ordonnancesARetirer: [], etapesProches: [] };

describe("raisonsDe", () => {
  it("ne donne aucune raison de passer quand tout va bien", () => {
    expect(raisonsDe(calme)).toEqual([]);
  });

  it("dit l'étape manquée, à rattraper", () => {
    expect(raisonsDe({ ...calme, etapesManquees: ["Consultation prénatale 2"] })).toEqual([{ texte: "Consultation prénatale 2 manquée", urgence: 1 }]);
  });

  it("met le signe de danger en attente tout en haut, sans le répéter", () => {
    const raisons = raisonsDe({
      ...calme,
      alertesOuvertes: 1,
      risque: { niveau: "eleve", motifs: ["Signe de danger non pris en charge"] },
      ordonnancesARetirer: ["M4R2TN"],
    });
    expect(raisons).toEqual([
      { texte: "Signe de danger signalé, pas encore pris en charge : passer tout de suite", urgence: 0 },
      { texte: "Ordonnance à retirer à la pharmacie (code M4R2TN)", urgence: 2 },
    ]);
  });

  it("classe le risque élevé avant ce qui est à surveiller et ce qui arrive cette semaine", () => {
    expect(
      raisonsDe({ ...calme, risque: { niveau: "surveillance", motifs: ["Diabète non contrôlé (1.4 puis 1.4 g/L)"] }, etapesProches: ["Vaccins des 9 mois"] }),
    ).toEqual([
      { texte: "Diabète non contrôlé (1.4 puis 1.4 g/L)", urgence: 2 },
      { texte: "Vaccins des 9 mois à prévoir cette semaine", urgence: 2 },
    ]);
    expect(raisonsDe({ ...calme, risque: { niveau: "eleve", motifs: ["Tension très élevée (180/110)"] } })[0]).toEqual({
      texte: "Tension très élevée (180/110)",
      urgence: 0,
    });
  });

  it("demande au relais de passer quand les rappels par téléphone sont restés sans réponse", () => {
    expect(raisonsDe({ ...calme, rappelsSansReponse: true })).toEqual([{ texte: "Rappels sans réponse (SMS, appel) : prévenir de vive voix", urgence: 1 }]);
  });

  it("ne répète pas en motif de risque les étapes déjà dites manquées", () => {
    expect(
      raisonsDe({
        ...calme,
        etapesManquees: ["Vaccins des 6 semaines", "Vaccins des 10 semaines"],
        risque: { niveau: "surveillance", motifs: ["2 vaccins en retard"] },
      }).map((r) => r.texte),
    ).toEqual(["Vaccins des 6 semaines manquée", "Vaccins des 10 semaines manquée"]);
    expect(raisonsDe({ ...calme, risque: { niveau: "surveillance", motifs: ["2 rendez-vous manqués"] } })).toEqual([]);
  });
});

describe("foyers", () => {
  it("prend l'urgence la plus forte des personnes du foyer", () => {
    expect(urgenceDuFoyer([{ raisons: [{ texte: "a", urgence: 2 }] }, { raisons: [{ texte: "b", urgence: 1 }] }])).toBe(1);
    expect(urgenceDuFoyer([{ raisons: [] }])).toBeNull();
  });

  it("met les foyers urgents d'abord, ceux sans raison à la fin", () => {
    const foyers = [
      { nom: "Adjovi", urgence: null },
      { nom: "Salifou", urgence: 2 },
      { nom: "Dossou", urgence: 1 },
      { nom: "Kiki", urgence: 0 },
    ] as const;
    expect(trierFoyers([...foyers]).map((f) => f.nom)).toEqual(["Kiki", "Dossou", "Salifou", "Adjovi"]);
  });

  it("compte les foyers à voir déjà visités aujourd'hui", () => {
    const vu = { vueAujourdhui: true };
    const pasVu = { vueAujourdhui: false };
    expect(
      avancement([
        { urgence: 0, personnes: [vu, pasVu] },
        { urgence: 2, personnes: [pasVu] },
        { urgence: null, personnes: [vu] },
      ]),
    ).toEqual({ faits: 1, aVoir: 2 });
  });
});
