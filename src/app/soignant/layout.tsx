import { seDeconnecter } from "@/app/actions-session";
import { env } from "@/config/env";
import { db } from "@/server/db/client";
import { nomEtablissement } from "@/server/requetes/soignant";
import { Icone } from "@/ui/Icone";
import { Logo } from "@/ui/Logo";
import { MenuLateral } from "@/ui/MenuLateral";
import { exigerSoignant } from "./contexte";

const initiales = (nom: string) =>
  nom
    .split(/\s+/)
    .map((mot) => mot[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

export default async function EspaceSoignantLayout({ children }: { children: React.ReactNode }) {
  const soignant = await exigerSoignant();
  const centre = await nomEtablissement(db(), soignant.etablissementId);
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[240px_1fr]">
      <aside className="flex flex-col gap-3 bg-white p-4 md:min-h-dvh md:gap-1 md:p-5">
        <div className="flex items-center gap-3 md:mb-6">
          <Logo className="size-10" />
          <div className="min-w-0">
            <b className="block text-lg leading-tight">{env.NEXT_PUBLIC_APP_NAME}</b>
            <small className="block truncate text-xs text-gris">{centre}</small>
          </div>
        </div>
        <MenuLateral
          liens={[
            { href: "/soignant", libelle: "Aujourd'hui", icone: "ph-house" },
            { href: "/soignant/patients", libelle: "Patients", icone: "ph-users-three" },
          ]}
        />
        <div className="flex items-center gap-2.5 rounded-2xl bg-lavande p-2.5 md:mt-auto">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-marque text-xs font-bold text-white">{initiales(soignant.nomAffiche)}</span>
          <b className="min-w-0 flex-1 truncate text-sm">{soignant.nomAffiche}</b>
          <form action={seDeconnecter}>
            <button aria-label="Se déconnecter" title="Se déconnecter" className="grid size-9 place-items-center rounded-xl text-marque">
              <Icone nom="ph-sign-out" className="size-5" />
            </button>
          </form>
        </div>
      </aside>
      <main className="flex min-w-0 flex-col gap-5 p-4 md:p-7">{children}</main>
    </div>
  );
}
