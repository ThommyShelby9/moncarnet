import { seDeconnecter } from "@/app/actions-session";
import { env } from "@/config/env";
import { Icone } from "./Icone";
import { Logo } from "./Logo";

export function EnTete({ nomAffiche, sousTitre }: { nomAffiche: string; sousTitre?: string }) {
  return (
    <header className="flex items-center gap-3">
      <Logo />
      <div className="min-w-0 flex-1">
        <p className="text-lg leading-tight font-bold">{env.NEXT_PUBLIC_APP_NAME}</p>
        <p className="truncate text-sm text-gris">{sousTitre ?? nomAffiche}</p>
      </div>
      <form action={seDeconnecter}>
        <button className="flex items-center gap-2 rounded-bouton bg-white px-3 py-2 text-sm font-bold text-marque">
          <Icone nom="ph-sign-out" className="size-5" />
          Se déconnecter
        </button>
      </form>
    </header>
  );
}
