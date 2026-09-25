// @vitest-environment jsdom
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PaveNumerique } from "@/ui/PaveNumerique";

afterEach(cleanup);

function taper(getByRole: ReturnType<typeof render>["getByRole"], chiffres: string) {
  for (const c of chiffres) fireEvent.click(getByRole("button", { name: c }));
}

describe("PaveNumerique", () => {
  it("renvoie le code complet et le place dans le champ caché", () => {
    const onComplet = vi.fn();
    const { getByRole, container } = render(<PaveNumerique name="code" libelle="Mon code" onComplet={onComplet} />);
    taper(getByRole, "1234");
    expect(onComplet).toHaveBeenCalledWith("1234");
    expect(container.querySelector<HTMLInputElement>('input[name="code"]')?.value).toBe("1234");
  });

  it("ignore les chiffres au-delà de la longueur", () => {
    const { getByRole, container } = render(<PaveNumerique name="code" libelle="Mon code" />);
    taper(getByRole, "12345");
    expect(container.querySelector<HTMLInputElement>('input[name="code"]')?.value).toBe("1234");
  });

  it("efface le dernier chiffre et l'annonce", () => {
    const { getByRole } = render(<PaveNumerique name="code" libelle="Mon code" />);
    taper(getByRole, "123");
    fireEvent.click(getByRole("button", { name: "Effacer le dernier chiffre" }));
    expect(getByRole("status").getAttribute("aria-label")).toBe("2 chiffres sur 4");
  });
});
