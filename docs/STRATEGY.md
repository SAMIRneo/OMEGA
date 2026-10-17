# Stratégie intraday et contrats de risque

Règles canoniques : [daily.ts](../frontend/core/daily.ts), [session.js](../frontend/core/session.js), [indicateurs](../frontend/core/indicators.js), [exécution](../frontend/core/execution.ts), [plan exchange](../frontend/core/testnet-plan.ts), [politique du service](../runner/policy.ts).

OMEGA sélectionne des configurations avec des règles explicites. Aucun modèle entraîné, apprentissage continu ou rentabilité démontrée. Les seuils ci-dessous sont des hypothèses à évaluer, pas une optimisation statistique prouvée. Un score de règles n’est pas une probabilité.

## Décision

1. Carnet, métadonnées et historiques clôturés récents ; séries continues dans le service.
2. Contexte : clôture journalière au-dessus/sous EMA20, tendance horaire concordante, structure EMA20/EMA50 en 15 min dans le même sens.
3. Régime : ADX 15 min ≥ 18, ATR/prix ≤ 2,5 %, distance clôture/EMA20 ≤ 1,5 ATR. Les mouvements trop avancés ou sans force sont écartés.
4. Déclenchement : cassure d’un extrême des 20 bougies précédentes avec volume, reprise EMA20, ou croisement MACD précoce en Offensif.
5. Confirmations : MACD, CMF/OBV, ADX/DI, VWAP/volume. Elles sont partiellement corrélées.
6. Score : 55 + 8 par confirmation + 6 pour cassure (3 sinon) + 5 si ADX ≥ 25 + 4 si volume relatif ≥ 1,4. Affichage plafonné à 100.
7. Coûts/exécution : spread ≤ 8 bps, impact visible ≤ 8 bps, distance du prix au signal ≤ 1,25 ATR, ratio gain/risque net ≥ 1,5. Revalidation après réglage du levier, signal de moins de 60 s dans le runner.

| Profil | Volume relatif requis pour cassure/VWAP | RSI long | Confirmations | Score minimal |
|---|---|---|---|---|
| Équilibré | 1,2 | 45–72 | 2 | 80 |
| Sélectif | 1,4 | 48–68 | 3 et ADX ≥ 20 | 88 |
| Offensif | 1,0 | 42–76 | 2 ; croisement MACD supplémentaire autorisé | 76 |

Le RSI short est symétrique autour de 50. Le volume minimal ne s’applique pas séparément à toutes les reprises EMA20 : seules les confirmations admissibles comptent.

## Gestion de session UTC

- Jusqu’à quatre tentatives/entrées quotidiennes ; une position à la fois.
- Pause de 30 min après l’entrée ou la dernière sortie. Une nouvelle clôture admissible reste requise ; aucun rattrapage.
- Objectif réalisé 100 / 200 / 500 USDC, défaut 200. Dès qu’il est atteint, les nouvelles entrées sont bloquées. Il ne fixe pas un gain garanti par trade et ne force aucune entrée.
- Deux pertes consécutives : nouvelles entrées bloquées jusqu’au prochain jour UTC. Dans le service, le calcul regroupe les fills de clôture par oid et inclut les frais de ces clôtures. Les frais d’entrée participent au P&L journalier mais ne sont pas attribués à ce compteur de pertes par ordre.
- Limite de perte réalisée du jour : 500 USDC. Les gains antérieurs n’élargissent pas le budget de perte des prochaines entrées.
- Pas d’entrée après 23:30 UTC ; clôture reduce-only visée à partir de 23:55 UTC et à la reprise d’une position du jour précédent.

Le runner utilise les fills ETH du compte : P&L réalisé moins frais USDC. Funding, P&L latent et autres actifs ne sont pas reconstruits. Les interventions manuelles sur ETH peuvent donc modifier les conditions de session. Paper et replay ont leur comptabilité propre.

## Dimensionnement

La marge de 50 % devient un **plafond**, et non une allocation obligatoire. Le moteur calcule d’abord une quantité compatible avec le stop et les coûts, puis la borne par ce plafond de marge.

Budget automatique = min(100 USDC, 1 % de l’équité, 90 % du budget de perte restant). Le budget restant vaut 500 + min(0, P&L réalisé du jour), borné à zéro. Stop 1,5 ATR, cible 3 ATR. Le levier entier reste sous les plafonds utilisateur/exchange et ×15 ; la quantité dépend du risque, pas d’un gain à rattraper. Aucune martingale.

Le candidat navigateur modélise frais et slippage configurés, par défaut 4,5 et 2 bps par côté. Le plan IOC exchange utilise une borne d’entrée de 10 bps, des frais de 4,5 bps par côté et une hypothèse de glissement de sortie de 10 bps. Le service réduit encore la quantité si ce plan plus conservateur l’exige. L’ordre final peut donc être refusé malgré un candidat navigateur admissible.

La signature manuelle utilise un plan générique plafonné à 500 USDC de perte prévue et 50 % de marge ; elle applique les conditions de session mais ne sélectionne pas obligatoirement une configuration Daily. Les simulations manuelles navigateur restent plafonnées à 100 USDC et 1 % de l’équité. Python/MCP conserve son ancien moteur paper, distinct de cette nouvelle politique intraday.

Ces montants sont des pertes **prévues**, pas des garanties de perte maximale en cas de gap, panne, liquidation ou glissement réel.

## Persistance et incertitude

Le runner réserve le compteur quotidien, la date, l’heure et le cloid avant l’envoi du lot IOC + SL/TP reduce-only. Un refus ou timeout conserve la tentative. Un pending n’est jamais relancé automatiquement. Après rapprochement et absence d’exposition, le pending peut être levé ; la tentative reste consommée et un réarmement explicite est nécessaire.

Un ancien ledger avec `attemptDay` mais sans `attemptCount` conserve une tentative. Les compteurs invalides bloquent le service. Le nombre retenu est le maximum entre les tentatives locales et les ordres d’entrée exchange du jour : ce n’est pas un quota transactionnel global sur plusieurs logiciels ou machines.

Protections incomplètes : la position attribuée au bot reste surveillée et une sortie reduce-only est visée. La propriété de position reste limitée face aux modifications externes de l’exposition nette ETH.

## Recherche

[replay.ts](../frontend/core/replay.ts) réutilise les règles et la session avec les données connues à chaque instant. Entrée à l’ouverture suivant la clôture 15 min ; sorties en 5 min. Stop prioritaire si stop et cible touchés dans la même bougie ; gaps possibles. Carnet synthétique, coûts standard/renforcés ; aucune reconstruction du funding, des liquidations ou de la vraie profondeur historique.

Le replay utilise actuellement l’objectif par défaut de 200 USDC ; les objectifs live personnalisés doivent faire l’objet de comparaisons dédiées. Périodes récentes 7/14 jours. Les segments 70/30 partagent le même capital ; aucune validation hors échantillon indépendante n’est établie. Les tests logiciels vérifient les contrats, sans démontrer une meilleure performance financière.

Références : [API exchange Hyperliquid](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/exchange-endpoint), [frais Hyperliquid](https://hyperliquid.gitbook.io/hyperliquid-docs/trading/fees).
