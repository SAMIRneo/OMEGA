# BTC Atelier

Terminal local BTC / Hyperliquid, portefeuille réel en lecture seule et simulation indépendante de 50 $. Python + interface web sans CDN. Rust n'est pas installé sur ce poste ; ce projet n'est pas écrit en Rust et n'est pas une infrastructure HFT.

## Lancement

```powershell
git clone https://github.com/SAMIRneo/bot.git
cd bot
Copy-Item config.example.json config.json
python -m pip install -r requirements.txt
python app.py
```

Ouvrir http://127.0.0.1:8765. `start.ps1` propose le même lancement. Aucun dépôt, transfert ou ordre réel. L'application doit rester active pour surveiller les positions simulées.

## Fonctionnalités

- WebSocket carnet et transactions BTC : reconnexion, heartbeat, déduplication.
- Bougies 5 min / 4 h / 30 min actualisées chaque minute.
- RSI Wilder 14, MACD 12/26/9, ATR Wilder 14, EMA 20/50, VWAP glissante (40 bougies), niveaux récents sur bougies clôturées.
- Delta signé des transactions observées sur 60 s, incomplet au démarrage/après interruption.
- TPO sur 48 bougies de 30 min ; volume réparti uniformément dans leur amplitude : approximation explicitement affichée, pas un footprint.
- Portefeuille public : positions/ordres dans l'API, résumé de valeur dans l'interface.
- Simulation persistante : une position ×40, stop/objectif, frais hypothétiques, exécution sur profondeur visible + slippage, funding estimé et historique.
- Limites par défaut : marge 5 $, risque 1 $ au stop, perte quotidienne 5 $ (jour UTC). Un gap peut dépasser la perte prévue.

## Brancher un agent

Lancer d'abord l'application. Pour un client MCP local, reprendre `mcp-config.example.json` dans sa configuration. Outils : `btc_state`, `paper_open`, `paper_close`. MCP stdio JSON-RPC, protocole 2024-11-05. La compatibilité Hermes dépend de sa version/configuration ; aucun fichier Hermes existant n'a été modifié.

L'agent peut aussi consulter `GET /api/state` et `/api/health`. Les mutations `/api/paper/open` (side, margin, stop, target) et `/api/paper/close` requièrent `Authorization: Bearer <jeton local>`. Le jeton change à chaque lancement et se trouve dans `data/agent-token.txt`, ignoré par Git. Ne pas publier ce fichier.

Depuis Codex, la passerelle peut être consultée avec les outils locaux du chat. L'agent n'est pas branché automatiquement : un modèle doit disposer d'un client d'outils local. Un agent cloud ne peut pas consulter directement localhost. Aucun fournisseur IA ou clé de modèle n'est configuré.

## Configuration / persistance

`config.json` contient votre adresse publique et les paramètres paper. Copier `config.example.json` en `config.json`, puis remplacer l’adresse d’exemple par celle du portefeuille à consulter. Le fichier personnel `config.json` est ignoré par Git. `data/paper.json` contient résultats, position et événements. Aucune clé privée Hyperliquid.

Le serveur écoute uniquement sur 127.0.0.1, contrôle Host/Origin et authentifie les mutations. Les processus de la même session peuvent accéder aux lectures : ce n'est pas une isolation entre applications.

Fraîcheur : réception carnet <5 s et âge source absolu <15 s. L'âge affiché inclut un éventuel décalage d'horloge ; une connexion active ne prouve pas une latence HFT. Les nouvelles positions sont refusées si flux ou métadonnées périmés.

## Limites

Lecture du contexte descriptive : pas de stratégie validée, probabilité de gain ou auto-entrée. Source macroéconomique non connectée. Liquidation estimée pour une petite position isolée : ne reproduit pas le compte cross ni les paliers réels. Funding proratisé au taux connu, pas un règlement horaire exact. Frais hypothétiques de 4,5 bps par côté et slippage de 2 bps, à calibrer.

La surveillance reprend au redémarrage ; les stops ne peuvent pas s'exécuter pendant l'arrêt, les mouvements et le funding hors ligne ne sont pas reconstitués. Le journal le signale.

## Tests et documentation

```powershell
python -m unittest discover -s tests -v
node --check web/ui.js
```

149 pages officielles archivées dans `docs/official`. Mise à jour : `python sync_docs.py`. Périmètre de la revue initiale : `docs/REVIEW.md`.

## Test historique exploratoire

Un croisement EMA20/50 est testé sur les ~200 dernières bougies 5 min clôturées. Signal à la clôture précédente, entrée à l’ouverture suivante, stop 1,5 ATR / objectif 3 ATR, sortie après 12 bougies, stop prioritaire si les deux niveaux sont atteints. Coûts fixes inclus ; funding, liquidation, carnet et limites journalières exclus. Baisse maximale sur l’équité réalisée uniquement. Cette fenêtre courte sans validation hors échantillon ne prouve aucune rentabilité.


## Analyse multi-horizon (version du 3 octobre)

Horizons : 5 min, 15 min, 30 min, 1 h, 4 h, 1 jour, 1 semaine. Jusqu'à 1 000 bougies par horizon ; si la source dispose de moins d'historique, le nombre réel est affiché. Graphique et panneau d'indicateurs sélectionnables. Actualisation adaptée : 60 / 60 / 120 / 180 / 300 / 900 / 1 800 secondes ; récupération après échec avec attente 30 s. Les métadonnées/compte sont consultés environ chaque minute.

TA-Lib calcule RSI, EMA20/50/200, MACD, ATR, ADX, Bollinger et OBV. Régime conventionnel : ADX <20 range, 20–25 transition, ≥25 tendance. EMA200 n'entre dans la tendance qu'après 250 bougies. RSI plat rendu neutre à 50. Volume relatif : dernière bougie / moyenne des 20 précédentes. CMF20 mesure la position des clôtures pondérée par le volume ; ne remplace pas le delta des transactions.

Quatre règles de recherche : reprise de tendance, cassure avec volume, retour à la moyenne et rejet d'extrême. Confirmation sur contexte 1 h / 4 h / 1 j pour les tendances ; range 1 h pour retour à la moyenne ; rejet contraire à un contexte aligné bloqué. Delta 60 s concordant, fenêtre continue d'au moins 75 s et carnet frais requis. Les signaux restent des hypothèses : aucune auto-entrée ni probabilité calculée.

Comparaison des familles sur 5 min / 15 min / 1 h : 250 bougies d'échauffement puis deux moitiés chronologiques, capital de départ fictif indépendant pour chaque famille/période, paramètres fixes. L'entrée utilise uniquement les bougies antérieures. La période réservée est une vérification exploratoire et pas une validation définitive. Les filtres multi-horizon et l'order flow ne sont pas rejoués. Le résultat d'une famille isolée ne mesure pas la confluence complète.

Les mêmes données sont accessibles à l'agent via `multiTimeframe`, `candlesByTimeframe`, `candleStatus` et `strategyResearch` dans `btc_state`. Rapport des outils gratuits/open source : `docs/OPEN_SOURCE.md`.


## Interface et connexion (version 0.3)

Quatre vues dédiées : Terminal, Stratégies, Simulation, Connexions. Le bouton d'état ouvre les diagnostics. La prévisualisation du formulaire est indicative ; le moteur vérifie à nouveau chaque ordre simulé. Le bouton « Exemple ATR » remplit des niveaux mécaniques à vérifier, sans recommandation.

Dans Connexions, afficher/copier la configuration MCP générée pour ce poste puis l'ajouter à son client. Le témoin de client indique uniquement une consultation récente. Après redémarrage du serveur, l'interface récupère une nouvelle session. Aucun jeton local n'est inclus dans la configuration copiée.

`btc_state` est désormais une synthèse sans les historiques de bougies. Utiliser `btc_candles` avec `timeframe` (5m, 15m, 30m, 1h, 4h, 1d, 1w) et `limit` (10–300, défaut 100) pour les obtenir. `GET /api/state` garde le format complet ; l'interface utilise `?view=ui&timeframe=...` et l'agent `?view=agent`. Le pont accepte la variable locale `ATELIER_URL` pour changer de port.

Détails et mesures : `docs/UI_UX.md`. La compression et les caches améliorent le transfert et l'affichage, sans résoudre le décalage de source observé ni créer une infrastructure HFT.


## Publication GitHub

Code source : https://github.com/SAMIRneo/bot

Cette application nécessite un serveur Python actif. GitHub Pages ne peut pas exécuter son API, ses flux ni la simulation. Les données personnelles, jetons locaux, sorties de travail, archives tierces et le projet MONO-prime imbriqué sont exclus du dépôt.
