import { env } from "@/config/env";
import { exigerRole } from "@/server/auth/cookies";
import { BoutonDeconnexion } from "@/ui/BoutonDeconnexion";
import { Icone } from "@/ui/Icone";
import { Logo } from "@/ui/Logo";
import { MenuLateral } from "@/ui/MenuLateral";

/** Espace de la pharmacie : délivrer, retrouver ce qui a été délivré, dire ce qui manque. */
export default async function EspacePharmacieLayout({ children }: { children: React.ReactNode }) {
  const compte = await exigerRole("pharmacie");
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[240px_1fr]">
      <aside className="flex flex-col gap-3 bg-white p-4 md:min-h-dvh md:gap-1 md:p-5">
        <div className="flex items-center gap-3 md:mb-6">
          <Logo className="size-10" />
          <div className="min-w-0">
            <b className="block text-lg leading-tight">{env.NEXT_PUBLIC_APP_NAME}</b>
            <small className="block truncate text-xs text-gris">Pharmacie</small>
          </div>
        </div>
        <MenuLateral
          liens={[
            { href: "/pharmacie", libelle: "Délivrer", icone: "ph-prescription" },
            { href: "/pharmacie/historique", libelle: "Historique", icone: "ph-clock-counter-clockwise" },
            { href: "/pharmacie/ruptures", libelle: "Ruptures", icone: "ph-package" },
          ]}
        />
        <div className="flex items-center gap-2.5 rounded-2xl bg-lavande p-2.5 md:mt-auto">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-marque text-white">
            <Icone nom="hi-pharmacy" className="size-6" />
          </span>
          <b className="min-w-0 flex-1 truncate text-sm">{compte.nomAffiche}</b>
          <BoutonDeconnexion compact className="grid size-9 place-items-center rounded-xl text-marque" />
        </div>
      </aside>
      <main className="cascade flex min-w-0 flex-col gap-5 p-4 md:p-7">{children}</main>
    </div>
  );
}
