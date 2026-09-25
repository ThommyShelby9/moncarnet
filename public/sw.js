// Service worker de Mon Carnet : les pages déjà ouvertes et les fichiers de l'application restent disponibles sans réseau.
// Les appels à l'API ne passent jamais par le cache : la file d'envoi du relais s'en charge (src/offline).
const VERSION = "v1";
const CACHE_PAGES = "mc-pages"; // effacé à la déconnexion (src/ui/BoutonDeconnexion.tsx)
const CACHE_FICHIERS = `mc-fichiers-${VERSION}`;
const PAGE_HORS_LIGNE = "/hors-ligne.html";

self.addEventListener("install", (evenement) => {
  evenement.waitUntil(
    caches
      .open(CACHE_FICHIERS)
      .then((cache) => cache.add(PAGE_HORS_LIGNE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (evenement) => {
  evenement.waitUntil(
    caches
      .keys()
      .then((cles) => Promise.all(cles.filter((c) => c.startsWith("mc-fichiers-") && c !== CACHE_FICHIERS).map((c) => caches.delete(c))))
      .then(() => self.clients.claim()),
  );
});

const estFichierStatique = (url) => url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/");

self.addEventListener("fetch", (evenement) => {
  const requete = evenement.request;
  if (requete.method !== "GET") return;
  const url = new URL(requete.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;
  if (requete.mode === "navigate") evenement.respondWith(reseauDabord(requete));
  else if (estFichierStatique(url)) evenement.respondWith(cacheDabord(requete));
});

/** Pages : le réseau d'abord (toujours à jour), la copie gardée sans réseau. */
async function reseauDabord(requete) {
  try {
    const reponse = await fetch(requete);
    if (reponse.ok && !reponse.redirected) {
      const copie = reponse.clone();
      caches.open(CACHE_PAGES).then((cache) => cache.put(requete, copie));
    }
    return reponse;
  } catch {
    const gardee = await caches.match(requete, { cacheName: CACHE_PAGES });
    return gardee ?? (await caches.match(PAGE_HORS_LIGNE)) ?? Response.error();
  }
}

/** Fichiers de l'application : leur nom change à chaque version, la copie gardée suffit. */
async function cacheDabord(requete) {
  const gardee = await caches.match(requete);
  if (gardee) return gardee;
  const reponse = await fetch(requete);
  if (reponse.ok) {
    const copie = reponse.clone();
    caches.open(CACHE_FICHIERS).then((cache) => cache.put(requete, copie));
  }
  return reponse;
}
