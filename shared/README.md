# Moteur d’exécution partagé

Ce dossier est importé par le bot navigateur et le service Node. Il ne possède ni DOM, ni stockage, ni serveur HTTP.

| Module | Responsabilité |
|---|---|
| [engine.ts](engine.ts) | LiveEngine, état d’exécution et contrat Ledger ; checkpoints attendus avant transmission |
| [policy.ts](policy.ts) | Validation des données, réglages et plans ; réutilisation des règles canoniques de frontend/core |
| [authorization.ts](authorization.ts) | Durée explicite, noms des agents et réutilisation d’une préparation récente inutilisée |
| [ledger.ts](ledger.ts) | Validation pure du ledger, commune aux fichiers Node et au coffre web |
| [engine.test.ts](engine.test.ts) | Transports simulés, refus, interruptions, réservations et protections |

Les adaptateurs injectent lectures, transport signé, calcul de risque et sauvegarde synchrone/asynchrone. Ne pas importer le serveur Node ou un adaptateur navigateur ici. Les règles Daily, indicateurs, types et réseaux restent dans [frontend/core](../frontend/core/) pour conserver leur source canonique.

Voir [Architecture](../docs/ARCHITECTURE.md), [Stratégie](../docs/STRATEGY.md) et [Développement](../docs/DEVELOPMENT.md). Depuis la racine : `npm test`, ou `npm run check` pour une modification transversale.
