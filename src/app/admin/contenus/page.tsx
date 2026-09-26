import type { Metadata } from "next";
import Link from "next/link";
import { CATEGORIES_CONTENU, TEXTE_MAX, type CategorieContenu } from "@/domain/contenus";
import { LANGUES, LIBELLES_LANGUE, type Langue } from "@/domain/langues";
import { exigerRole } from "@/server/auth/cookies";
import { listerContenus, type ContenuListe } from "@/server/contenus";
import { db } from "@/server/db/client";
import { BoutonEcouter } from "@/ui/BoutonEcouter";
import { EnTete } from "@/ui/EnTete";
import { Icone } from "@/ui/Icone";
import type { NomIcone } from "@/ui/icones";
import { RetourAction } from "@/ui/RetourAction";
import { modifierTexteAction } from "../actions";
import { EnregistreurContenu } from "./EnregistreurContenu";

export const metadata: Metadata = { title: "Contenus de santé" };

const NOTES: Record<string, { texte: string; ok: boolean }> = {
  texte: { texte: "Texte enregistré : les familles le lisent et l'entendent déjà.", ok: true },
  invalide: { texte: `Le texte français ne peut pas être vide (${TEXTE_MAX} caractères au plus).`, ok: false },
  introuvable: { texte: "Ce contenu n'existe plus.", ok: false },
  interdit: { texte: "Seule l'administration peut modifier les contenus.", ok: false },
};

const AUTRES: Langue[] = LANGUES.filter((l) => l !== "fr" && l !== "fon");

/** Gestion de contenu (exigence du challenge) : les messages de santé, leur texte et leur version parlée dans chaque langue. */
export default async function Contenus({ searchParams }: PageProps<"/admin/contenus">) {
  const compte = await exigerRole("admin");
  const params = await searchParams;
  const note = typeof params.note === "string" ? NOTES[params.note] : undefined;
  const contenus = await listerContenus(db());
  const enFon = contenus.filter((c) => c.traductions.some((t) => t.langue === "fon" && t.audio)).length;
  const categories = Object.keys(CATEGORIES_CONTENU) as CategorieContenu[];

  return (
    <main className="cascade mx-auto flex max-w-4xl flex-col gap-6 px-4 py-6">
      <EnTete nomAffiche={compte.nomAffiche} sousTitre="Administration" />
      <nav aria-label="Administration" className="flex gap-2">
        <Link href="/admin" className="rounded-bouton bg-white px-4 py-2 text-sm font-bold text-marque">
          La démo
        </Link>
        <Link href="/admin/contenus" aria-current="page" className="rounded-bouton bg-marque px-4 py-2 text-sm font-bold text-white">
          Contenus de santé
        </Link>
      </nav>
      <header>
        <h1 className="text-3xl font-bold">Contenus de santé</h1>
        <p className="mt-1 text-gris">
          Ce que l&apos;application dit aux familles. Écrivez le texte, puis enregistrez sa version parlée dans chaque langue : c&apos;est elle
          qu&apos;entendent les personnes qui ne lisent pas le français. Sans enregistrement, la voix du téléphone lit le texte français.
        </p>
      </header>
      {note?.ok && <RetourAction message={note.texte} />}
      {note && !note.ok && (
        <p role="alert" className="rounded-carte bg-soleil-pale px-4 py-3 font-bold">
          {note.texte}
        </p>
      )}
      <p className="flex items-center gap-2 rounded-carte bg-white px-4 py-3 text-sm">
        <Icone nom="ph-speaker-high" className="size-5 shrink-0 text-marque" />
        <span>
          <b>
            {enFon} contenu{enFon > 1 ? "s" : ""} sur {contenus.length}
          </b>{" "}
          {enFon > 1 ? "ont" : "a"} leur version parlée en fon.
        </span>
      </p>
      {categories.map((categorie) => {
        const liste = contenus.filter((c) => c.categorie === categorie);
        if (!liste.length) return null;
        return (
          <section key={categorie} aria-labelledby={`categorie-${categorie}`} className="flex flex-col gap-3">
            <h2 id={`categorie-${categorie}`} className="text-xl font-bold">
              {CATEGORIES_CONTENU[categorie]}
            </h2>
            {liste.map((c) => (
              <CarteContenu key={c.code} contenu={c} />
            ))}
          </section>
        );
      })}
    </main>
  );
}

function CarteContenu({ contenu: c }: { contenu: ContenuListe }) {
  const trad = (l: Langue) => c.traductions.find((t) => t.langue === l);
  const audio = (l: Langue) => {
    const t = trad(l);
    return t?.audio && t.audioLe ? `/api/contenus/${c.code}/${l}?v=${t.audioLe.getTime()}` : null;
  };
  const francais = trad("fr")?.texte ?? "";
  return (
    <article id={c.code} className="flex scroll-mt-4 flex-col gap-4 rounded-carte bg-white p-5">
      <div className="flex items-center gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-lavande-2 text-marque">
          <Icone nom={c.pictogramme as NomIcone} className="size-7" />
        </span>
        <h3 className="flex-1 font-bold">{c.titre}</h3>
        {audio("fon") ? (
          <span className="rounded-lg bg-lavande-2 px-2 py-0.5 text-xs font-bold text-marque">Parlé en fon</span>
        ) : (
          <span className="rounded-lg bg-soleil-pale px-2 py-0.5 text-xs font-bold text-nuit">À enregistrer en fon</span>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <ChampLangue code={c.code} langue="fr" texte={francais} audio={audio("fr")} obligatoire />
        <ChampLangue code={c.code} langue="fon" texte={trad("fon")?.texte ?? ""} audio={audio("fon")} />
      </div>

      <details className="group rounded-2xl bg-lavande p-3">
        <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-bold text-marque">
          <Icone nom="ph-caret-right" className="size-4 transition-transform group-open:rotate-90" />
          Autres langues : {AUTRES.map((l) => LIBELLES_LANGUE[l]).join(", ")}
          <span className="ml-auto text-xs font-normal text-gris">{AUTRES.filter((l) => audio(l)).length} enregistrée(s)</span>
        </summary>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {AUTRES.map((l) => (
            <div key={l} className="flex flex-col gap-2 rounded-2xl bg-white p-3">
              <b className="text-sm">{LIBELLES_LANGUE[l]}</b>
              <EnregistreurContenu code={c.code} langue={l} libelleLangue={LIBELLES_LANGUE[l]} audio={audio(l)} />
            </div>
          ))}
        </div>
      </details>
    </article>
  );
}

function ChampLangue({ code, langue, texte, audio, obligatoire = false }: { code: string; langue: Langue; texte: string; audio: string | null; obligatoire?: boolean }) {
  const id = `texte-${code}-${langue}`;
  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-lavande p-3">
      <form action={modifierTexteAction} className="flex flex-col gap-2">
        <input type="hidden" name="code" value={code} />
        <input type="hidden" name="langue" value={langue} />
        <label htmlFor={id} className="flex items-center justify-between gap-2 text-sm font-bold">
          {LIBELLES_LANGUE[langue]}
          <span className="text-xs font-normal text-gris">{obligatoire ? "texte obligatoire" : "écrit facultatif"}</span>
        </label>
        <textarea
          id={id}
          name="texte"
          defaultValue={texte}
          required={obligatoire}
          maxLength={TEXTE_MAX}
          rows={Math.min(8, Math.max(3, Math.ceil(texte.length / 40) + texte.split("\n").length))}
          placeholder={obligatoire ? undefined : "Transcription en fon, si vous l'écrivez"}
          className="rounded-xl border-2 border-lavande-3 bg-white px-3 py-2 text-sm"
        />
        <div className="flex flex-wrap items-center gap-2">
          <button className="rounded-bouton bg-white px-3 py-2 text-sm font-bold text-marque">Enregistrer le texte</button>
          {obligatoire && <BoutonEcouter variante="pastille" libelle="Écouter avec la voix du téléphone" texte={texte.replace(/\n/g, " ")} />}
        </div>
      </form>
      <EnregistreurContenu code={code} langue={langue} libelleLangue={LIBELLES_LANGUE[langue]} audio={audio} />
    </div>
  );
}
