import { env } from "@/config/env";
import { BoutonDeconnexion } from "./BoutonDeconnexion";
import { Logo } from "./Logo";

export function EnTete({ nomAffiche, sousTitre }: { nomAffiche: string; sousTitre?: string }) {
  return (
    <header className="flex items-center gap-3">
      <Logo />
      <div className="min-w-0 flex-1">
        <p className="text-lg leading-tight font-bold">{env.NEXT_PUBLIC_APP_NAME}</p>
        <p className="truncate text-sm text-gris">{sousTitre ?? nomAffiche}</p>
      </div>
      <BoutonDeconnexion />
    </header>
  );
}
