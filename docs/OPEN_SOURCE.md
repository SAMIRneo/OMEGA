> Note : documentation technique antérieure à la refonte ETH v2. Pour l’interface actuelle et ses limites, consulter README.md et docs/ETH_V2.md.

# Outils gratuits examinés le 3 octobre 2026

## Intégré : TA-Lib

https://github.com/TA-Lib/ta-lib-python — bibliothèque d’analyse technique et wrapper Python (licences BSD, voir notices du package). Version installée/pinnée 0.8.1, NumPy 2.5.3. Wheels officiels disponibles pour Windows/Python 3.14. Les indicateurs de l’application utilisent désormais TA-Lib : RSI, EMA, MACD, ATR, ADX, Bollinger et OBV. CMF, volume relatif, VWAP glissante et structure restent calculés explicitement. Cas RSI totalement plat rendu neutre à 50 par convention de l’application.

## Options pertinentes, non installées

- Pandas TA Classic : https://github.com/xgboosted/pandas-ta-classic — MIT. Catalogue d’indicateurs/patterns, utile pour enrichir et comparer des variantes. Ajouter des centaines de signaux sans validation augmenterait le risque de surajustement ; pas requis pour les règles actuelles.
- Lightweight Charts : https://github.com/tradingview/lightweight-charts — Apache-2.0 avec obligations d’attribution indiquées par le projet. Candidat pour remplacer le canvas actuel par un graphique interactif. Non intégré à cette version.
- NautilusTrader : https://github.com/nautechsystems/nautilus_trader — LGPL-3.0. Moteur à base Rust/Python de simulation événementielle et gestion de données. Candidat pour un replay de carnet et une infrastructure plus robuste ; migration et adaptateur nécessaires, pas un branchement automatique.

## Cas à distinguer

VectorBT : https://github.com/polakowo/vectorbt/blob/master/LICENSE.md — licence Apache-2.0 assortie de Commons Clause, donc restrictions supplémentaires. Ne pas le présenter comme équivalent à un projet libre sous MIT/Apache seuls. Non intégré.

Les sources citées sont les dépôts officiels. Aucune de ces bibliothèques ne démontre une rentabilité ; elles améliorent calculs, visualisation et capacité de vérification. Aucun service payant ni abonnement n’a été activé.
