import { env } from "@/config/env";
import { exigerRole } from "@/server/auth/cookies";
import { BoutonDeconnexion } from "@/ui/BoutonDeconnexion";
import { Icone } from "@/ui/Icone";
import { Logo } from "@/ui/Logo";
import { MenuLateral } from "@/ui/MenuLateral";

export default async function PilotageLayout({ children }: { children: React.ReactNode }) {
  const compte = await exigerRole("pilotage");
  const national = !compte.communeId;
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[240px_1fr]">
      <aside className="flex flex-col gap-3 bg-white p-4 md:min-h-dvh md:gap-1 md:p-5">
        <div className="flex items-center gap-3 md:mb-6">
          <Logo className="size-10" />
          <div className="min-w-0">
            <b className="block text-lg leading-tight">{env.NEXT_PUBLIC_APP_NAME}</b>
            <small className="block truncate text-xs text-gris">{national ? "Vue nationale" : "Zone sanitaire"}</small>
          </div>
        </div>
        <MenuLateral
          liens={
            national
              ? [
                  { href: "/pilotage", libelle: "Vue nationale", icone: "ph-bank" },
                  { href: "/pilotage/zones", libelle: "Zones", icone: "ph-map-trifold" },
                  { href: "/pilotage/indicateurs", libelle: "Indicateurs", icone: "ph-chart-line-up" },
                  { href: "/pilotage/alertes", libelle: "Alertes", icone: "ph-bell" },
                  { href: "/pilotage/exports", libelle: "Exports", icone: "ph-download-simple" },
                ]
              : [
                  { href: "/pilotage", libelle: "Ma zone", icone: "ph-map-trifold" },
                  { href: "/pilotage/indicateurs", libelle: "Indicateurs", icone: "ph-chart-line-up" },
                  { href: "/pilotage/centres", libelle: "Centres et relais", icone: "hi-ambulatory-clinic" },
                  { href: "/pilotage/alertes", libelle: "Alertes", icone: "ph-bell" },
                  { href: "/pilotage/exports", libelle: "Exports", icone: "ph-download-simple" },
                ]
          }
        />
        <div className="flex items-center gap-2.5 rounded-2xl bg-lavande p-2.5 md:mt-auto">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-marque text-white">
            <Icone nom={national ? "ph-bank" : "ph-map-trifold"} className="size-5" />
          </span>
          <b className="min-w-0 flex-1 truncate text-sm">{compte.nomAffiche}</b>
          <BoutonDeconnexion compact className="grid size-9 place-items-center rounded-xl text-marque" />
        </div>
      </aside>
      <main className="cascade flex min-w-0 flex-col gap-6 p-4 md:p-7">{children}</main>
    </div>
  );
}
