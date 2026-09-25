# Déploiement sur Coolify

L'adresse finale sera `<nom>.kheios.com`. Tant que le nom n'est pas choisi, on utilise un sous-domaine provisoire (exemple : `sante.kheios.com`).

## 1. DNS
Chez le gestionnaire du domaine `kheios.com`, créer un enregistrement **A** : `sante` → adresse IP du serveur Coolify.

## 2. Base de données
Dans Coolify : **New Resource → Database → PostgreSQL 16**. Noter l'URL de connexion **interne** (`postgres://…`).

## 3. Application
**New Resource → Application → dépôt GitHub** du projet, branche `main`, **Build Pack : Dockerfile**, port **3000**.

- Domaine : `https://sante.kheios.com` (Coolify obtient le certificat HTTPS).
- Health check : chemin `/api/sante`.
- Variables d'environnement :

| Variable | Valeur | Remarque |
|---|---|---|
| `APP_URL` | `https://sante.kheios.com` | |
| `NEXT_PUBLIC_APP_NAME` | nom affiché | cocher « Build Variable » (lue à la construction) |
| `DATABASE_URL` | URL interne de l'étape 2 | |
| `CRON_SECRET` | résultat de `openssl rand -hex 32` | |
| `DEMO_MODE` | `true` | |
| `MIGRER_AU_DEMARRAGE` | `true` | |

- Activer le **déploiement automatique** à chaque envoi sur `main`.

## 4. Premier remplissage de la démo
Après le premier déploiement (les migrations s'appliquent au démarrage) :

```bash
curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://sante.kheios.com/api/demo/reinitialiser
```

La réponse contient le bilan (`comptes`, `foyers`, `patients`, `rendezVous`, `evenements`).

## 5. Changer de nom plus tard
1. Créer l'enregistrement DNS du nouveau sous-domaine.
2. Dans Coolify : changer le domaine, `APP_URL` et `NEXT_PUBLIC_APP_NAME`, puis redéployer.
