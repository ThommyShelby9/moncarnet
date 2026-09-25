import { EnTete } from "./EnTete";
import { Icone } from "./Icone";
import type { NomIcone } from "./icones";

type Props = { nomAffiche: string; titre: string; icone: NomIcone; texte: string };

export function EspaceEnPreparation({ nomAffiche, titre, icone, texte }: Props) {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-6">
      <EnTete nomAffiche={nomAffiche} />
      <section className="flex flex-col items-start gap-4 rounded-grande bg-white p-6">
        <span className="grid size-14 place-items-center rounded-2xl bg-lavande-2 text-marque">
          <Icone nom={icone} className="size-9" />
        </span>
        <h1 className="text-3xl font-bold">{titre}</h1>
        <p className="text-lg text-gris">{texte}</p>
      </section>
    </main>
  );
}
