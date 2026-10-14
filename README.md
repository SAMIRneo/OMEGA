# ETH Atelier

**Terminal ETH / Hyperliquid, portefeuille réel en lecture seule et bot de simulation pilotable.** Interface de terminal noir / magenta / vert, onglets compacts, visualisation centrale des horizons et instrumentation de marché. Noyau de calcul du risque en Rust, compilé en WebAssembly et utilisé pour les entrées navigateur et la taille du bot. Aucune clé privée, signature, transaction ou exécution réelle.

- **Site public : https://btc-atelier.kairos-labspro.chatgpt.site** — le lien existant reste inchangé ; l’application concerne désormais ETH.
- **Source : https://github.com/SAMIRneo/bot**

## Deux éditions, une interface

| | Web public (`public/`) | Serveur local (`web/` + Python) |
|---|---|---|
| Marché | ETH mainnet, REST + WebSocket directs | ETH, réseau de `config.json` |
| Indicateurs | JavaScript, bougies clôturées | TA-Lib, bougies clôturées |
| Wallet | Adresse saisie, mémorisation locale facultative | Adresse de `config.json`, changement en mémoire via interface |
| Compte fictif | localStorage `eth-atelier-web-paper-v2` | `data/paper-eth.json` |
| Stops simulés | Page visible + flux frais | Processus Python actif + flux frais |
| Bot automatique | Contrôleur dans l’onglet | Même contrôleur dans l’onglet |
| Funding / liquidation | Non modélisés | Funding estimé, liquidation approximative |
| MCP / recherche avancée | Non disponibles | Passerelle MCP, recherche et backtests exploratoires |

Les anciens fichiers BTC et leur localStorage ne sont pas réutilisés pour ETH. **Ne pas copier une position BTC dans `paper-eth.json`.** Les éditions ne synchronisent pas leur compte fictif.

## Interface

1. **Terminal** : ETH/USDC perp, variation 24 h, funding horaire, volume, carnet L2, graphique 7 horizons, EMA20/50, RSI, ATR, MACD et flux observé 60 s. Horizons périmés signalés.
2. **Pilotage** : démarrer/arrêter les entrées automatiques simulées, voir les règles, les limites et la position ; ouvrir/fermer une simulation manuelle.
3. **Portefeuille** : valeur du compte perp, marge, disponible au retrait, positions réelles tous actifs, ordres et dernières exécutions ETH. Adresse réelle du compte ou sous-compte, pas celle d’un agent API. Pas de wallet personnel embarqué dans le site public.
4. **Journal** : historique fictif, P&L net, statistiques descriptives, export CSV et événements du contrôleur.

## Bot simulé : règles exactes

Désactivé à chaque chargement. Le bouton Démarrer arme l’observation des **nouvelles** bougies 5 min clôturées, sans exécuter le signal présent au démarrage. Un croisement EMA20/50 doit être confirmé par la tendance 1 h concordante. Stop à 1,5 ATR ; objectif à 3 ATR. La marge est calculée sous les limites de capital, marge et risque (budget automatique à 90 % du plafond pour une réserve de coûts), puis le moteur revalide l’exécution sur la profondeur visible.

Une seule position, une évaluation par bougie et par navigateur, via Web Locks. Historique 5 min et 1 h récent et carnet frais requis. Pas de rattrapage après suspension ou déconnexion prolongée. Arrêter le bot arrête les entrées ; la position existante reste surveillée selon le moteur. Fermer la page arrête le contrôleur ; iOS peut la suspendre en arrière-plan. L’activation n’est jamais persistée.

**Ce n’est pas une stratégie validée.** Aucun rendement, taux de réussite futur ou probabilité n’est promis. Les règles ne constituent pas un conseil d’investissement.

## Paramètres par défaut

50 USDC fictifs, levier **×10**, marge maximale 5 USDC, risque prévu au stop maximal 1 USDC, limite quotidienne de perte 5 USDC (UTC). Frais hypothétiques 4,5 bps et slippage 2 bps par côté. Le moteur contrôle le plafond de levier renvoyé par Hyperliquid ; ETH était à ×25 lors de la vérification du 14 octobre 2026. Le plafond de l’exchange peut évoluer.

Les stops s’exécutent au prochain prix observé : un saut de prix peut dépasser le risque prévu. Les mouvements pendant l’arrêt ne sont pas reconstitués. Le navigateur ne simule ni funding ni liquidation. Une source ouverte ne prouve pas sa fraîcheur : âge des données contrôlé avant les actions.

## Lancer le moteur Python

```powershell
git clone https://github.com/SAMIRneo/bot.git
cd bot
Copy-Item config.example.json config.json
python -m pip install -r requirements.txt
python app.py
```

Ouvrir http://127.0.0.1:8765. Remplacer l’adresse d’exemple par le compte public Hyperliquid à consulter dans `config.json`. Ce fichier reste ignoré par Git. Pour une installation BTC existante, conserver l’adresse et remplacer le levier 40 par **10** ; le nouveau stockage ETH est indépendant. `start.ps1` lance également le serveur.

Le serveur écoute seulement sur 127.0.0.1 et contrôle Host/Origin. Mutations authentifiées avec un jeton local renouvelé à chaque lancement dans `data/agent-token.txt` (ignoré par Git). Aucun accès de la version publique au serveur local.

## Agent local / MCP

`mcp-config.example.json` décrit la passerelle stdio. Outils : `eth_state`, `eth_candles`, `paper_open`, `paper_close`. Les anciens noms `btc_state` / `btc_candles` ont été remplacés : mettre à jour les clients. Aucun fournisseur de modèle ni agent externe n’est connecté automatiquement.

HTTP : `GET /api/state`, `/api/health`, `/api/candles`, `/api/session`. `POST /api/paper/open`, `/api/paper/close`, `/api/account` requièrent le jeton local. `/api/account` modifie l’adresse en mémoire sans écraser le fichier personnel.

Les backtests Python sont exploratoires et séparés du nouveau contrôleur navigateur. Ils ne constituent pas une validation de ses performances. Documentation technique antérieure conservée dans `docs/` ; ce README et `docs/ETH_V2.md` décrivent l’interface actuelle.

## Héberger l’édition publique

Servir le contenu de `public/` sur un hébergement HTTPS statique (Sites, GitHub Pages, etc.). Pas de build, CDN, compte fictif partagé ou secret serveur. L’adresse publique peut être mémorisée uniquement si l’utilisateur coche l’option sur son appareil. Les requêtes de compte vont à Hyperliquid ; déconnexion efface cette préférence.

Sources API : https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/info-endpoint et https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/websocket/subscriptions

## Vérification

```sh
python -m unittest discover -s tests -v
node --test tests/browser.test.cjs
node --check public/ui.js
node --check public/pilot.js
node --check public/browser-engine.js
```

Le rendu visuel sur Safari/iPhone reste à vérifier sur appareil réel. L’interface prévoit des champs 16 px sur mobile, zones tactiles, safe areas, défilement horizontal des tableaux et réduction des animations selon les préférences système.

## Rust / WebAssembly

`rust-core/` contient un module Rust sans dépendance : perte planifiée après frais/slippage et taille de marge sous les plafonds. Le navigateur bloque les entrées si le module ne charge pas. Le contrôleur automatique utilise sa taille calculée dans les deux éditions. Le transport et l’interface restent en JavaScript ; le serveur local et sa validation finale restent en Python. Le projet n’est pas entièrement migré en Rust.

```sh
rustup target add wasm32-unknown-unknown
cargo test --manifest-path rust-core/Cargo.toml
node scripts/build-rust.mjs
```

Le build génère `public/risk-core.js` et `web/risk-core.js`, qui embarquent le binaire WebAssembly. Aucun secret ni accès exchange dans le module. Le fichier généré est versionné pour ouvrir le site sans installer Rust.

## Interface v5 — référence decision terminal

Terminal dense avec compte fictif, graphique ETH, carnet, carte tridimensionnelle des RSI par horizon, gates d’entrée et événements du contrôleur. La topologie du tore est illustrative : ses couleurs sont les RSI calculés ; ce n’est ni un réseau neuronal ni un score de confiance. Glisser pour tourner, toucher un horizon pour le sélectionner, bouton Pause et respect du mouvement réduit. Le dessin est suspendu hors écran et quand le document est masqué.

Le panneau de volume signe le volume de bougie selon la variation open/close : approximation explicitement séparée du delta des transactions WebSocket. La courbe RSI Wilder utilise les bougies clôturées. Aucun P&L, taux de réussite, latence, score IA ou flux macro fictif n’est affiché. Les gates sont des vérifications observées, pas une probabilité ou une assurance de passage d’ordre.
