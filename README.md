# OMEGA — ETH Intelligence

Un terminal ETH/Hyperliquid, une stratégie Daily et un pilote local à signature déléguée. Interface sombre, graphique financier, carnet 3D, recherche historique et suivi du compte.

**[Ouvrir OMEGA](https://omega.kairos-labspro.chatgpt.site) · [Dépôt GitHub](https://github.com/SAMIRneo/OMEGA)**

Le site public est statique. Il observe le marché et permet la simulation ou la signature manuelle. L’automatisation continue demande le service Node sur un ordinateur actif et un agent autorisé par le wallet. Aucun moteur cloud permanent ni modèle IA entraîné n’est déployé. La présence d’un compte financé ou d’un pilote actif n’est jamais déduite du seul chargement de la page.

## Démarrer

Depuis la racine du dépôt, avec Node.js **22.12+** ; Node 24 a été utilisé pour les vérifications. Utiliser le gestionnaire npm déclaré par `package.json` et conserver `package-lock.json`.

```sh
npm ci
npm run dev
```

Ouvrir l’adresse affichée par Vite. Ce mode sert au développement du terminal et à la simulation navigateur.

Pour utiliser le service permanent :

```sh
npm run build
npm run bot
```

Ouvrir **http://127.0.0.1:8766/#pilot**. Le service démarre désarmé. Dans Bot, choisir le réseau, autoriser l’agent avec le wallet, puis démarrer le pilote. Mainnet comporte une autorisation explicite de fonds réels. Les modalités sont dans le [guide d’exploitation](docs/OPERATIONS.md).

## Trois modes, trois responsabilités

| Mode | Où il fonctionne | Conditions |
|---|---|---|
| Simulation | Navigateur, capital fictif de référence 10 000 USDC | Onglet visible ; journal propre à l’appareil et à l’origine |
| Exchange manuel | Navigateur + wallet, testnet/mainnet | Compte exchange, signature du levier puis du lot d’ordres |
| Pilote automatique | Service Node local, agent API, testnet/mainnet | Compte financé, agent autorisé, armement explicite, processus actif |

Les fonds testnet, le solde mainnet et le capital paper sont distincts. Fermer la page ne coupe pas le service Node ; arrêter le processus ou mettre l’ordinateur en veille interrompt sa surveillance. Les SL/TP déjà acceptés restent sur Hyperliquid. Aucun retrait/transfert n’est implémenté.

## Interface

- **Marché** : graphique TradingView Lightweight Charts, EMA, volume, carnet L2, profondeur 3D et horizons.
- **Bot** : Vue d’ensemble, Réglages et Activité. Diagnostic navigateur et état du service affichés séparément.
- **Compte** : positions, ordres et exécutions ; journal de simulation et export CSV.
- **Recherche** : replay récent 7/14 jours dans un Worker, coûts standard/renforcés, courbe et motifs de refus.

Les orbites sont illustratives. Le carnet 3D utilise les niveaux visibles, avec hauteur normalisée et valeurs exactes à l’inspection. Ces visuels ne mesurent pas une probabilité de gain.

## Mandat Daily

ETH perpétuel ; contexte 1 jour, tendance 1 heure, déclenchement 15 minutes. Au plus une tentative d’entrée par jour UTC pour le service, levier isolé ≤ ×15, allocation maximale de 50 % de l’équité. Plafond de perte **prévue** 500 USDC, budget automatique 450 USDC, stop 1,5 ATR et cible 3 ATR. Une journée peut rester sans entrée.

Les détails et différences entre les trois modes sont dans [STRATEGY.md](docs/STRATEGY.md). Ces budgets ne garantissent pas la perte maximale en cas de gap, panne ou liquidation. Aucune rentabilité n’est établie ; les tests logiciels ne constituent pas une validation de performance.

## Reprendre avec un autre agent

Donner à l’agent **le dépôt complet**, puis lui demander de commencer par [AGENTS.md](AGENTS.md). Le dépôt contient le contexte de travail ; il n’a pas besoin des conversations précédentes. Les identités, fonds et autorisations personnels restent à fournir par leur propriétaire au moment de l’exploitation.

| Besoin | Document |
|---|---|
| Ordre de lecture, index et responsabilités documentaires | [docs/README.md](docs/README.md) |
| Carte des fichiers, flux et contrats | [Architecture](docs/ARCHITECTURE.md) |
| Développer, tester, modifier une fonctionnalité | [Développement](docs/DEVELOPMENT.md) |
| Lancer, connecter, arrêter, diagnostiquer le service | [Exploitation](docs/OPERATIONS.md) |
| Comprendre les règles, unités et différences d’exécution | [Stratégie](docs/STRATEGY.md) |
| État réel, preuves et travaux restant à faire | [État du projet](docs/STATUS.md) |

Les anciens documents ont été déplacés dans `docs/archive/`. Ils n’ont pas autorité sur la version actuelle.

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
