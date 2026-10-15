# OMEGA — ETH Intelligence

**Un terminal de recherche et un algorithme Daily sur ETH / Hyperliquid.**

[Ouvrir le site public](https://omega.kairos-labspro.chatgpt.site) · [Code source](https://github.com/SAMIRneo/OMEGA)

OMEGA cherche une entrée intraday conforme à un ensemble de règles et à un budget de risque. Il observe le marché, décrit le contexte, propose un candidat et peut l’exécuter **en simulation uniquement**. Le portefeuille Hyperliquid reste en lecture seule. Aucun ordre réel, transfert, signature, modèle IA entraîné ou garantie de rendement.

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

Le contenu de `dist/` peut être publié sur un hébergement HTTPS statique. Le site public est publié sous le nom OMEGA, à l’adresse `https://omega.kairos-labspro.chatgpt.site`.

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

Frais hypothétiques 4,5 bps et slippage 2 bps par côté. Exécution sur la profondeur visible, pas un modèle complet d’impact. Les stops s’exécutent au prochain prix frais observé : un gap peut dépasser 500 USDC. La fermeture de fin de journée n’est pas assurée si le moteur, la page ou le flux est arrêté. Les mouvements pendant l’arrêt ne sont pas reconstruits. Les EMA, RSI, ATR et MACD navigateur ont été comparés à TA-Lib sur les mêmes bougies. Les arrondis numériques restent possibles.

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

Les tests couvrent notamment les deux sens de marché, la marge de 50 %, le levier adaptatif, le budget, le quota après clôture/rechargement, les données anciennes/non clôturées, l’absence de signal, les frais et la fermeture observée de fin de journée. Les tests historiques Python existants sont exploratoires et distincts du nouveau Daily. **Le laboratoire fournit un replay Daily exploratoire sur 7 ou 14 jours récents, avec hypothèses de coûts et de liquidité explicitement affichées ; aucune robustesse ni rentabilité n’est établie.** Le rendu final Safari/iPhone reste à vérifier sur appareil.

## Avant un éventuel passage au réel

Il reste à construire et valider : historique étendu et versionné, backtests avec liquidité et coûts réalistes, validation chronologique hors échantillon et tests de sensibilité, suivi paper continu, service permanent, registre transactionnel des ordres/quota commun à tous les clients, réconciliation exchange, ordres stop reduce-only côté exchange, gestion des rejets et fills partiels, circuit d’arrêt et signature serveur via autorisation dédiée. Ce sont des travaux futurs ; le site actuel n’exécute pas le compte réel.

## Workspace : diagnostic, liquidité et réactivité

Le workspace affiche dix contrôles observables (données, horizons, métadonnées, risque, quota, alignement, spread et configuration). Le compteur indique combien de contrôles passent ; il ne mesure pas une probabilité de gain. Pilotage distingue l’observation de l’armement manuel. Le journal trace l’équité **après chaque clôture** ; il ne représente ni le latent historique ni les creux intraposition.

Le candidat Daily parcourt la profondeur L2 visible pour estimer le prix moyen avec slippage. Il réduit le levier si le volume visible ou le budget de stop l’exige, tout en conservant la marge de 50 %. Les nouvelles barrières de recherche sont un spread de 8 bps maximum, un impact visible de 8 bps maximum et une distance au signal de 1,25 ATR maximum. Les métadonnées doivent dater de moins de 120 secondes. Ces seuils sont des hypothèses opérationnelles : aucun gain de rentabilité n’est démontré. Le contrôleur relit l’état sous verrou avant une entrée et abandonne si la clôture a changé ou si l’utilisateur l’a arrêté.

Dans l’édition navigateur, les horizons 15 min / 1 h / 1 jour sont chargés en priorité. Les requêtes identiques en cours sont partagées ; les historiques valides restent affichés pendant leur actualisation. Les erreurs conservent les données avec un statut d’échec et un délai de nouvelle tentative croissant. Les clôtures sont vérifiées toutes les dix secondes quand l’onglet est visible, avec un cache de 60 secondes hors changement de bougie. Le flux existant déclenche un rafraîchissement visuel au plus une fois par seconde, sans nouvelle connexion WebSocket. Les tableaux identiques ne sont pas reconstruits. Aucun fonctionnement permanent en arrière-plan n’est revendiqué.

L’aperçu a été contrôlé sur ordinateur et aux largeurs 390 et 320 px. Ces contrôles de navigateur ne remplacent pas un essai sur un iPhone physique ni une validation avec lecteur d’écran.

## Sources et licences

- Hyperliquid : https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/info-endpoint
- TradingView Lightweight Charts : https://tradingview.github.io/lightweight-charts/docs
- Vite : https://vite.dev/guide/
- Notices et licence : `THIRD_PARTY_NOTICES.md`, `licenses/`.

Les notes techniques dans `docs/` antérieures à OMEGA sont historiques. Ce README décrit l’état courant.

## Identité OMEGA et compatibilité

Le nom visible, le favicon Ω, le paquet et le dépôt utilisent OMEGA. Les clés de stockage, verrous et identifiants de profil historiques `axiom-*` restent volontairement inchangés pour ne pas réinitialiser les données existantes sur une même origine. Le changement de domaine ne transfère pas automatiquement le localStorage de l’ancienne adresse. Le journal du navigateur reste propre à son origine et à son appareil.

## Recherche historique et plan ATR — v0.8

L’onglet Recherche charge quatre séries Hyperliquid (5 min, 15 min, 1 h, 1 jour), avec 350 bougies de préchargement pour les indicateurs. Les décisions réutilisent `evaluateDaily` et le même module d’indicateurs que l’édition navigateur, sans lecture d’une bougie future. Le calcul tourne dans un Worker, peut être annulé et ne modifie pas le compte paper. Les résultats se conservent localement et les trades s’exportent en CSV. Une série incomplète, incohérente ou trouée bloque le replay.

Le replay utilise un carnet synthétique à profondeur supposée disponible : spread fixe 2 bps et slippage 2 bps / côté, ou scénario renforcé 4 / 4 bps ; frais 4,5 bps / côté. Il ne valide donc pas la liquidité historique. Les métadonnées historiques de levier, le funding et la liquidation ne sont pas reconstruits. Les entrées sont modélisées aux ouvertures suivant les clôtures 15 min ; les sorties sont examinées en 5 min. À double contact stop/objectif dans une bougie, le stop passe en premier ; un gap peut dépasser la perte prévue. La sortie de fin de journée utilise l’ouverture 23:55 UTC ; une position finale est clôturée à la fin de l’échantillon.

Le drawdown décrit l’équité aux clôtures 5 min. Les segments 70 % / 30 % partagent la même trajectoire de capital et classent les trades par date de sortie ; ce n’est pas une validation indépendante. Aucune optimisation n’est effectuée. Quatorze jours et quelques trades ne suffisent pas à établir une rentabilité. La limite de l’API aux 5 000 bougies récentes motive les périodes proposées.

Chaque lancement calcule aussi l’autre scénario de coûts sur les mêmes dates et les mêmes données, avec un capital fictif indépendant de 10 000 USDC. La comparaison affiche les deux P&L, nombres de trades et drawdowns, et signale un éventuel changement de signe. Le scénario sélectionné détermine le journal détaillé et le CSV ; les règles restent inchangées et aucun scénario n’est choisi automatiquement pour maximiser les résultats.

Dans Pilotage, Préparer un plan ATR remplit stop, objectif et levier manuel en tenant compte de la profondeur visible, des frais, du ratio net et d’une réserve de risque de 10 %. Le plafond du bot reste inchangé. Le plan est un exemple de risque, pas un signal, et aucune position n’est ouverte sans soumission explicite.

### Réseaux Hyperliquid et mode testnet

Le sélecteur « Réseau Hyperliquid » charge les endpoints publics REST et WebSocket du réseau choisi. Testnet et mainnet possèdent des comptes paper, adresses mémorisées, plafonds de levier, journaux Daily et résultats de recherche séparés. Les données historiques du replay suivent également le réseau sélectionné.

Le mainnet reste limité à la lecture et à la simulation locale. En testnet, Pilotage propose un panneau distinct pour connecter un wallet Ethereum compatible EIP-1193, consulter le solde réel du réseau de test et envoyer des ordres signés à `https://api.hyperliquid-testnet.xyz/exchange`. Les 10 000 USDC fictifs du compte paper ne constituent jamais un solde Hyperliquid testnet. Le changement de réseau est bloqué tant qu’une position paper est ouverte ; après changement, le bot local revient à l’arrêt.

Connexion : requêtes identiques mutualisées, délai maximal REST de 12 s, pause globale sur HTTP 429/503, heartbeat WebSocket, reconnexion exponentielle avec dispersion et secours REST. Les carnets ETH périmés, croisés, malformés, non triés ou antérieurs au dernier carnet accepté sont ignorés. L’interface affiche le réseau, la source du carnet et le temps de réponse de la dernière requête API.

Le panneau exchange utilise le SDK communautaire @nktkas/hyperliquid 0.33.3 (référencé par la documentation API Hyperliquid) et viem, avec transport testnet fixé et source de signature testnet. Chaque entrée demande deux signatures : réglage du levier isolé puis lot IOC + stop/objectif reduce-only. Le solde, le disponible, les positions et les ordres sont relus avant envoi. Taille et prix sont quantifiés selon les métadonnées ETH. Chaque entrée possède un cloid et une expiration ; un envoi incertain bloque une nouvelle entrée jusqu’à vérification, sans répétition automatique. Les protections refusées ou partielles nécessitent une vérification immédiate du compte.

Le candidat Daily peut être préparé depuis les règles du bot puis signé manuellement. Cette édition ne délègue aucune clé à un agent et ne place pas les ordres testnet de manière autonome. Aucune clé privée n’est saisie ni stockée. Le wallet et des USDC testnet sont nécessaires pour vérifier une exécution bout en bout ; les tests automatisés de signature utilisent un transport simulé et ne prouvent pas une exécution sur l’exchange. Le faucet officiel est soumis aux critères Hyperliquid.
