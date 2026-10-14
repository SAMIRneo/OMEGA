# AXIOM — ETH Intelligence

**Un terminal de recherche et un algorithme Daily sur ETH / Hyperliquid.**

[Ouvrir le site public](https://btc-atelier.kairos-labspro.chatgpt.site) · [Code source](https://github.com/SAMIRneo/bot)

AXIOM cherche une entrée intraday conforme à un ensemble de règles et à un budget de risque. Il observe le marché, décrit le contexte, propose un candidat et peut l’exécuter **en simulation uniquement**. Le portefeuille Hyperliquid reste en lecture seule. Aucun ordre réel, transfert, signature, modèle IA entraîné ou garantie de rendement.

## Mandat retenu

| Paramètre | Règle implémentée |
|---|---|
| Marché | ETH perpétuel, données Hyperliquid |
| Capital initial de référence | 10 000 USDC fictifs |
| Marge par entrée | 50 % du capital disponible avant frais, arrondie au centime inférieur |
| Nombre d’entrées | **Une au maximum par jour UTC**, manuelle ou automatique |
| Levier | Entier de ×1 à ×15, sous le plafond utilisateur et celui de l’exchange |
| Perte prévue au stop | Maximum **500 USDC**, frais et slippage de sortie hypothétiques inclus |
| Budget automatique | Réserve de 10 % : le candidat vise au plus 450 USDC de perte prévue |
| Limite quotidienne de perte | 500 USDC, comptabilité UTC |
| Sortie | Stop 1,5 ATR, objectif 3 ATR, ratio gain/risque net ≥ 1,5 |
| Fenêtre d’entrée | Avant 23:30 UTC |
| Fin de journée | Clôture visée dès 23:55 UTC, au prochain prix frais observé |

La marge de 50 % n’est **pas** une perte maximale de 50 %. Au capital initial et à ×15, l’exposition peut atteindre 75 000 USDC. Le levier automatique baisse si nécessaire pour respecter le budget du stop ; la marge n’est pas réduite discrètement. Si même ×1 ne convient pas, aucune entrée.

Un jour peut rester sans trade. L’algorithme ne connaît pas à l’avance le plus bas, le plus haut ou la meilleure variation de la journée. L’exécution actuelle sélectionne le premier setup satisfaisant les règles sur une nouvelle clôture, pas un optimum futur.

## État réel du projet

- **Opérationnel en simulation** : terminal, consultation wallet, contrôleur Daily, gestion des limites, journal, export CSV, contrôles du risque Rust/WASM.
- **Stratégie de recherche** : aucune rentabilité de la version Daily n’est établie. Les tests logiciels ne sont pas un backtest de performance.
- **Exécution réelle non intégrée** : aucune clé de signature et aucune méthode d’ordre exchange. Le scénario de 10 000 $ réels est une cible de conception, pas un compte financé ni un mandat d’exécution actif.
- **Fonctionnement web dépendant de l’onglet** : iOS et les navigateurs peuvent suspendre la page. Le contrôleur automatique reste dans le navigateur, y compris avec le moteur Python local. Le serveur local peut continuer à surveiller les stops tant qu’il tourne.

## Décision Daily

Le moteur examine uniquement une **nouvelle bougie 15 min clôturée** après l’armement. Aucun signal déjà présent au démarrage ni bougie manquée pendant une suspension n’est exécuté.

1. **Données** : carnet récent ; historiques 15 min, 1 h et 1 jour disponibles, récents et clôturés ; métadonnées ETH disponibles.
2. **Contexte** : clôture daily au-dessus/sous EMA20 ; tendance 1 h concordante ; structure EMA20/50 en 15 min dans le même sens.
3. **Déclenchement** : cassure des niveaux des 20 bougies précédentes avec volume relatif ≥ 1,2, ou reprise de l’EMA20 après franchissement. RSI dans une zone conventionnelle du modèle.
4. **Classement** : score explicite fondé sur le contexte, la famille, le volume relatif, le signe de l’histogramme MACD et la VWAP glissante. Seuil 80/100. **Ce score n’est pas une probabilité de gain** ; les indicateurs de prix sont corrélés.
5. **Risque** : marge 50 %, stop 1,5 ATR et cible 3 ATR. Choix du plus haut levier entier sous le plafond configuré qui respecte le budget automatique. Contrôle des frais et du ratio gain/risque net.
6. **Validation finale** : le moteur recontrôle quota, capital, fraîcheur, levier, profondeur visible et perte prévue avant de persister la position.

Les paramètres des règles sont des hypothèses à tester. MACD, RSI, EMA, ATR ou VWAP ne sont pas déclarés « meilleurs indicateurs ». Aucune donnée macro, actualité, funding futur ou liquidité invisible n’est inventée.

## Interface

- **Terminal** : graphique professionnel avec TradingView Lightweight Charts™, zoom tactile, crosshair, chandeliers/courbe, EMA et volume, carnet L2, horizons et flux observé.
- **Decision core** : carte interactive des RSI par horizon, gates et événements du contrôleur. La géométrie du tore est illustrative ; elle n’est ni un réseau neuronal ni une preuve de confiance.
- **Pilotage** : mandat Daily, quota 0/1, plafond de levier, candidat et raisons de refus, armement/arrêt et simulation manuelle.
- **Portefeuille** : compte perp réel en lecture seule, positions tous actifs, ordres et dernières exécutions ETH. Saisir l’adresse du compte Hyperliquid, pas celle d’un agent API.
- **Journal** : positions fictives clôturées, coûts, statistiques descriptives, activité et export CSV.

## Architecture et technologies

| Composant | Technologie | Source |
|---|---|---|
| Règles Daily, contrats, contrôleur | TypeScript strict | `frontend/core/` |
| Graphique financier | TradingView Lightweight Charts 5.2.1 + TypeScript | `frontend/charts/market-chart.ts` |
| Build et distribution | Vite 8.3.4, TypeScript 7.0.2 | `vite.config.ts`, `tsconfig.json` |
| Tests des règles | Vitest 5.0.4 | `frontend/core/daily.test.ts` |
| Perte prévue et dimensionnement | Rust → WebAssembly | `rust-core/`, `frontend/legacy/risk-core.js` |
| Données web, rendu DOM, visualisation | JavaScript conservé et intégré au build | `frontend/legacy/` |
| Serveur local et validation finale | Python, TA-Lib, websocket-client | `app.py`, `engine.py`, `analysis.py` |

La migration est ciblée : les nouveaux contrats, règles et graphiques sont typés. Le projet n’est pas entièrement réécrit en Rust ou TypeScript. Les anciens dossiers `public/` et `web/` ont été remplacés par une source canonique `frontend/`. `dist/` est généré et ignoré dans ce dépôt GitHub.

Le build découpe les adaptateurs navigateur/local et le contrôleur en modules, minifie CSS/JS et produit des noms d’assets avec empreinte. Le graphique utilise des mises à jour incrémentales et conserve son zoom lors des actualisations. Les dépendances sont verrouillées dans `package-lock.json`.

## Installation et build

Node.js 22.12+ recommandé ; build vérifié avec Node.js 24. Rust n’est pas requis pour ouvrir l’application : le module WASM généré est versionné.

```sh
npm ci
npm run build
npm run dev
```

Le contenu de `dist/` peut être publié sur un hébergement HTTPS statique. Le site public conserve son URL historique `btc-atelier` pour préserver les liens, mais son identité et son périmètre sont AXIOM / ETH.

### Moteur Python local

```powershell
Copy-Item config.example.json config.json
python -m pip install -r requirements.txt
npm ci
npm run build
python app.py
```

Ouvrir http://127.0.0.1:8765. Renseigner l’adresse publique dans `config.json`. Le serveur sert le même build et active l’adaptateur local. Pour une ancienne configuration sans `profile: axiom-daily-v1`, l’application reprend le nouveau mandat et conserve l’adresse, le réseau et les paramètres de source/coûts. Le fichier personnel n’est pas écrasé.

Le serveur écoute sur 127.0.0.1 et contrôle Host/Origin. Mutations authentifiées par un jeton local renouvelé au lancement. `config.json`, `data/` et les jetons sont ignorés par Git. L’adresse peut être changée en mémoire depuis l’interface ; aucune clé privée n’est demandée.

### Rust

```sh
rustup target add wasm32-unknown-unknown
cargo test --manifest-path rust-core/Cargo.toml
node scripts/build-rust.mjs
npm run build
```

Le script met à jour `frontend/legacy/risk-core.js`, qui embarque le binaire WebAssembly. Si le module ne charge pas, les entrées du navigateur sont bloquées. Le contrôleur l’utilise pour évaluer le risque ; Python revalide indépendamment l’exécution locale.

## Persistance et limites des modèles

| | Navigateur public | Moteur local |
|---|---|---|
| Compte fictif Daily | localStorage `axiom-eth-daily-paper-v1` | `data/axiom-daily-paper.json` |
| Quota | Persisté sur cet appareil, verrou Web Locks | Persisté côté serveur, verrou du moteur |
| Stops | Page visible, carnet récent | Processus Python actif, carnet récent |
| Funding / liquidation | Non modélisés | Funding estimé, liquidation isolée approximative |
| Wallet | REST public, mémorisation facultative de l’adresse | Adresse de configuration ou mémoire |
| Contrôleur Daily | Onglet actif | Onglet actif pour les entrées |

Les éditions et appareils ne synchronisent pas leur simulation. Effacer localStorage efface les résultats et le quota de cet appareil : ce n’est pas une garantie globale contre plusieurs ordres réels. Les anciens historiques BTC/ETH ne sont pas réutilisés pour le mandat Daily.

Frais hypothétiques 4,5 bps et slippage 2 bps par côté. Exécution sur la profondeur visible, pas un modèle complet d’impact. Les stops s’exécutent au prochain prix frais observé : un gap peut dépasser 500 USDC. La fermeture de fin de journée n’est pas assurée si le moteur, la page ou le flux est arrêté. Les mouvements pendant l’arrêt ne sont pas reconstruits. Les résultats TA-Lib et JavaScript peuvent différer.

## API et agent local

MCP stdio : `eth_state`, `eth_candles`, `paper_open`, `paper_close`. L’agent est à configurer séparément ; aucun fournisseur IA n’est branché automatiquement. Les limites Daily s’appliquent aussi à une entrée manuelle ou provenant d’un agent.

HTTP : `GET /api/state`, `/api/health`, `/api/candles`, `/api/session`. `POST /api/paper/open`, `/api/paper/close`, `/api/account`, `/api/settings` demandent le jeton local. Un changement de levier est refusé si une position est ouverte.

## Vérification

```sh
npm run typecheck
npm test
npm run test:browser
npm run build
python -m unittest discover -s tests -v
cargo test --manifest-path rust-core/Cargo.toml
```

Les tests couvrent notamment les deux sens de marché, la marge de 50 %, le levier adaptatif, le budget, le quota après clôture/rechargement, les données anciennes/non clôturées, l’absence de signal, les frais et la fermeture observée de fin de journée. Les tests historiques Python existants sont exploratoires et distincts du nouveau Daily. **Aucun résultat de backtest Daily n’est revendiqué.** Le rendu final Safari/iPhone reste à vérifier sur appareil.

## Avant un éventuel passage au réel

Il reste à construire et valider : jeu de données historique horodaté, backtests sans anticipation avec coûts réalistes, validation chronologique hors échantillon et tests de sensibilité, suivi paper continu, service permanent, registre transactionnel des ordres/quota commun à tous les clients, réconciliation exchange, ordres stop reduce-only côté exchange, gestion des rejets et fills partiels, circuit d’arrêt et signature serveur via autorisation dédiée. Ce sont des travaux futurs ; le site actuel n’exécute pas le compte réel.

## Sources et licences

- Hyperliquid : https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/info-endpoint
- TradingView Lightweight Charts : https://tradingview.github.io/lightweight-charts/docs
- Vite : https://vite.dev/guide/
- Notices et licence : `THIRD_PARTY_NOTICES.md`, `licenses/`.

Les notes techniques dans `docs/` antérieures à AXIOM sont historiques. Ce README décrit l’état courant.
