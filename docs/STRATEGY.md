# Stratégie Daily et contrats de risque

Cette page décrit les règles implémentées. Le code canonique est [daily.ts](../frontend/core/daily.ts), avec les [indicateurs](../frontend/core/indicators.js), l’[exécution sur profondeur](../frontend/core/execution.ts), le [plan exchange](../frontend/core/testnet-plan.ts) et la [politique Node](../runner/policy.ts).

OMEGA classe des configurations selon des règles explicites. Ce n’est pas un modèle IA entraîné. Un score de règles n’est ni une probabilité de réussite ni une preuve de rentabilité.

## Séquence de sélection

1. **Sources** : carnet récent, métadonnées récentes et historiques 15 min / 1 h / 1 jour clôturés et suffisamment récents. Le runner vérifie aussi la continuité des séries.
2. **Contexte** : clôture daily au-dessus/sous EMA20 ; tendance 1 h concordante ; structure EMA20/50 15 min dans le même sens.
3. **Déclenchement** : cassure d’un niveau issu des 20 bougies précédentes avec volume, reprise de l’EMA20, ou croisement MACD précoce pour le profil Offensif.
4. **Confirmations** : MACD, flux CMF/OBV, force ADX/DI, VWAP/volume. Elles sont partiellement corrélées et ne constituent pas quatre sources indépendantes de probabilité.
5. **Exécution envisagée** : profondeur visible, spread ≤ 8 bps, impact visible ≤ 8 bps et distance au signal ≤ 1,25 ATR. Choix d’un levier entier compatible avec le budget.
6. **Revalidation** : le service relit les entrées de décision après le réglage du levier. Un candidat modifié/ancien ne justifie pas un envoi automatique.

| Profil | Volume relatif | Zone RSI long | Confirmations minimales | Particularité |
|---|---|---|---|---|
| `balanced` | 1,2 | 45–72 | 2 | Cassure ou reprise |
| `selective` | 1,4 | 48–68 | 3 | ADX ≥ 20 requis |
| `aggressive` | 1,0 | 42–76 | 2 | Croisement MACD supplémentaire autorisé |

La zone short est symétrique autour de 50. Le score de classement doit atteindre 80/100. Ces paramètres sont des hypothèses de recherche, pas une optimisation démontrée.

## Règles selon le mode

| Règle | Paper navigateur | Exchange manuel | Runner automatique |
|---|---|---|---|
| Capital de référence | 10 000 USDC fictifs | Solde exchange lu | Solde exchange lu |
| Allocation | 50 % de l’équité paper pour les entrées | Quantité saisie, marge ≤ 50 % | Vise la moitié de l’équité sous quantification/limites |
| Levier | 1–15 sous plafond utilisateur/exchange | 1–15 sous métadonnées | Plus haut entier admissible sous plafonds |
| Perte prévue | Manuelle ≤ 500 ; candidat automatique vise ≤ 450 | ≤ 500 | ≤ 450 |
| Ratio net minimal du candidat | 1,5 dans l’évaluation Daily | Pas de garantie que le formulaire manuel impose cette sélection Daily | 1,5 au plan final |
| Quota | État de cet appareil/origine, Web Locks | Fills ETH du jour | Fills ETH + réservation durable d’une tentative UTC |
| Déclenchement automatique | Nouvelle clôture après armement, onglet visible | Aucun : signatures manuelles | Nouvelle clôture après armement, âge < 60 s |
| Sortie de fin de journée | Prochain prix frais observé par la simulation | Pas de clôture automatique du compte manuel | Clôture reduce-only visée des positions attribuées au bot |

Les plans ATR préparés manuellement sont des exemples de risque ; ils ne sont pas des signaux. Arrondir une taille au pas ETH peut réduire légèrement la marge effectivement engagée. Si le plan ne respecte pas risque/coûts/liquidité, le service tente un levier entier plus bas ou refuse l’entrée.

## Temps, budgets et coûts

- Jour comptable UTC. Pas de nouvelle entrée après 23:30 UTC ; sortie visée dès 23:55 UTC. Une position du jour précédent est également visée à la reprise du service.
- Stop 1,5 ATR, cible 3 ATR. Le budget 500 USDC est une perte **prévue**, pas une garantie de perte maximale. Le budget automatique 450 réserve 10 %.
- Le candidat Daily utilise les hypothèses de frais/slippage des limites (par défaut 4,5 et 2 bps par côté).
- Le plan IOC exchange borne son prix d’entrée à 10 bps. Son risque de sortie modélise aussi un glissement hypothétique ; les coûts du plan final peuvent donc refuser un candidat accepté par la première évaluation.
- La limite de pertes réalisées/frais du jour est 500 USDC. Le calcul exchange repose sur les fills ETH, pas sur une reconstruction complète du funding ou des pertes latentes du compte.
- Les fills partiels d’un même ordre sont dédupliqués par oid pour compter les entrées. Un historique quotidien tronqué ou des frais non interprétables bloquent la vérification.

## Ordres et états incertains

Le lot contient une entrée IOC et deux protections reduce-only. Tailles/prix sont quantifiés selon les métadonnées ETH. Le runner réserve le jour et le cloid avant l’envoi, avec expiration d’ordre et nonces persistants.

Une tentative peut consommer le quota même sans fill confirmé. Un refus/timeout n’autorise pas une nouvelle entrée aveugle. Le rapprochement cherche l’ordre et les fills associés ; en l’absence d’exposition après expiration, le pending peut être levé sans libérer la réservation du jour.

Une entrée remplie avec protections incomplètes reste sous surveillance. Le service vise une sortie reduce-only si les protections reconnues sont absentes, puis vérifie au contrôle suivant. Une demande de sortie n’est pas une garantie de fermeture intégrale ou de prix. La propriété de position est une attribution locale, limitée par les interventions externes sur la position nette ETH.

## Recherche historique

[replay.ts](../frontend/core/replay.ts) réutilise les règles et indicateurs sur bougies disponibles avant la décision. Acquisition de quatre séries : 5 min, 15 min, 1 h et 1 jour, avec préchauffage des indicateurs.

- Périodes proposées : 7/14 jours récents, sous la limite des bougies disponibles de l’API.
- Entrées modélisées à l’ouverture suivant la clôture 15 min ; sorties examinées en 5 min.
- Carnet synthétique à liquidité supposée disponible : coûts standard spread/slippage 2/2 bps ou renforcés 4/4 ; frais 4,5 bps/côté.
- Si stop et cible sont touchés dans la même bougie, priorité au stop. Un gap peut dépasser le risque prévu.
- Funding, liquidation et vraie profondeur historique ne sont pas reconstruits.
- Le drawdown est mesuré aux clôtures 5 min ; les segments 70/30 partagent le même capital. Ce n’est pas une validation chronologique indépendante.

Ne pas modifier un seuil simplement pour obtenir davantage de trades ou transformer un résultat court en affirmation de performance. Le parcours de validation restant figure dans [STATUS.md](STATUS.md).
