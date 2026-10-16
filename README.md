# OMEGA — ETH Intelligence

Terminal ETH et moteur Daily Hyperliquid, sur **testnet et mainnet**.

[Site public](https://omega.kairos-labspro.chatgpt.site) · [Code source](https://github.com/SAMIRneo/OMEGA)

## Version 1.1 — Obsidian / Spatial

Interface noire : fond `#000000`, surfaces neutres, textes contrastés, chiffres tabulaires, chandeliers vert menthe / rose et animations discrètes respectant la réduction des mouvements. Quatre onglets : **Marché, Bot, Compte, Recherche**. Le journal de simulation se trouve dans Compte. Les outils manuels et la simulation sont repliables dans Bot.

Le pilote exchange dispose désormais d’un **processus Node indépendant du navigateur**. Il peut évaluer les signaux et signer automatiquement avec un agent API autorisé. Le site public reste un hébergement statique : il ne contient pas de clé ni de processus de trading permanent. Le panneau indique « Non connecté » tant qu’aucun service n’est relié. Il ne simule pas une connexion à un portefeuille.

### Rapidité et organisation

- Import à la demande du graphique financier, de Recherche, du pilote local et de la signature. La visite de Bot ne charge pas le SDK de signature : il arrive à l’ouverture des outils manuels ou à l’autorisation d’un agent.
- Module d’entrée : 18,35 Ko minifiés contre 188,70 Ko en v1.0 ; CSS : 105,76 Ko contre 150,32 Ko. Le graphique financier reste chargé dans Marché : ces chiffres ne représentent pas le total de tous les modules ni une mesure de LCP sur appareil.
- Styles structurels regroupés dans `layout.css`, thème dans `obsidian.css`. Sélecteurs inutilisés et déclarations supplantées retirés de la cascade précédente.
- Carnet : lignes DOM réutilisées. Horizons, position et événements sont reconstruits uniquement quand leurs données changent. Formatage numérique mutualisé.
- `ChartBuffer` conserve les EMA et recalcule le suffixe modifié. Il détecte aussi une correction historique même si la dernière bougie n’a pas changé. Une clôture corrigée et la bougie suivante sont actualisées ensemble ; le zoom reste stable.
- Marché : graphique et carnet en première ligne, liquidité spatiale et flux en seconde, indicateurs regroupés. Bot : diagnostic et stratégie côte à côte sur écran large, empilés sur mobile. Navigation persistante à quatre entrées sur mobile.

### Vue de liquidité en 3D

La projection Canvas représente **les 12 premiers niveaux de chaque côté du carnet**. Chaque barre a pour hauteur la quantité ETH de son niveau ; la hauteur est normalisée au maximum visible, et le panneau donne les prix, tailles et cumuls exacts. Elle n’invente pas de liquidité historique ni de trajectoire future. La vue n’est pas un signal de trading.

Glisser pour tourner/incliner, cliquer un sommet pour sélectionner, flèches gauche/droite pour parcourir les niveaux, boutons Pause et Réinitialiser. Une seule source de données : les snapshots du flux existant, sans nouvelle connexion réseau. Module de 5,43 Ko minifiés ; animation plafonnée à 20 images/s, densité de pixels plafonnée à 1,5, arrêt hors écran/onglet masqué. Démarrage en pause avec réduction des mouvements ou faible mémoire déclarée. Les données périmées prennent une teinte neutre.

## Trois modes distincts

| Mode | Exécution | Conditions |
|---|---|---|
| Simulation web | Compte fictif, localStorage | Onglet visible ; arrêt/suspension du navigateur possible |
| Exchange manuel | Vrais ordres sur le réseau choisi | Wallet EIP-1193, signature du levier puis de l’ordre ; confirmation mainnet par entrée |
| Pilote permanent | Ordres automatiques testnet ou mainnet | Service Node actif, compte financé, agent autorisé et armement explicite |

Les fonds testnet, les fonds mainnet et les 10 000 USDC fictifs sont distincts. Le mot « automatique » ne signifie pas qu’un bot est déjà armé sur votre compte. Aucune autorisation wallet n’est créée par la publication du site. Aucun retrait ou transfert n’est implémenté.

## Installer et lancer le pilote permanent

Node.js 22.12+ (vérifié avec Node 24). Rust et Python ne sont pas nécessaires pour ce mode ; le noyau WASM est versionné.

```sh
npm ci
npm run build
npm run bot
```

Ouvrir **http://127.0.0.1:8766/#pilot** sur le même ordinateur avec MetaMask, Rabby ou un autre wallet EIP-1193 injecté.

1. Choisir Testnet ou Mainnet dans OMEGA.
2. Cliquer **Autoriser l’agent API**. Le service génère une nouvelle clé dédiée au réseau, conservée uniquement sur l’ordinateur. Le wallet signe `approveAgent` pour cette adresse, pour 24 h.
3. Régler le profil Daily et le plafond de levier. Le service relit ces réglages au démarrage, puis les garde jusqu’au prochain armement.
4. Sur Mainnet, cocher l’autorisation explicite de trading automatique avec fonds réels.
5. Cliquer **Démarrer le bot**. Il attend une nouvelle clôture 15 min ; aucune ancienne opportunité n’est rattrapée.
6. **Arrêter les entrées** désarme les nouvelles entrées ; les protections exchange et la surveillance des positions attribuées au bot continuent tant que le service tourne.

Fermer l’onglet ne coupe pas ce processus. Fermer le terminal, éteindre l’ordinateur ou le mettre en veille arrête son travail ; les ordres SL/TP déjà acceptés restent côté Hyperliquid. Le service repart **désarmé après redémarrage** et reprend la surveillance d’une position dont il avait enregistré la propriété. Aucun service cloud 24 h/24 n’est déployé par cette version. Le site public ne contacte pas silencieusement votre localhost : ouvrir l’interface locale est nécessaire.

L’autorisation de l’agent est propre au réseau et au compte. Chaque nouvelle préparation génère une nouvelle clé ; un agent expiré/révoqué n’est pas recyclé. L’agent peut être révoqué depuis Hyperliquid. Ne jamais saisir la clé privée du wallet principal dans OMEGA.

## Règles du pilote automatique

- ETH perpétuel uniquement ; profil Sélectif, Équilibré ou Offensif.
- Contexte daily, tendance 1 h et déclenchement 15 min sur bougies clôturées.
- Au plus **une tentative d’entrée par jour UTC dans cette installation**, également bloquée si les fills exchange montrent une autre entrée ETH ce jour.
- Allocation maximale : 50 % de l’équité du compte, quantifiée selon ETH et le prix limite IOC. Le levier baisse par entiers plutôt que d’utiliser une fraction de marge arbitraire.
- Levier isolé entre ×1 et ×15, sous les plafonds utilisateur et exchange.
- Risque prévu automatique ≤ 450 USDC, réserve de 10 % sous le plafond 500 USDC. Ratio gain/risque net ≥ 1,5 ; frais et slippage hypothétiques.
- Stop 1,5 ATR, cible 3 ATR. Entrée IOC bornée à 10 bps ; SL/TP reduce-only placés sur Hyperliquid, avec identifiants client distincts.
- Pas d’entrée après 23:30 UTC. Clôture reduce-only visée dès 23:55 UTC au prochain contrôle frais ; une position du jour précédent est également visée à la reprise.
- Limite de pertes quotidiennes ETH réalisées/frais : 500 USDC. Le funding n’entre pas dans ce calcul.
- Refus si une position ou un ordre ETH existe avant une nouvelle entrée, si les historiques sont troués, si le carnet est ancien/croisé/malformé, si les données sont incomplètes ou si l’agent est expiré/révoqué.
- Les barrières Daily de spread, profondeur et distance au signal sont réutilisées. Le plan final recontrôle coûts, profondeur, marge et budget au prix IOC.

Le service utilise **le même `evaluateDaily`, les mêmes indicateurs et le même noyau de risque Rust/WASM que le navigateur**. Après le réglage du levier, il relit le compte, la liquidité, les fills et le signal avant d’envoyer l’entrée. Un signal vieux de plus de 60 s n’est pas exécuté. Un jour peut rester sans trade.

La réservation du quota et du cloid est écrite sur disque **avant** l’envoi. Une réponse incertaine désarme les entrées, conserve l’envoi en attente et ne provoque aucune répétition automatique. **Vérifier un envoi** rapproche son cloid et ses fills. Une entrée remplie dont les protections sont refusées reste surveillée ; le service tente une clôture reduce-only si les protections attribuées au bot manquent. Une modification externe de taille/sens suspend sa gestion pour éviter de traiter une position agrandie manuellement comme appartenant au bot. Utiliser un compte dédié : le bot ne peut pas reconnaître toutes les interventions externes sur une position nette ETH.

Ces limites ne garantissent pas une perte maximale : gap, liquidation, funding, panne, illiquidité et refus exchange peuvent produire une perte supérieure. Le moteur n’est pas un modèle IA entraîné et aucune rentabilité n’est établie.

## Connexion et sécurité locale

- Endpoints fixés : `api.hyperliquid.xyz` / `api.hyperliquid-testnet.xyz`, REST `/info` et `/exchange`. Le navigateur utilise aussi les WebSockets du réseau choisi.
- SDK `@nktkas/hyperliquid` et viem ; signatures avec source réseau fixée. Aucun endpoint utilisateur arbitraire pour signer.
- Le serveur écoute seulement sur **127.0.0.1:8766**, refuse un autre Host/Origin et les requêtes navigateur cross-site ; aucun CORS. Session aléatoire renouvelée à chaque lancement, requise pour lire et modifier le moteur.
- Clés et état dans `.omega-runtime/`, ignoré par Git. Répertoire 0700 et fichiers 0600 sur les systèmes POSIX ; protéger l’accès au compte système sur Windows. La clé d’agent n’est jamais retournée par l’API ni stockée dans localStorage. Ce fichier est un secret local, pas un coffre chiffré.
- Un verrou de processus empêche deux services de partager les mêmes clés et nonces sur cette installation. Compteurs de nonce, réservations et journal sont persistés avec écriture temporaire, synchronisation disque et renommage.
- Réseaux séparés : clé, propriétaire, nonce, quota et journal. Une clé par processus ; ne pas copier le répertoire runtime sur plusieurs machines actives.
- Polling du service toutes les 10 s, requêtes sérialisées par moteur, timeout REST de 12 s, temporisation croissante sur erreur. Les bougies sont mises en cache jusqu’à 60 s, avec invalidation au changement de période. Une coupure bloque les entrées ; les bougies de l’absence ne sont pas rattrapées.
- API locale `/api/live/{session,status,configure,verify,arm,stop,reconcile}`. Toutes les mutations demandent le jeton de session, y compris l’armement. Mainnet exige en plus le consentement spécifique.

Le quota durable est propre à cette installation ; les fills du jour ajoutent un contrôle exchange. Plusieurs logiciels/machines peuvent encore entrer simultanément sur le même compte. Aucune garantie de quota global interlogiciels n’est revendiquée.

## Interface et recherche

- **Marché** : chandeliers/courbe TradingView Lightweight Charts, EMA20/50, volume, carnet L2, flux observé et horizons.
- **Bot** : état du service, autorisation et solde réellement reçus, armement/arrêt, activité ; diagnostic navigateur, stratégie, ordres manuels et simulation repliables. Le diagnostic navigateur n’est pas l’état d’exécution du service.
- **Compte** : positions tous perpétuels, ordres et fills ETH en lecture publique ; sous-onglet Journal pour les simulations locales et CSV.
- **Recherche** : replay 7/14 jours, profils et deux scénarios de coûts, calcul en Worker, courbe, motifs de refus et CSV. Carnet synthétique, spread et slippage supposés ; funding et liquidation historiques non reconstruits. Les segments 70/30 partagent la même trajectoire et ne constituent pas une validation indépendante.

La simulation web conserve les clés historiques `axiom-*` pour préserver les données sur une même origine. Les appareils, réseaux et origines ne synchronisent pas leur journal de simulation.

## Architecture

| Source | Rôle |
|---|---|
| `frontend/core/` | Règles, contrats, indicateurs, replay et contrôleur paper |
| `frontend/charts/` | Graphique financier et tampon incrémental de bougies/EMA |
| `frontend/shared/` | Imports différés, formatage et distribution des snapshots |
| `frontend/visuals/` | Modèle de profondeur et scène 3D Canvas |
| `frontend/exchange.ts` | Exécution manuelle wallet, testnet/mainnet |
| `frontend/runner-ui.ts` | Connexion locale, approbation agent et commandes du service |
| `frontend/obsidian.css` | Direction artistique noire et responsive |
| `runner/engine.ts` | Évaluation et gestion des ordres automatiques |
| `runner/policy.ts` | Plans IOC, validations et garde-fous exchange |
| `runner/server.ts` | Service HTTP local, isolation, nonces et persistance |
| `rust-core/` | Noyau de risque compilé en WebAssembly |
| `app.py`, `engine.py`, `agent_bridge.py` | Ancien moteur Python de simulation et MCP local |

Le build navigateur est dans `dist/`. `npm run build:bot` produit `runner-dist/server.mjs` ; il utilise les dépendances Node installées et le WASM versionné dans `frontend/legacy/risk-core.js`.

### Ancien mode Python

```sh
python -m pip install -r requirements.txt
# Copier config.example.json vers config.json puis renseigner l’adresse publique.
npm run build
python app.py
```

http://127.0.0.1:8765 reste un moteur de simulation. Il n’est pas le service exchange automatique, qui utilise le port 8766. MCP stdio : `eth_state`, `eth_candles`, `paper_open`, `paper_close`. Aucun fournisseur IA n’est branché automatiquement.

## Vérifier

```sh
npm run typecheck
npm test
npm run test:browser
npm run build
npm run build:bot
node scripts/check-runner.mjs
python -m unittest discover -s tests -v
cargo test --manifest-path rust-core/Cargo.toml
```

109 tests automatisés passent dans cette version (89 Vitest + 20 tests du moteur navigateur), ainsi que le build typé du site et du service. Les nouveaux tests couvrent le tampon de courbes, les corrections historiques, les imports différés, le diagnostic/journal et les données/géométries de la vue de profondeur. Aucun navigateur de vérification visuelle n’était disponible dans cette session.

Tests du moteur : consentement mainnet, agent expiré, isolation des réseaux, quota exchange et persistant, réservation avant envoi, réponse incertaine, arrêt pendant armement/envoi, données anciennes, ratio net, allocation, gestion reduce-only et position modifiée hors du bot. Le test HTTP lance un service temporaire sans autorisation exchange : session, Host/Origin, rotation de clé, confidentialité et séparation des réseaux.

Les lectures publiques L2 ETH ont répondu HTTP 200 sur les deux réseaux le 16 octobre 2026. **Aucun ordre signé n’a été envoyé depuis un wallet financé pour valider cette version.** Les signatures et ordres sont testés avec des transports simulés. Le rendu Safari/iPhone physique et l’exécution réelle de bout en bout restent à vérifier. Aucun rendement n’est déduit des tests logiciels.

## Sources et licences

- [API Hyperliquid](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api)
- [Agents et nonces](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/nonces-and-api-wallets)
- [Exchange et approbation agent](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/exchange-endpoint)
- [TradingView Lightweight Charts](https://tradingview.github.io/lightweight-charts/docs)
- `THIRD_PARTY_NOTICES.md`, `licenses/`.

Les documents antérieurs dans `docs/` sont historiques ; ce README décrit la version courante.
