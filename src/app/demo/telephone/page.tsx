import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { env } from "@/config/env";
import { aujourdhuiAuBenin } from "@/domain/dates";
import { dateCourte, heureMinute } from "@/domain/temps";
import { db } from "@/server/db/client";
import { messagesDuTelephone, type RappelVu } from "@/server/rappels";
import { BoutonEcouter } from "@/ui/BoutonEcouter";
import { Icone } from "@/ui/Icone";
import { Logo } from "@/ui/Logo";
import { repondreDepuisTelephoneAction } from "./actions";

export const metadata: Metadata = { title: "Le faux téléphone" };

const TELEPHONES = [
  { numero: "+2290197000001", nom: "Codjo Houngbo", appareil: "Smartphone avec WhatsApp" },
  { numero: "+2290197000003", nom: "Afiavi Dossou", appareil: "Téléphone basique : SMS et appels" },
  { numero: "+2290197000004", nom: "Aïcha Salifou", appareil: "Smartphone avec WhatsApp" },
];

const NOTES: Record<string, string> = {
  viendra: "Réponse « 1 » envoyée : le rendez-vous est confirmé.",
  empeche: "Réponse « 2 » envoyée : la place est libérée pour quelqu'un d'autre.",
  deja: "Ce rendez-vous a déjà une réponse.",
};

function Message({ m, numero }: { m: RappelVu & { repondable: boolean }; numero: string }) {
  const quand = `${dateCourte(aujourdhuiAuBenin(m.envoyeLe))}, ${heureMinute(m.envoyeLe)}`;
  const etat = m.reponse === "viendra" ? "Répondu : 1" : m.reponse === "empeche" ? "Répondu : 2" : m.statut === "sans_reponse" ? "Sans réponse" : null;
  return (
    <li className="flex flex-col gap-1.5">
      {m.canal === "vocal" ? (
        <div className="flex flex-col gap-2 rounded-2xl bg-nuit p-3 text-white">
          <span className="flex items-center gap-2 text-sm font-bold">
            <Icone nom="ph-phone" className="size-5 text-soleil" />
            Appel vocal · simulé
          </span>
          <BoutonEcouter variante="complet" libelle="Écouter l'appel" sousLibelle="La voix lit le message" texte={m.contenu} />
        </div>
      ) : (
        <div className={`max-w-[88%] rounded-2xl px-3 py-2 ${m.canal === "whatsapp" ? "self-start rounded-tl-sm bg-marque text-white" : "self-start rounded-tl-sm bg-lavande-2 text-nuit"}`}>
          <small className={`block text-xs font-bold ${m.canal === "whatsapp" ? "text-lavande-3" : "text-gris"}`}>{m.canal === "whatsapp" ? "WhatsApp · simulé" : "SMS · simulé"}</small>
          <p className="leading-snug">{m.contenu}</p>
        </div>
      )}
      <small className="text-xs text-gris">
        {quand}
        {etat ? ` · ${etat}` : ""}
      </small>
      {m.repondable && (
        <div className="grid grid-cols-2 gap-2">
          {(["viendra", "empeche"] as const).map((reponse) => (
            <form key={reponse} action={repondreDepuisTelephoneAction}>
              <input type="hidden" name="rappelId" value={m.id} />
              <input type="hidden" name="numero" value={numero} />
              <button name="reponse" value={reponse} className="w-full rounded-xl bg-white px-2 py-2.5 text-sm font-bold text-marque shadow-[inset_0_0_0_2px_var(--color-lavande-3)]">
                {reponse === "viendra" ? "1 : Je viendrai" : "2 : Je ne peux pas"}
              </button>
            </form>
          ))}
        </div>
      )}
    </li>
  );
}

/** Ce que reçoivent les téléphones de la démo : WhatsApp, SMS et appels vocaux simulés (spec §11). */
export default async function FauxTelephone({ searchParams }: PageProps<"/demo/telephone">) {
  if (!env.DEMO_MODE) notFound();
  const params = await searchParams;
  const choisi = TELEPHONES.find((t) => t.numero === params.numero) ?? TELEPHONES[0]!;
  const messages = (await messagesDuTelephone(db(), choisi.numero)).reverse();
  const note = NOTES[String(params.note ?? "")];
  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8">
      <header className="flex items-center gap-3">
        <Logo className="size-11" />
        <p className="text-2xl font-bold">{env.NEXT_PUBLIC_APP_NAME}</p>
        <Link href="/demo" className="ml-auto text-sm font-bold text-marque underline">
          Comptes de démonstration
        </Link>
      </header>
      <div>
        <h1 className="text-3xl font-bold">Le faux téléphone</h1>
        <p className="mt-1 max-w-2xl text-gris">
          Ce que reçoivent les téléphones de la démo. Rien n&apos;est vraiment envoyé : WhatsApp, SMS et appels vocaux sont simulés. Les messages ne disent jamais
          la maladie, car un téléphone se partage.
        </p>
      </div>
      <nav aria-label="Téléphones" className="flex flex-wrap gap-2">
        {TELEPHONES.map((t) => (
          <Link
            key={t.numero}
            href={`/demo/telephone?numero=${encodeURIComponent(t.numero)}`}
            aria-current={t.numero === choisi.numero ? "page" : undefined}
            className={`rounded-bouton px-4 py-2 text-sm font-bold ${t.numero === choisi.numero ? "bg-marque text-white" : "bg-white text-marque"}`}
          >
            {t.nom}
          </Link>
        ))}
      </nav>
      {note && (
        <p role="status" className="rounded-carte bg-nuit px-4 py-3 font-bold text-white">
          {note}
        </p>
      )}
      <div className="grid items-start gap-6 md:grid-cols-[360px_1fr]">
        <section aria-label={`Téléphone de ${choisi.nom}`} className="rounded-[2.6rem] bg-nuit p-2.5 shadow-[0_30px_60px_-24px_rgb(22_21_74_/_0.55)]">
          <div className="flex min-h-[560px] flex-col gap-3 rounded-[2.1rem] bg-lavande p-4">
            <div className="flex items-center justify-between text-xs font-bold text-gris">
              <span>{choisi.numero.replace("+229", "")}</span>
              <span>{choisi.appareil}</span>
            </div>
            <b className="text-lg">{choisi.nom}</b>
            {messages.length ? (
              <ul className="flex flex-col gap-4">
                {messages.map((m) => (
                  <Message key={m.id} m={m} numero={choisi.numero} />
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gris">Aucun message pour le moment.</p>
            )}
          </div>
        </section>
        <aside className="flex flex-col gap-3 rounded-carte bg-white p-5">
          <h2 className="text-lg font-bold">La cascade</h2>
          <ol className="flex flex-col gap-2 text-sm">
            <li>
              <b>J-2, 8 h</b> : WhatsApp si la personne l&apos;a et y consent, sinon SMS ; un appel vocal pour qui préfère la voix.
            </li>
            <li>
              <b>Sans réponse après 2 heures</b> : le canal suivant (SMS, puis appel vocal).
            </li>
            <li>
              <b>Toujours sans réponse</b> : la personne apparaît dans la tournée du relais, qui passe la prévenir.
            </li>
            <li>
              <b>« 2 : Je ne peux pas »</b> libère la place ; l&apos;application propose un autre jour.
            </li>
          </ol>
          <p className="text-sm text-gris">L&apos;administration envoie les rappels de J-2 et fait passer les relances d&apos;un clic.</p>
        </aside>
      </div>
    </main>
  );
}
