import { describe, expect, it } from "vitest";
import type { Tournee } from "@/domain/tournee";
import { appliquerSaisiesLocales, texteEnAttente, trierReponses, versServeur, type SaisieEnAttente } from "@/offline/file";

const visite = (id: string, groupe = id, extra: Partial<SaisieEnAttente> = {}): SaisieEnAttente => ({
  id,
  patientId: "p-afiavi",
  type: "visite_domicile",
  survenuLe: "2026-09-25T09:30:00.000Z",
  donnees: { constat: "tout_va_bien" },
  libelle: "Visite chez Afiavi Dossou",
  groupe,
  nature: "visite",
  ...extra,
});

describe("trierReponses", () => {
  it("retire les saisies reçues, met de côté les refusées avec leur raison, garde celles sans réponse", () => {
    const file = [visite("a", "a", { avecNote: true }), visite("b"), visite("c")];
    const tri = trierReponses(
      file,
      [
        { id: "a", statut: "accepte" },
        { id: "b", statut: "refuse", motif: "Cette personne n'est pas dans votre tournée." },
      ],
      new Date("2026-09-25T10:00:00Z"),
    );
    expect(tri.restantes.map((s) => s.id)).toEqual(["c"]);
    expect(tri.refus).toEqual([{ saisie: file[1], motif: "Cette personne n'est pas dans votre tournée.", le: "2026-09-25T10:00:00.000Z" }]);
    expect(tri.notesAEnvoyer).toEqual(["a"]);
    expect(tri.recues).toBe(1);
  });

  it("compte comme reçue une saisie déjà reçue (renvoi après une coupure)", () => {
    expect(trierReponses([visite("a")], [{ id: "a", statut: "deja_recu" }], new Date()).recues).toBe(1);
  });
});

describe("versServeur", () => {
  it("n'envoie que la saisie, sans ce qui ne sert qu'au téléphone", () => {
    expect(versServeur(visite("a", "g", { avecNote: true }))).toEqual({
      id: "a",
      patientId: "p-afiavi",
      type: "visite_domicile",
      survenuLe: "2026-09-25T09:30:00.000Z",
      donnees: { constat: "tout_va_bien" },
    });
  });
});

describe("texteEnAttente", () => {
  it("compte les visites et les inscriptions, pas les saisies", () => {
    expect(texteEnAttente([])).toBeNull();
    expect(texteEnAttente([visite("a", "v1"), visite("b", "v1")])).toBe("1 visite partira dès que le réseau revient");
    expect(texteEnAttente([visite("a", "v1"), visite("b", "v2"), visite("c", "i1", { nature: "inscription" })])).toBe(
      "2 visites et 1 inscription partiront dès que le réseau revient",
    );
  });
});

describe("appliquerSaisiesLocales", () => {
  const tournee: Tournee = {
    relais: "Koffi Agbessi",
    prepareeLe: "2026-09-25T07:00:00.000Z",
    aujourdhui: "2026-09-25",
    foyers: [
      {
        id: "0b8f5c1e-3f8a-4b3a-9a57-6f1f2c3d4e5f",
        nom: "Dossou",
        village: "Sèhoun",
        urgence: 1,
        personnes: [
          {
            id: "p-afiavi",
            prenom: "Afiavi",
            nom: "Dossou",
            sexe: "F",
            age: 31,
            libelleAge: "31 ans",
            telephone: null,
            enceinte: true,
            malvoyant: false,
            vueAujourdhui: false,
            raisons: [{ texte: "Consultation prénatale 2 manquée", urgence: 1 }],
          },
        ],
      },
    ],
  };

  it("marque vue la personne dont la visite attend le réseau, sans toucher à la copie du serveur", () => {
    const vue = appliquerSaisiesLocales(tournee, [visite("a")]);
    expect(vue.foyers[0]?.personnes[0]?.vueAujourdhui).toBe(true);
    expect(tournee.foyers[0]?.personnes[0]?.vueAujourdhui).toBe(false);
  });

  it("ajoute au foyer la personne inscrite sur ce téléphone, pour la visiter tout de suite", () => {
    const inscription: SaisieEnAttente = {
      id: "i1",
      patientId: "p-yao",
      type: "inscription",
      survenuLe: "2026-09-25T09:00:00.000Z",
      donnees: { foyerId: "0b8f5c1e-3f8a-4b3a-9a57-6f1f2c3d4e5f", prenom: "Yao", nom: "Dossou", sexe: "M", dateNaissance: "2026-09-20", programme: { code: "vaccination", dateReference: "2026-09-20" } },
      libelle: "Inscription de Yao Dossou",
      groupe: "i1",
      nature: "inscription",
    };
    const vue = appliquerSaisiesLocales(tournee, [inscription]);
    expect(vue.foyers[0]?.personnes.map((p) => p.prenom)).toEqual(["Afiavi", "Yao"]);
    expect(vue.foyers[0]?.personnes[1]).toMatchObject({ id: "p-yao", age: 0, libelleAge: "moins d'un mois", enceinte: false, raisons: [] });
  });
});
