# OMEGA — ETH Intelligence

Un terminal ETH/Hyperliquid, une stratégie Daily et un pilote à signature déléguée utilisable depuis le lien. Cockpit inspiré de la référence ALPHA, thèmes sable et or/noir, graphique financier, profondeur cumulée, recherche historique et suivi du compte.

**[Ouvrir OMEGA](https://omega.kairos-labspro.chatgpt.site) · [Dépôt GitHub](https://github.com/SAMIRneo/OMEGA)**

Le site public exécute le bot dans ton navigateur tant que l’onglet reste ouvert et visible. MetaMask autorise deux agents distincts ; leurs clés sont conservées chiffrées sur cet appareil. Aucun moteur de trading cloud permanent ni modèle IA entraîné n’est déployé. Le service Node reste une option pour fonctionner indépendamment de l’onglet.

## Démarrer depuis le lien

Ouvrir **[Bot OMEGA](https://omega.kairos-labspro.chatgpt.site/#pilot)** avec MetaMask. Connecter le compte, configurer Testnet + Mainnet (une signature par réseau manquant, 180 jours maximum), choisir les réglages, puis démarrer explicitement le bot. Mainnet exige le consentement aux fonds réels. Au retour, le même compte et les agents valides sont repris sans nouvelle signature ; recharger exige seulement de redémarrer explicitement le bot. Garde l’onglet visible et l’appareil éveillé ; aucun rattrapage après une absence. Le [guide web](docs/WEB.md) décrit le coffre, les interruptions et les limites.

Pour développer le projet :

Depuis la racine du dépôt, avec Node.js **22.12+** ; Node 24 a été utilisé pour les vérifications. Utiliser le gestionnaire npm déclaré par `package.json` et conserver `package-lock.json`.

```sh
npm ci
npm run dev
```

Ouvrir l’adresse affichée par Vite. Ce mode sert au développement du terminal, de la simulation et du bot web. Il ne lance pas le service Node optionnel.

Pour utiliser le service Node optionnel :

```sh
npm run build
npm run bot
```

Ouvrir **http://127.0.0.1:8766/#pilot**. Le service démarre désarmé. Dans Bot, connecter MetaMask puis configurer Testnet et Mainnet ensemble : une signature par réseau manquant, valable 180 jours maximum et révocable. Le compte est mémorisé sur ce navigateur et les agents encore autorisés sont réutilisés avec leur expiration actuelle. Le verrouillage conserve ce lien ; un changement de chaîne EVM ne l’efface plus. Choisir ensuite le réseau et démarrer le pilote. Mainnet comporte une autorisation explicite de fonds réels. Les modalités sont dans le [guide d’exploitation](docs/OPERATIONS.md).

## Modes d’exécution

| Mode | Où il fonctionne | Conditions |
|---|---|---|
| Simulation | Navigateur, capital fictif de référence 10 000 USDC | Onglet visible ; journal propre à l’appareil et à l’origine |
| Exchange manuel | Navigateur + wallet, testnet/mainnet | Compte exchange, signature du levier puis du lot d’ordres |
| Bot web | Page publiée, agent chiffré, testnet/mainnet | Onglet visible, appareil éveillé, armement explicite |
| Pilote Node | Service Node local, agent API, testnet/mainnet | Compte financé, agent autorisé, armement explicite, processus actif |

Les fonds testnet, le solde mainnet et le capital paper sont distincts. Fermer ou masquer la page arrête les nouvelles entrées du bot web. Fermer la page ne coupe pas le service Node ; arrêter le processus ou mettre l’ordinateur en veille interrompt sa surveillance. Les SL/TP déjà acceptés restent sur Hyperliquid. Aucun retrait/transfert n’est implémenté.

## Interface

- **Cockpit** : capital simulé ou compte perpétuel consulté, courbe locale par période, état confirmé du bot, position ETH, diagnostic Daily, jauges de risque et dernières décisions. Le choix du capital affiché ne change jamais le mode d’exécution.
- **Marché** : graphique TradingView Lightweight Charts, EMA, volume, carnet L2, profondeur cumulée et horizons.
- **Bot** : connexion regroupée en trois étapes visibles (Compte → Autorisation → Démarrage), choix Testnet/Mainnet et une action principale adaptée à l’état confirmé. Suivi, Réglages et Activité ; les commandes utilisent le runtime web ou Node selon l’origine.
- **Compte** : positions, ordres et exécutions ; journal de simulation, export CSV et panneau Données avec export JSON vérifiable.
- **Lab / Recherche** : replay récent 7/14 jours dans un Worker, coûts standard/renforcés, courbe et motifs de refus.

La courbe de profondeur cumule les douze premiers niveaux visibles de chaque côté. Elle décrit le carnet, sans prédiction de prix.

## Mandat Daily

ETH perpétuel ; contexte 1 jour, tendance 1 heure, déclenchement 15 minutes. Jusqu’à **4 tentatives par jour UTC**, une position à la fois, pause de 30 min après entrée/sortie, arrêt des entrées après deux pertes consécutives. Objectif journalier sélectionnable **100 / 200 / 500 USDC**, par défaut 200 : il met les nouvelles entrées en pause une fois atteint en P&L réalisé, sans garantir ce résultat.

Taille adaptée au stop : perte automatique prévue ≤ min(100 USDC, 1 % de l’équité, 90 % du budget de perte restant). Marge ≤ 50 %, levier isolé ≤ ×15, stop 1,5 ATR et cible 3 ATR, ratio net ≥ 1,5. La limite de pertes réalisées du jour reste 500 USDC. Une journée peut rester sans entrée ou finir négative.

Les détails et différences entre les modes sont dans [STRATEGY.md](docs/STRATEGY.md). Ces budgets ne garantissent pas la perte maximale en cas de gap, panne ou liquidation. Aucune rentabilité n’est établie ; les tests logiciels ne constituent pas une validation de performance.

## Organisation du dépôt

| Dossier | Rôle |
|---|---|
| [frontend/](frontend/README.md) | Interface, adaptateurs navigateur, simulation et règles pures canoniques |
| [shared/](shared/README.md) | Moteur d’exécution, politique et validation du ledger partagés web/Node |
| [runner/](runner/README.md) | Backend Node optionnel : HTTP, fichiers, nonces et cycle de processus |
| `rust-core/` | Noyau de calcul du risque et source du WASM généré |
| `tests/`, `scripts/` | Contrôles VM/Python, fixtures et outils de build/vérification |
| [docs/](docs/README.md) | Documentation de la version actuelle |

Les points d’entrée Python restent à la racine pour compatibilité. `dist/` et `runner-dist/` sont générés ; les données personnelles sont exclues du dépôt.

## Reprendre avec un autre agent

Donner à l’agent **le dépôt complet**, puis lui demander de commencer par [AGENTS.md](AGENTS.md). Le dépôt contient le contexte de travail ; il n’a pas besoin des conversations précédentes. Les identités, fonds et autorisations personnels restent à fournir par leur propriétaire au moment de l’exploitation.

| Besoin | Document |
|---|---|
| Ordre de lecture, index et responsabilités documentaires | [docs/README.md](docs/README.md) |
| Carte des fichiers, flux et contrats | [Architecture](docs/ARCHITECTURE.md) |
| Développer, tester, modifier une fonctionnalité | [Développement](docs/DEVELOPMENT.md) |
| Tout configurer et lancer depuis la page | [Mode web](docs/WEB.md) |
| Lancer, connecter, arrêter, diagnostiquer le service | [Exploitation](docs/OPERATIONS.md) |
| Garanties et limites mainnet/testnet | [Réseaux](docs/NETWORKS.md) |
| Comprendre les règles, unités et différences d’exécution | [Stratégie](docs/STRATEGY.md) |
| État réel, preuves et travaux restant à faire | [État du projet](docs/STATUS.md) |
| Conservation des données, export et récupération | [Données et sauvegardes](docs/DATA.md) |
| Constats, corrections et limites de l’audit technique | [Audit du 17 octobre](docs/AUDIT.md) |

Une seule version de référence : la branche `main` de ce dépôt. Les anciennes branches et copies de documentation ont été retirées.

## Vérifier

```sh
npm run check
```

Cette commande vérifie la documentation, les tests frontend/moteur navigateur, les builds typés et l’API du service dans un environnement temporaire sans autorisation exchange. Pour une modification documentaire seule : `npm run check:docs`.

Les vérifications Python et Rust sont séparées et nécessitent leurs toolchains ; voir [DEVELOPMENT.md](docs/DEVELOPMENT.md). Le rendu iPhone/Safari et les ordres signés sur un compte financé restent à valider. Les preuves datées sont dans [STATUS.md](docs/STATUS.md).

## Technologie et compatibilité

TypeScript, JavaScript, CSS, Vite, Lightweight Charts, SDK Hyperliquid, viem, Node et Rust/WASM. Le moteur Python/MCP est conservé à la racine pour compatibilité ; il utilise le port 8765 et reste paper-only. Le service Node automatique utilise le port 8766.

Les clés historiques `axiom-*` sont conservées pour éviter une réinitialisation implicite des données navigateur. Les répertoires générés et personnels sont ignorés par Git. Ni une clé privée ni un portefeuille personnel ne sont requis pour lancer les tests.

## Références et licences

[API Hyperliquid](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api) · [Lightweight Charts](https://tradingview.github.io/lightweight-charts/docs) · [Notices tierces](THIRD_PARTY_NOTICES.md).

Ce dépôt ne déclare actuellement pas de licence globale pour son propre code ; les notices tierces ne valent pas licence de l’ensemble du projet.
