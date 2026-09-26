import { describe, expect, it } from "vitest";
import { canalSuivant, premierCanal, texteRappel } from "@/domain/rappels";

describe("premierCanal", () => {
  const tel = "+2290197000001";
  it("choisit WhatsApp seulement avec le consentement, sinon le SMS", () => {
    expect(premierCanal({ canalPrefere: "whatsapp", telephone: tel, consentements: ["whatsapp"] })).toBe("whatsapp");
    expect(premierCanal({ canalPrefere: "whatsapp", telephone: tel, consentements: ["sms"] })).toBe("sms");
    expect(premierCanal({ canalPrefere: "sms", telephone: tel, consentements: ["sms"] })).toBe("sms");
  });

  it("appelle qui préfère la voix, et passe par le relais sans téléphone", () => {
    expect(premierCanal({ canalPrefere: "vocal", telephone: tel, consentements: ["sms"] })).toBe("vocal");
    expect(premierCanal({ canalPrefere: "relais", telephone: tel, consentements: [] })).toBe("relais");
    expect(premierCanal({ canalPrefere: "whatsapp", telephone: null, consentements: ["whatsapp"] })).toBe("relais");
  });
});

describe("canalSuivant", () => {
  it("descend la cascade jusqu'au relais", () => {
    expect(canalSuivant("whatsapp")).toBe("sms");
    expect(canalSuivant("sms")).toBe("vocal");
    expect(canalSuivant("vocal")).toBe("relais");
    expect(canalSuivant("relais")).toBeNull();
  });
});

describe("texteRappel", () => {
  const base = { date: "2026-09-30", moment: "matin" as const, centre: "Centre de santé de Bohicon" };
  it("dit qui, quoi, quand et où, sans diagnostic", () => {
    const texte = texteRappel({ ...base, pour: "Sèna", vaccin: true, canal: "sms" });
    expect(texte).toBe(
      "Rappel pour Sèna : vaccin mercredi 30 septembre, le matin, au Centre de santé de Bohicon. Répondez 1 si vous venez, 2 si vous ne pouvez pas.",
    );
  });

  it("ne dit jamais la maladie, et parle au clavier pour l'appel vocal", () => {
    const texte = texteRappel({ ...base, pour: null, vaccin: false, canal: "vocal" });
    expect(texte).toBe("Bonjour. Vous avez rendez-vous mercredi 30 septembre, le matin, au Centre de santé de Bohicon. Tapez 1 si vous venez, 2 si vous ne pouvez pas.");
    expect(texte).not.toMatch(/tension|diabète|grossesse|enceinte/i);
  });
});
