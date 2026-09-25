// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/actions-session", () => ({ seDeconnecter: vi.fn() }));

import { VueListe } from "@/app/relais/VueListe";
import type { PersonneTournee, Tournee } from "@/domain/tournee";

afterEach(cleanup);

const personne = (id: string, prenom: string, extra: Partial<PersonneTournee> = {}): PersonneTournee => ({
  id,
  prenom,
  nom: "X",
  sexe: "F",
  age: 40,
  libelleAge: "40 ans",
  telephone: null,
  enceinte: false,
  malvoyant: false,
  vueAujourdhui: false,
  raisons: [],
  ...extra,
});

const tournee: Tournee = {
  relais: "Koffi Agbessi",
  prepareeLe: "2026-09-25T06:05:00.000Z",
  aujourdhui: "2026-09-25",
  foyers: [
    { id: "f1", nom: "Salifou", village: "Sèhoun", urgence: 0, personnes: [personne("p1", "Rachida", { malvoyant: true, raisons: [{ texte: "Signe de danger signalé, pas encore pris en charge : passer tout de suite", urgence: 0 }] })] },
    {
      id: "f2",
      nom: "Dossou",
      village: "Sèhoun",
      urgence: 1,
      personnes: [personne("p2", "Afiavi", { vueAujourdhui: true, raisons: [{ texte: "Consultation prénatale 2 manquée", urgence: 1 }] }), personne("p4", "Kossi", { sexe: "M" })],
    },
    { id: "f3", nom: "Kiki", village: "Kinta", urgence: null, personnes: [personne("p3", "Noël", { sexe: "M" })] },
  ],
};

const actions = { onPreparer: vi.fn(), onVisiter: vi.fn(), onInscrire: vi.fn(), onEnvoi: vi.fn(), avantDeconnexion: async () => null };

describe("VueListe", () => {
  it("montre les foyers dans l'ordre, l'urgence, les raisons et l'avancement", () => {
    render(<VueListe relais="Koffi Agbessi" tournee={tournee} pret enAttente={null} aCorriger={0} horsLigne={false} preparation={false} message={null} retour={null} {...actions} />);
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual(["Foyer Salifou", "Foyer Dossou", "Foyer Kiki"]);
    expect(screen.getByText("Urgent")).toBeTruthy();
    expect(screen.getByText("Malvoyante")).toBeTruthy();
    expect(screen.getByText("1 foyer sur 2")).toBeTruthy();
    expect(screen.getByText("Koffi Agbessi · 3 foyers suivis")).toBeTruthy();
    // Les foyers sans raison de passer sont repliés, comme les personnes sans raison dans un foyer.
    expect(screen.getByText("Autres foyers (1)")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Afiavi, 40 ans/ }));
    expect(actions.onVisiter).toHaveBeenCalledWith("p2");
    expect(screen.getByText("1 autre personne")).toBeTruthy();
  });

  it("dit ce qui attend le réseau et ce qui est à corriger", () => {
    render(
      <VueListe relais="Koffi Agbessi" tournee={tournee} pret enAttente="2 visites partiront dès que le réseau revient" aCorriger={1} horsLigne preparation={false} message={null} retour={null} {...actions} />,
    );
    expect(screen.getByText("2 visites partiront dès que le réseau revient")).toBeTruthy();
    expect(screen.getByRole("button", { name: "1 saisie à corriger" })).toBeTruthy();
  });

  it("invite à préparer la tournée quand le téléphone n'en a pas", () => {
    render(<VueListe relais="Koffi Agbessi" tournee={null} pret enAttente={null} aCorriger={0} horsLigne={false} preparation={false} message={null} retour={null} {...actions} />);
    expect(screen.getByRole("heading", { name: "Préparez votre tournée" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Préparer ma tournée" }));
    expect(actions.onPreparer).toHaveBeenCalled();
  });
});
