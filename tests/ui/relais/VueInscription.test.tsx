// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VueInscription } from "@/app/relais/VueInscription";
import { estUuid } from "@/domain/identifiants";
import type { SaisieEnAttente } from "@/offline/file";

const foyers = [{ id: "0b8f5c1e-3f8a-4b3a-9a57-6f1f2c3d4e5f", nom: "Dossou", village: "Sèhoun" }];

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-09-25T10:00:00Z"));
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function ouvrir() {
  const onInscrire = vi.fn<(saisie: SaisieEnAttente) => void>();
  render(<VueInscription foyers={foyers} foyerId={null} onRetour={() => {}} onInscrire={onInscrire} />);
  return onInscrire;
}

describe("VueInscription", () => {
  it("inscrit un nouveau-né, avec un identifiant de carnet créé sur le téléphone", () => {
    const onInscrire = ouvrir();
    fireEvent.click(screen.getByLabelText("Nouveau-né"));
    fireEvent.change(screen.getByLabelText("Prénom"), { target: { value: "Yao" } });
    fireEvent.change(screen.getByLabelText("Nom"), { target: { value: "Dossou" } });
    fireEvent.click(screen.getByLabelText("Garçon"));
    fireEvent.change(screen.getByLabelText("Né le"), { target: { value: "2026-09-20" } });
    fireEvent.click(screen.getByRole("button", { name: "Inscrire" }));
    const [saisie] = onInscrire.mock.calls[0]!;
    expect(saisie).toMatchObject({
      type: "inscription",
      nature: "inscription",
      donnees: { foyerId: foyers[0]!.id, prenom: "Yao", sexe: "M", dateNaissance: "2026-09-20", programme: { code: "vaccination" } },
    });
    expect(estUuid(saisie.patientId)).toBe(true);
  });

  it("dit ce qui manque et garde la saisie", () => {
    const onInscrire = ouvrir();
    fireEvent.click(screen.getByLabelText("Tension"));
    fireEvent.change(screen.getByLabelText("Prénom"), { target: { value: "Noël" } });
    fireEvent.change(screen.getByLabelText("Nom"), { target: { value: "Kiki" } });
    fireEvent.click(screen.getByLabelText("Homme"));
    fireEvent.click(screen.getByRole("button", { name: "Inscrire" }));
    expect(screen.getByRole("alert").textContent).toBe("Indiquez l'âge.");
    expect((screen.getByLabelText("Prénom") as HTMLInputElement).value).toBe("Noël");
    expect(onInscrire).not.toHaveBeenCalled();
  });
});
