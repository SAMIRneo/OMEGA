# Backend Node optionnel

Service local sur **http://127.0.0.1:8766**, indépendant de l’onglet. Ce dossier ne contient pas une seconde stratégie : il adapte le [moteur partagé](../shared/README.md) aux transports, fichiers et processus Node.

| Module | Responsabilité |
|---|---|
| [server.ts](server.ts) | HTTP, authentification, Host/Origin, agents, nonces, verrou de processus et cycle de vie |
| [persistence.ts](persistence.ts) | Chargement validé et écriture atomique des ledgers ; copie précédente et permissions système |
| [runtime-risk.ts](runtime-risk.ts) | Chargement du WASM depuis le fichier généré du frontend |
| [persistence.test.ts](persistence.test.ts) | Redémarrage, corruption, génération précédente et échec d’écriture, en répertoires temporaires |

Depuis la racine : `npm run build` puis `npm run bot`. Le build Node est généré dans `runner-dist/`, le site dans `dist/`. Conserver le répertoire courant à la racine. Le processus démarre désarmé et ne possède aucun compte/agent autorisé par défaut.

Voir [Exploitation](../docs/OPERATIONS.md) pour l’API et l’installation, [Données](../docs/DATA.md) pour les fichiers personnels et [Développement](../docs/DEVELOPMENT.md) pour les contrôles. Ne pas lire, publier ou versionner les clés du répertoire runtime.
