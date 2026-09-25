// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { FriseGrossesse } from "@/app/(patient)/(onglets)/grossesse/FriseGrossesse";

afterEach(cleanup);

describe("FriseGrossesse", () => {
  it("place la semaine du jour et les consultations sur les trois trimestres", () => {
    render(
      <FriseGrossesse
        semaines={37}
        reperes={[
          { code: "cpn1", libelle: "Consultation prénatale 1", semaine: 12, statut: "faite" },
          { code: "cpn2", libelle: "Consultation prénatale 2", semaine: 26, statut: "faite" },
          { code: "cpn3", libelle: "Consultation prénatale 3", semaine: 32, statut: "manquee" },
          { code: "accouchement", libelle: "Accouchement prévu", semaine: 40, statut: "a_venir" },
        ]}
      />,
    );
    const frise = screen.getByRole("img");
    expect(frise.getAttribute("aria-label")).toBe(
      "Semaine 37 sur 40. Consultation prénatale 1 : faite. Consultation prénatale 2 : faite. Consultation prénatale 3 : manquée. Accouchement prévu : à venir.",
    );
    expect(screen.getAllByText(/trimestre/)).toHaveLength(3);
  });
});
