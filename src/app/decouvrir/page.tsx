import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { env } from "@/config/env";
import { Icone } from "@/ui/Icone";
import type { NomIcone } from "@/ui/icones";
import { Logo } from "@/ui/Logo";
import { Ondes } from "@/ui/Ondes";

const DESCRIPTION =
  "Le carnet de santé familial qui parle : la grossesse jusqu'à la naissance, les vaccins des enfants, la tension des parents. En fon et en français, sans réseau, avec le relais, la sage-femme, la pharmacie et l'État.";

export const metadata: Metadata = {
  title: "Découvrir",
  description: DESCRIPTION,
  openGraph: {
    title: `${env.NEXT_PUBLIC_APP_NAME} : le carnet de santé familial qui parle`,
    description: DESCRIPTION,
    images: [{ url: "/decouvrir/apercu.webp", width: 1200, height: 630 }],
    locale: "fr_FR",
    type: "website",
  },
};

function Telephone({ src, alt, legende, prioritaire = false }: { src: string; alt: string; legende?: string; prioritaire?: boolean }) {
  return (
    <figure className="flex shrink-0 snap-center flex-col items-center gap-3">
      <div className="rounded-[2.6rem] bg-nuit p-2 shadow-[0_30px_60px_-24px_rgb(22_21_74_/_0.55)]">
        <Image
          src={`/decouvrir/${src}.webp`}
          alt={alt}
          width={390}
          height={844}
          unoptimized
          priority={prioritaire}
          loading={prioritaire ? undefined : "lazy"}
          className="h-auto w-[210px] rounded-[2.1rem] sm:w-[235px]"
        />
      </div>
      {legende && <figcaption className="max-w-[240px] text-center text-sm leading-snug text-gris">{legende}</figcaption>}
    </figure>
  );
}

function Navigateur({ src, alt, legende }: { src: string; alt: string; legende?: string }) {
  return (
    <figure className="flex min-w-0 flex-col gap-3">
      <div className="overflow-hidden rounded-2xl bg-white shadow-[0_30px_60px_-30px_rgb(22_21_74_/_0.45)] ring-1 ring-lavande-3">
        <div className="flex items-center gap-1.5 border-b border-lavande-2 px-3 py-2">
          <span className="size-2.5 rounded-full bg-lavande-3" />
          <span className="size-2.5 rounded-full bg-lavande-3" />
          <span className="size-2.5 rounded-full bg-lavande-3" />
          <span className="mx-auto rounded-md bg-lavande px-3 py-0.5 text-xs text-gris">moncarnet.kheios.com</span>
        </div>
        <Image src={`/decouvrir/${src}.webp`} alt={alt} width={1280} height={800} unoptimized loading="lazy" className="h-auto w-full" />
      </div>
      {legende && <figcaption className="text-sm leading-snug text-gris">{legende}</figcaption>}
    </figure>
  );
}

function Etape({ numero, titre, children }: { numero: number; titre: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-soleil font-bold text-nuit">{numero}</span>
      <div>
        <b className="block text-lg leading-snug">{titre}</b>
        <p className="text-gris">{children}</p>
      </div>
    </li>
  );
}

function Rangee({ children }: { children: React.ReactNode }) {
  return <div className="-mx-4 flex snap-x gap-6 overflow-x-auto px-4 pb-4 lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0">{children}</div>;
}

const CONSTAT: { chiffre: string; texte: string; source: string }[] = [
  { chiffre: "52,6 %", texte: "des femmes vont jusqu'à la 4ᵉ consultation prénatale, alors que 83 % font la première.", source: "OMS, enquête MICS 2021-2022" },
  { chiffre: "7,4 %", texte: "des personnes parlent français à la maison ; 41,1 % parlent fongbé.", source: "Afrobaromètre, Bénin, round 10 (2024)" },
  { chiffre: "41,5 %", texte: "des femmes adultes savent lire.", source: "Banque mondiale, indicateurs du Bénin" },
  { chiffre: "38 %", texte: "des abonnements mobiles sont encore en 2G ; la 4G ne couvre que 63 % des zones rurales.", source: "ARCEP Bénin (2025)" },
];

const PRINCIPES: { icone: NomIcone; titre: string; texte: string }[] = [
  { icone: "ph-speaker-high", titre: "Tout s'écoute", texte: "Chaque carte, chaque conseil, chaque posologie se lit à voix haute : on n'a pas besoin de savoir lire." },
  { icone: "ph-list-checks", titre: "Un pictogramme et un mot", texte: "Les signes de danger, les moments de prise et les motifs de rendez-vous sont dessinés." },
  { icone: "ph-check-circle", titre: "Une chose à la fois", texte: "L'accueil dit ce qu'il faut faire maintenant : le comprimé du soir, le vaccin de mercredi." },
  { icone: "ph-wifi-slash", titre: "Sans réseau", texte: "Les pages déjà ouvertes restent lisibles ; la tournée du relais marche hors ligne et part au retour du réseau." },
  { icone: "ph-users-three", titre: "Un téléphone pour la famille", texte: "Un même téléphone gère les carnets de toute la famille ; la déconnexion efface ce qu'il garde." },
  { icone: "ph-shield-check", titre: "Pour les malvoyants aussi", texte: "Lecteur d'écran, gros boutons, contrastes forts, et Rachida suivie par sa fille et par le relais." },
];

const CAPOT: { icone: NomIcone; texte: string }[] = [
  { icone: "ph-device-mobile", texte: "Application installable (PWA), service worker, pages de moins de 300 Ko : pensée pour la 2G." },
  { icone: "ph-cloud-arrow-up", texte: "File d'envoi sans doublon : chaque saisie porte un identifiant créé sur le téléphone (UUID v7)." },
  { icone: "ph-heartbeat", texte: "Un programme de suivi tient dans un fichier : le suivi après l'accouchement a été ajouté ainsi." },
  { icone: "ph-list-checks", texte: "Près de 400 tests automatiques ; Next.js 16, TypeScript strict, Postgres ; déployée sur Coolify." },
  { icone: "ph-download-simple", texte: "Export des indicateurs au format DHIS2, l'outil du système national d'information sanitaire." },
  { icone: "ph-shield-check", texte: "Droits stricts : un soignant ne voit que son centre, un relais que ses foyers, l'État que des chiffres." },
];

/** La solution de bout en bout, pour qui découvre la plateforme : le constat, les parcours, les acteurs, l'État. */
export default function PageDecouvrir() {
  const nom = env.NEXT_PUBLIC_APP_NAME;
  return (
    <div className="bg-lavande text-nuit">
      <header className="sticky top-0 z-20 border-b border-lavande-2 bg-lavande/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Logo className="size-9" />
          <b className="text-lg">{nom}</b>
          <nav aria-label="Sections" className="ml-6 hidden gap-5 text-sm font-bold text-gris md:flex">
            <a href="#parcours">Parcours</a>
            <a href="#accompagnent">Soignants et relais</a>
            <a href="#etat">État</a>
            <a href="#capot">Sous le capot</a>
          </nav>
          <Link href="/demo" className="ml-auto rounded-bouton bg-marque px-4 py-2 text-sm font-bold text-white">
            Essayer la démo
          </Link>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden bg-marque text-white">
          <Ondes className="-top-40 -right-40 size-[40rem] text-white opacity-10" />
          <Ondes className="-bottom-52 -left-52 size-[34rem] text-white opacity-5" />
          <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 lg:grid-cols-[1.1fr_1fr] lg:py-20">
            <div className="flex flex-col gap-6">
              <p className="w-fit rounded-full bg-white/10 px-3 py-1 text-sm font-bold text-soleil">Challenge e-Santé Bénin 2026</p>
              <h1 className="text-4xl leading-[1.05] font-bold sm:text-5xl lg:text-6xl">Le carnet de santé familial qui parle.</h1>
              <p className="max-w-xl text-lg text-lavande-3">
                {nom} suit chaque personne de la famille : la grossesse jusqu&apos;à la naissance, les vaccins des enfants, la tension des parents. Il parle fon
                et français, marche sans réseau, et relie la famille au relais du village, à la sage-femme, à la pharmacie et à l&apos;État.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/demo" className="flex items-center gap-2 rounded-bouton bg-soleil px-5 py-3.5 text-lg font-bold text-nuit">
                  Essayer la démo
                  <Icone nom="ph-caret-right" className="size-5" />
                </Link>
                <Link href="/connexion" className="rounded-bouton bg-white px-5 py-3.5 text-lg font-bold text-marque">
                  Ouvrir mon carnet
                </Link>
              </div>
              <p className="text-sm text-lavande-3">Deux parcours à suivre en un clic : Awa jusqu&apos;à la naissance de son bébé, et Codjo au quotidien.</p>
            </div>
            <div className="flex justify-center gap-5">
              <div className="mt-10">
                <Telephone src="awa-grossesse" alt="Écran « Ma grossesse » d'Awa : semaine 37, terme prévu le 15 octobre, le bébé comparé à une igname" prioritaire />
              </div>
              <div className="hidden sm:block">
                <Telephone src="codjo-accueil" alt="Accueil de Codjo : la carte « Ce soir, 1 comprimé pour la tension », avec les boutons C'est fait et Plus tard" prioritaire />
              </div>
            </div>
          </div>
        </section>

        <section aria-labelledby="constat" className="mx-auto max-w-6xl px-4 py-16">
          <h2 id="constat" className="text-3xl font-bold sm:text-4xl">
            Le constat
          </h2>
          <p className="mt-2 max-w-2xl text-lg text-gris">Au Bénin, les rendez-vous se perdent entre la première visite et la dernière ; l&apos;écrit et le réseau ne suffisent pas.</p>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {CONSTAT.map((c) => (
              <li key={c.chiffre} className="flex flex-col gap-2 rounded-carte bg-white p-5">
                <b className="text-4xl text-marque">{c.chiffre}</b>
                <p>{c.texte}</p>
                <p className="mt-auto text-xs text-gris">Source : {c.source}</p>
              </li>
            ))}
          </ul>
          <p className="mt-8 max-w-3xl rounded-carte bg-nuit p-5 text-lg text-white">
            <b className="text-soleil">Notre réponse :</b> la voix d&apos;abord, une chose à la fois, un pictogramme et un mot, des pages qui marchent sans réseau, et
            un relais du village dans la boucle pour celles et ceux qui n&apos;ont pas de téléphone.
          </p>
        </section>

        <section id="parcours" aria-labelledby="parcours-awa" className="scroll-mt-16 bg-white">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16">
            <div className="max-w-3xl">
              <p className="font-bold text-marque">Parcours 1</p>
              <h2 id="parcours-awa" className="text-3xl font-bold sm:text-4xl">
                Awa, de la grossesse à la naissance
              </h2>
              <p className="mt-2 text-lg text-gris">Enceinte de 37 semaines à Bohicon. Son téléphone l&apos;accompagne jusqu&apos;aux premiers vaccins de son bébé.</p>
            </div>
            <ol className="grid gap-5 md:grid-cols-2">
              <Etape numero={1} titre="Sa grossesse, semaine par semaine">
                La semaine, la taille du bébé comparée à ce qu&apos;on trouve au marché, et les consultations tamponnées « VU » comme sur le carnet papier.
              </Etape>
              <Etape numero={2} titre="Préparer la naissance">
                Où accoucher, comment y aller même la nuit, qui accompagne, l&apos;argent, le sac, un proche prêt à donner son sang.
              </Etape>
              <Etape numero={3} titre="« Le travail a commencé »">
                Un geste dans « J&apos;ai un problème » : l&apos;alerte part au centre, qui a 15 minutes pour la prendre en charge.
              </Etape>
              <Etape numero={4} titre="La sage-femme déclare la naissance">
                Le carnet du bébé apparaît chez Awa, avec ses vaccins de naissance ; les visites après l&apos;accouchement lui sont proposées.
              </Etape>
            </ol>
            <Rangee>
              <Telephone src="awa-plan" alt="Préparer la naissance : six choses à prévoir, dont trois déjà cochées, avec un pictogramme chacune" legende="Préparer la naissance : 3 sur 6" />
              <Telephone src="awa-probleme" alt="Écran « J'ai un problème » : les signes de danger de la grossesse en pictogrammes, « Le travail a commencé » en premier" legende="Les signes de danger en images" />
              <Telephone src="awa-felicitations" alt="Accueil d'Awa après la naissance : « Bienvenue à Sènami ! » et la visite du 3ᵉ jour à prévoir" legende="Bienvenue à Sènami" />
              <Telephone src="bebe-carnet" alt="Carnet du bébé : les vaccins de la naissance tamponnés VU, puis les vaccins des 6 semaines à venir" legende="Le carnet du bébé et ses vaccins" />
            </Rangee>
            <Navigateur
              src="adjoa-naissance"
              alt="Poste de la sage-femme : formulaire de naissance avec l'heure, le lieu, fille, 3,2 kg, prénom Sènami et vaccins de naissance faits"
              legende="Chez Adjoa, la sage-femme : la naissance se déclare en une minute, une seule fois par grossesse."
            />
          </div>
        </section>

        <section aria-labelledby="parcours-codjo" className="mx-auto grid max-w-6xl gap-10 px-4 py-16">
          <div className="max-w-3xl">
            <p className="font-bold text-marque">Parcours 2</p>
            <h2 id="parcours-codjo" className="text-3xl font-bold sm:text-4xl">
              Codjo, un patient au quotidien
            </h2>
            <p className="mt-2 text-lg text-gris">58 ans, une tension à surveiller, et les carnets de sa femme et de son petit-fils sur le même téléphone.</p>
          </div>
          <div className="grid items-start gap-10 lg:grid-cols-[auto_1fr]">
            <div className="-mx-4 flex snap-x gap-6 overflow-x-auto px-4 pb-4 lg:mx-0 lg:px-0">
              <Telephone src="codjo-accueil" alt="Accueil de Codjo : « Ce soir, 1 comprimé pour la tension », à écouter, avec C'est fait et Plus tard" legende="Une chose à la fois, à écouter" />
              <Telephone src="codjo-rendez-vous" alt="Prendre rendez-vous, étape 3 sur 4 : les séances de vaccination avec les soleils qui comptent les jours et les places restantes" legende="Un rendez-vous en 4 étapes pour Sèna" />
              <Telephone src="codjo-carnet" alt="Carnet de Codjo : sa courbe de tension avec la limite 140/90 en pointillés rouges, et son comprimé du soir" legende="Sa courbe de tension" />
            </div>
            <div className="flex flex-col gap-6">
              <ol className="grid gap-5">
                <Etape numero={1} titre="L'accueil dit une chose à la fois">
                  Le comprimé du soir, à écouter en fon, puis « C&apos;est fait ». Le dernier mot compte : « Annuler » remet la prise à faire.
                </Etape>
                <Etape numero={2} titre="Un rendez-vous pour son petit-fils">
                  Pour qui, pour quoi, quel jour : les soleils disent dans combien de jours, avec les places restantes. Deux personnes pour la dernière place : une
                  seule l&apos;obtient.
                </Etape>
                <Etape numero={3} titre="Chez l'infirmier puis à la pharmacie">
                  Firmin mesure 180/110 : risque élevé, ordonnance. La pharmacie retrouve l&apos;ordonnance avec un code de 6 caractères, sans voir le dossier.
                </Etape>
              </ol>
              <Navigateur
                src="pharmacie"
                alt="Pharmacie : ordonnance retrouvée par le code M4R2TN, posologie dessinée matin, midi et soir, bouton Confirmer la délivrance"
                legende="La posologie dessinée ; la délivrance fait apparaître les prises dans le carnet."
              />
            </div>
          </div>
        </section>

        <section id="accompagnent" aria-labelledby="accompagnent-titre" className="scroll-mt-16 bg-white">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16">
            <div className="max-w-3xl">
              <h2 id="accompagnent-titre" className="text-3xl font-bold sm:text-4xl">
                Ceux qui accompagnent
              </h2>
              <p className="mt-2 text-lg text-gris">La sage-femme au centre, le relais dans les villages, la pharmacie en ville : chacun voit ce qui le concerne, pas plus.</p>
            </div>
            <Navigateur
              src="adjoa-alerte"
              alt="Poste « Aujourd'hui » de la sage-femme : l'alerte d'Awa, le travail a commencé, avec le compte à rebours de 15 minutes et « Je la prends en charge »"
              legende="Les alertes en haut, avec leur compte à rebours de 15 minutes ; un seul soignant peut la prendre en charge."
            />
            <div className="grid items-center gap-10 lg:grid-cols-[auto_1fr]">
              <div className="-mx-4 flex snap-x gap-6 overflow-x-auto px-4 pb-4 lg:mx-0 lg:px-0">
                <Telephone src="relais-tournee" alt="Tournée du relais Koffi : les foyers à voir d'abord, avec la raison de passer chez chacun" legende="La tournée par foyer" />
                <Telephone src="relais-visite" alt="Visite chez Afiavi sans réseau : À orienter vers le centre, note vocale de 3 secondes, tension 15 sur 9" legende="Une visite racontée au micro, sans réseau" />
              </div>
              <ul className="flex flex-col gap-4 text-lg">
                <li className="flex gap-3">
                  <Icone nom="hi-community-healthworker" className="size-8 shrink-0 text-marque" />
                  <span>
                    <b>Koffi, relais de Sèhoun</b> prépare sa tournée avec du réseau. Dans les villages, il note ses visites, les raconte au micro, inscrit un nouveau-né.
                  </span>
                </li>
                <li className="flex gap-3">
                  <Icone nom="ph-cloud-arrow-up" className="size-8 shrink-0 text-marque" />
                  <span>Tout part seul quand le réseau revient, sans doublon ; ce que le centre refuse reste à corriger, avec la raison.</span>
                </li>
                <li className="flex gap-3">
                  <Icone nom="hi-pregnant" className="size-8 shrink-0 text-marque" />
                  <span>La tension qu&apos;il a relevée chez Afiavi fait passer son risque à « élevé » chez la sage-femme, qui écoute sa note vocale.</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section id="etat" aria-labelledby="etat-titre" className="relative scroll-mt-16 overflow-hidden bg-nuit text-white">
          <Ondes className="-top-40 -left-40 size-[36rem] text-white opacity-5" />
          <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-16">
            <div className="max-w-3xl">
              <h2 id="etat-titre" className="text-3xl font-bold sm:text-4xl">
                Pour l&apos;État : piloter sans aucun nom
              </h2>
              <p className="mt-2 text-lg text-lavande-3">Les agents de la zone sanitaire et le ministère voient les mêmes indicateurs, à leur échelle, sans jamais une personne.</p>
            </div>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { icone: "ph-heartbeat" as NomIcone, texte: "Calculés en direct depuis les carnets : 4ᵉ consultation, naissances au centre, vaccins, tension, alertes." },
                { icone: "ph-shield-check" as NomIcone, texte: "Un chiffre qui porte sur moins de 5 personnes est masqué, à l'écran comme dans l'export." },
                { icone: "ph-chart-line-up" as NomIcone, texte: "Tendance sur 6 mois, classement des zones et zones à appuyer pour le ministère." },
                { icone: "ph-download-simple" as NomIcone, texte: "Export au format DHIS2, pour rejoindre le système national d'information sanitaire." },
              ].map((p) => (
                <li key={p.texte} className="flex flex-col gap-2 rounded-carte bg-white/5 p-4">
                  <Icone nom={p.icone} className="size-7 text-soleil" />
                  <p>{p.texte}</p>
                </li>
              ))}
            </ul>
            <div className="grid gap-8 lg:grid-cols-2">
              <Navigateur
                src="pilotage-zone"
                alt="Pilotage de la zone sanitaire Zogbodomey-Bohicon-Zakpota : 4ᵉ consultation 61 %, naissances au centre 95 %, Penta3 86 %, avec les objectifs"
                legende="Les agents de la zone sanitaire : les indicateurs en direct, commune par commune."
              />
              <Navigateur
                src="pilotage-ministere"
                alt="Vue nationale du ministère : classement des zones sanitaires pour le vaccin Penta3, tendance nationale et zones à appuyer"
                legende="Le ministère : toutes les zones, la tendance nationale, les zones à appuyer (données fictives)."
              />
            </div>
          </div>
        </section>

        <section aria-labelledby="principes" className="mx-auto max-w-6xl px-4 py-16">
          <h2 id="principes" className="text-3xl font-bold sm:text-4xl">
            Pensé pour tout le monde
          </h2>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PRINCIPES.map((p) => (
              <li key={p.titre} className="flex gap-4 rounded-carte bg-white p-5">
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-lavande-2 text-marque">
                  <Icone nom={p.icone} className="size-7" />
                </span>
                <div>
                  <b className="block text-lg">{p.titre}</b>
                  <p className="text-gris">{p.texte}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section id="capot" aria-labelledby="capot-titre" className="scroll-mt-16 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <h2 id="capot-titre" className="text-3xl font-bold sm:text-4xl">
              Sous le capot
            </h2>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {CAPOT.map((c) => (
                <li key={c.texte} className="flex gap-3 rounded-carte bg-lavande p-5">
                  <Icone nom={c.icone} className="size-7 shrink-0 text-marque" />
                  <p>{c.texte}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section aria-labelledby="essayer" className="relative overflow-hidden bg-marque text-white">
          <Ondes className="-right-32 -bottom-40 size-[30rem] text-white opacity-10" />
          <div className="relative mx-auto flex max-w-6xl flex-col items-start gap-5 px-4 py-16">
            <h2 id="essayer" className="text-3xl font-bold sm:text-4xl">
              Essayez les deux parcours
            </h2>
            <p className="max-w-2xl text-lg text-lavande-3">Un clic ouvre un compte de démonstration : Awa, Codjo, la sage-femme, le relais, la pharmacie, la zone sanitaire, le ministère.</p>
            <Link href="/demo" className="flex items-center gap-2 rounded-bouton bg-soleil px-5 py-3.5 text-lg font-bold text-nuit">
              Essayer la démo
              <Icone nom="ph-caret-right" className="size-5" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-gris">
        <div className="flex items-center gap-2">
          <Logo className="size-6" />
          <b className="text-nuit">{nom}</b>
        </div>
        <p>Toutes les personnes et données de la démonstration sont fictives. Valeurs médicales indicatives, à valider par des professionnels de santé.</p>
        <p>Challenge e-Santé Bénin 2026.</p>
      </footer>
    </div>
  );
}
