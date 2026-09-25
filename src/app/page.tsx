import { env } from "@/config/env";
import { Icone } from "@/ui/Icone";
import { Logo } from "@/ui/Logo";

export default function Accueil() {
  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 px-4 py-10">
      <div className="flex items-center gap-3">
        <Logo />
        <p className="text-2xl font-bold">{env.NEXT_PUBLIC_APP_NAME}</p>
      </div>
      <p className="text-lg">Fɔ̀ngbè : ɛ̀ ɔ́ ɖ ǒ. Yorùbá : ɛ́ ɔ̀.</p>
      <p className="flex items-center gap-2 rounded-carte bg-white p-4 font-bold text-marque">
        <Icone nom="hi-blood-pressure" className="size-8" />
        Contrôle de la tension
      </p>
    </main>
  );
}
