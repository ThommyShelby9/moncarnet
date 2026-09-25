// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { VueEnvoi } from "@/app/relais/VueEnvoi";
import type { SaisieEnAttente } from "@/offline/file";

afterEach(cleanup);

const saisie = (id: string, type: string, groupe: string, libelle: string): SaisieEnAttente => ({
  id,
  patientId: "p",
  type,
  survenuLe: "2026-09-25T09:30:00.000Z",
  donnees: {},
  libelle,
  groupe,
  nature: "visite",
});

describe("VueEnvoi", () => {
  it("montre une ligne par visite, pas par saisie", () => {
    render(
      <VueEnvoi
        file={[saisie("m", "mesure", "v", "Tension d'Afiavi Dossou"), saisie("v", "visite_domicile", "v", "Visite chez Afiavi Dossou")]}
        refus={[]}
        horsLigne={false}
        onEnvoyer={() => {}}
        onRetirer={() => {}}
        onRetour={() => {}}
      />,
    );
    expect(screen.getAllByRole("listitem").map((li) => li.textContent)).toEqual([expect.stringContaining("Visite chez Afiavi Dossou")]);
    expect(screen.getByRole("button", { name: "Envoyer maintenant" })).toBeTruthy();
  });

  it("montre la raison d'un refus et permet de le retirer", () => {
    const onRetirer = vi.fn();
    const refusee = saisie("r", "visite_domicile", "r", "Visite chez Codjo Houngbo");
    render(
      <VueEnvoi
        file={[]}
        refus={[{ saisie: refusee, motif: "Cette personne n'est pas dans votre tournée.", le: "2026-09-25T10:00:00.000Z" }]}
        horsLigne
        onEnvoyer={() => {}}
        onRetirer={onRetirer}
        onRetour={() => {}}
      />,
    );
    expect(screen.getByText("Cette personne n'est pas dans votre tournée.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Retirer de la liste" }));
    expect(onRetirer).toHaveBeenCalledWith("r");
  });

  it("ne propose pas d'envoyer sans réseau", () => {
    render(
      <VueEnvoi file={[saisie("v", "visite_domicile", "v", "Visite")]} refus={[]} horsLigne onEnvoyer={() => {}} onRetirer={() => {}} onRetour={() => {}} />,
    );
    expect((screen.getByRole("button", { name: /Pas de réseau/ }) as HTMLButtonElement).disabled).toBe(true);
  });
});
