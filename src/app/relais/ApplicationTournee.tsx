"use client";

import { useOffline } from "next/offline";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Tournee } from "@/domain/tournee";
import { appliquerSaisiesLocales, texteEnAttente, type Refus, type SaisieEnAttente } from "@/offline/file";
import { stockageNavigateur, type NoteLocale } from "@/offline/stockage";
import { synchroniserFile, telechargerTournee, transportNavigateur } from "@/offline/synchronisation";
import { VueEnvoi } from "./VueEnvoi";
import { VueInscription } from "./VueInscription";
import { VueListe } from "./VueListe";
import { VueVisite } from "./VueVisite";

type Vue = { nom: "liste" } | { nom: "visite"; personneId: string } | { nom: "inscription" } | { nom: "envoi" };

const MESSAGES = {
  hors_ligne: "Pas de réseau : la tournée sera mise à jour au retour du réseau.",
  non_connecte: "Votre session a expiré : reconnectez-vous. Vos saisies restent sur ce téléphone.",
} as const;

/** La tournée tient sur le téléphone : on lit et on saisit sans réseau, la file part seule quand le réseau revient. */
export function ApplicationTournee({ relais }: { relais: string }) {
  const stockage = useMemo(() => stockageNavigateur(), []);
  const transport = useMemo(() => transportNavigateur(), []);
  const horsLigne = useOffline();
  const [tournee, setTournee] = useState<Tournee | null>(null);
  const [file, setFile] = useState<SaisieEnAttente[]>([]);
  const [refus, setRefus] = useState<Refus[]>([]);
  const [pret, setPret] = useState(false);
  const [vue, setVue] = useState<Vue>({ nom: "liste" });
  const [preparation, setPreparation] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [retour, setRetour] = useState<string | null>(null);
  const envoiEnCours = useRef(false);

  const lireContenu = useCallback(() => Promise.all([stockage.lire("tournee"), stockage.lire("file"), stockage.lire("refus")]), [stockage]);
  const appliquer = useCallback(([t, f, r]: [Tournee | null, SaisieEnAttente[], Refus[]]) => {
    setTournee(t);
    setFile(f);
    setRefus(r);
    setPret(true);
  }, []);
  const relire = useCallback(async () => appliquer(await lireContenu()), [lireContenu, appliquer]);

  const envoyer = useCallback(async () => {
    if (envoiEnCours.current) return;
    envoiEnCours.current = true;
    try {
      const bilan = await synchroniserFile(stockage, transport);
      if (bilan.nonConnecte) setMessage(MESSAGES.non_connecte);
    } finally {
      envoiEnCours.current = false;
      await relire();
    }
  }, [stockage, transport, relire]);

  // Au lancement, au retour du réseau, puis toutes les 30 secondes : la file part seule.
  useEffect(() => {
    void lireContenu().then(appliquer).then(envoyer);
    const relancer = () => void envoyer();
    window.addEventListener("online", relancer);
    const minuterie = window.setInterval(() => navigator.onLine && relancer(), 30_000);
    return () => {
      window.removeEventListener("online", relancer);
      window.clearInterval(minuterie);
    };
  }, [lireContenu, appliquer, envoyer]);

  async function preparer() {
    setPreparation(true);
    setMessage(null);
    await envoyer();
    const resultat = await telechargerTournee(stockage);
    if (resultat !== "ok") setMessage(MESSAGES[resultat]);
    await relire();
    setPreparation(false);
  }

  async function ajouter(saisies: SaisieEnAttente[], confirmation: string, note: NoteLocale | null = null) {
    const principale = saisies.find((s) => s.id === s.groupe) ?? saisies[saisies.length - 1]!;
    if (note) await stockage.ecrireNote(principale.id, note);
    await stockage.modifier("file", (f) => [...f, ...saisies]);
    setVue({ nom: "liste" });
    setRetour(confirmation);
    await relire();
    void envoyer();
  }

  async function retirerRefus(id: string) {
    await stockage.modifier("refus", (r) => r.filter((x) => x.saisie.id !== id));
    await relire();
  }

  async function avantDeconnexion(): Promise<string | null> {
    const enAttente = texteEnAttente(await stockage.lire("file"));
    if (enAttente) return `${enAttente}. Restez connecté jusqu'à leur envoi.`;
    await stockage.toutEffacer();
    return null;
  }

  const affichee = tournee ? appliquerSaisiesLocales(tournee, file) : null;
  const retourListe = () => {
    setRetour(null);
    setVue({ nom: "liste" });
  };

  if (vue.nom === "visite" && affichee) {
    for (const foyer of affichee.foyers) {
      const personne = foyer.personnes.find((p) => p.id === vue.personneId);
      if (personne) {
        return (
          <VueVisite
            key={personne.id}
            personne={personne}
            foyer={foyer}
            onRetour={retourListe}
            onEnregistrer={(saisies, note) => void ajouter(saisies, `Visite chez ${personne.prenom} notée.`, note)}
          />
        );
      }
    }
  }
  if (vue.nom === "inscription" && affichee) {
    return (
      <VueInscription
        foyers={affichee.foyers}
        foyerId={null}
        onRetour={retourListe}
        onInscrire={(saisie) => void ajouter([saisie], `${saisie.libelle} notée. Vous pouvez déjà la visiter.`)}
      />
    );
  }
  if (vue.nom === "envoi") {
    return <VueEnvoi file={file} refus={refus} horsLigne={horsLigne} onEnvoyer={() => void envoyer()} onRetirer={(id) => void retirerRefus(id)} onRetour={retourListe} />;
  }
  return (
    <VueListe
      relais={relais}
      tournee={affichee}
      pret={pret}
      enAttente={texteEnAttente(file)}
      aCorriger={refus.length}
      horsLigne={horsLigne}
      preparation={preparation}
      message={message}
      retour={retour}
      onPreparer={() => void preparer()}
      onVisiter={(personneId) => {
        setRetour(null);
        setVue({ nom: "visite", personneId });
      }}
      onInscrire={() => {
        setRetour(null);
        setVue({ nom: "inscription" });
      }}
      onEnvoi={() => {
        setRetour(null);
        setVue({ nom: "envoi" });
      }}
      avantDeconnexion={avantDeconnexion}
    />
  );
}
