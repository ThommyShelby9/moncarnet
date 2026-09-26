// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EnregistreurContenu } from "@/app/admin/contenus/EnregistreurContenu";

const routeur = { refresh: vi.fn() };
vi.mock("next/navigation", () => ({ useRouter: () => routeur }));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  routeur.refresh.mockReset();
});

const choisir = (fichier: File) => fireEvent.change(screen.getByLabelText("Choisir un fichier"), { target: { files: [fichier] } });

describe("EnregistreurContenu", () => {
  it("envoie le fichier choisi pour la langue, puis dit que les familles l'entendent", async () => {
    const envoi = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", envoi);
    render(<EnregistreurContenu code="prise_soir" langue="fon" libelleLangue="Fon" audio={null} />);
    choisir(new File([new Uint8Array(10)], "soir.ogg", { type: "audio/ogg" }));
    await waitFor(() => expect(screen.getByRole("status").textContent).toBe("Version en fon enregistrée : les familles l'entendent désormais."));
    expect(envoi).toHaveBeenCalledWith("/api/admin/contenus/prise_soir/fon", expect.objectContaining({ method: "POST", headers: { "Content-Type": "audio/ogg" } }));
    expect(routeur.refresh).toHaveBeenCalled();
  });

  it("dit pourquoi un fichier est refusé", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ erreur: "trop_lourd" }), { status: 413 })));
    render(<EnregistreurContenu code="prise_soir" langue="fon" libelleLangue="Fon" audio={null} />);
    choisir(new File([new Uint8Array(10)], "long.ogg", { type: "audio/ogg" }));
    await waitFor(() => expect(screen.getByRole("status").textContent).toBe("Enregistrement trop long : 1 Mo au plus (environ une minute)."));
    expect(routeur.refresh).not.toHaveBeenCalled();
  });

  it("montre l'enregistrement existant, avec « Supprimer »", () => {
    render(<EnregistreurContenu code="prise_soir" langue="fon" libelleLangue="Fon" audio="/api/contenus/prise_soir/fon?v=1" />);
    expect(screen.getByLabelText("Version en Fon").getAttribute("src")).toBe("/api/contenus/prise_soir/fon?v=1");
    expect(screen.getByRole("button", { name: "Supprimer" })).toBeTruthy();
  });
});
