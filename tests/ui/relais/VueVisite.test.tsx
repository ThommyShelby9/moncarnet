// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { lireTension, VueVisite } from "@/app/relais/VueVisite";
import { TENSION_INCOMPLETE } from "@/domain/consultation";
import type { PersonneTournee } from "@/domain/tournee";
import type { SaisieEnAttente } from "@/offline/file";

afterEach(cleanup);

const afiavi: PersonneTournee = {
  id: "0b8f5c1e-3f8a-4b3a-9a57-6f1f2c3d4e5f",
  prenom: "Afiavi",
  nom: "Dossou",
  sexe: "F",
  age: 31,
  libelleAge: "31 ans",
  telephone: "+2290197000003",
  enceinte: true,
  malvoyant: false,
  vueAujourdhui: false,
  raisons: [{ texte: "Consultation prénatale 2 manquée", urgence: 1 }],
};

function ouvrir() {
  const onEnregistrer = vi.fn<(saisies: SaisieEnAttente[], note: unknown) => void>();
  render(<VueVisite personne={afiavi} foyer={{ nom: "Dossou", village: "Sèhoun" }} onRetour={() => {}} onEnregistrer={onEnregistrer} />);
  return { onEnregistrer, bouton: screen.getByRole("button", { name: "Enregistrer la visite" }) as HTMLButtonElement };
}

describe("VueVisite", () => {
  it("dit pourquoi passer, et n'enregistre qu'avec un constat", () => {
    const { bouton } = ouvrir();
    expect(screen.getByText("Consultation prénatale 2 manquée")).toBeTruthy();
    expect(bouton.disabled).toBe(true);
    fireEvent.click(screen.getByLabelText("Tout va bien"));
    expect(bouton.disabled).toBe(false);
  });

  it("fait partir la tension avec la visite, « 15 sur 9 » compris comme 150/90", () => {
    const { onEnregistrer, bouton } = ouvrir();
    fireEvent.click(screen.getByLabelText("À orienter vers le centre"));
    fireEvent.change(screen.getByLabelText("Tension, premier chiffre"), { target: { value: "15" } });
    fireEvent.change(screen.getByLabelText("Tension, second chiffre"), { target: { value: "9" } });
    fireEvent.click(bouton);
    const [saisies, note] = onEnregistrer.mock.calls[0]!;
    expect(saisies.map((s) => s.type)).toEqual(["mesure", "visite_domicile"]);
    expect(saisies[0]?.donnees).toEqual({ mesures: { tensionSys: 150, tensionDia: 90 } });
    expect(saisies[1]?.donnees).toEqual({ constat: "a_orienter", noteVocale: false });
    expect(note).toBeNull();
  });

  it("dit ce qui manque à la tension, et n'enregistre pas", () => {
    const { onEnregistrer, bouton } = ouvrir();
    fireEvent.click(screen.getByLabelText("Tout va bien"));
    fireEvent.change(screen.getByLabelText("Tension, premier chiffre"), { target: { value: "140" } });
    fireEvent.click(bouton);
    expect(screen.getByRole("alert").textContent).toBe(TENSION_INCOMPLETE);
    expect(onEnregistrer).not.toHaveBeenCalled();
  });

  it("propose les signes de danger de la grossesse, et l'alerte part en premier", () => {
    const { onEnregistrer, bouton } = ouvrir();
    fireEvent.click(screen.getByLabelText("À orienter vers le centre"));
    fireEvent.click(screen.getByLabelText("Signe de danger"));
    expect(screen.getByLabelText("Saignement")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Forts maux de tête"));
    fireEvent.click(bouton);
    expect(onEnregistrer.mock.calls[0]![0].map((s) => s.type)).toEqual(["signalement_danger", "visite_domicile"]);
  });

  it("dit quand le téléphone ne peut pas enregistrer la voix", () => {
    ouvrir();
    expect(screen.getByText(/Enregistrer la voix n'est pas possible sur ce téléphone/)).toBeTruthy();
  });
});

describe("lireTension", () => {
  it("accepte rien, les deux chiffres, ou l'écriture en centimètres", () => {
    expect(lireTension("", "")).toBeNull();
    expect(lireTension("140", "90")).toEqual({ sys: 140, dia: 90 });
    expect(lireTension("18", "11")).toEqual({ sys: 180, dia: 110 });
    expect(typeof lireTension("400", "90")).toBe("string");
  });
});
