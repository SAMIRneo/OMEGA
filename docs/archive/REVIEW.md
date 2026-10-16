> **ARCHIVE HISTORIQUE — ne décrit pas la version actuelle.** Lire la [documentation active](../README.md). Les anciens seuils, chemins, commandes et capacités ci-dessous ne sont pas des instructions de travail.

> Note : documentation technique antérieure à la refonte ETH v2. Pour l’interface actuelle et ses limites, consulter README.md et docs/ETH_V2.md.

# Documentation et périmètre

Consultation officielle le 2 octobre 2026 : index général, API info/exchange, WebSocket et abonnements, API wallets/nonces, limites, tailles/prix, frais et liquidations. Les pages relatives aux fonctionnalités annexes ne sont pas toutes analysées : la copie locale complète sert de référence, pas de preuve d'une revue exhaustive.

Sources : https://hyperliquid.gitbook.io/hyperliquid-docs/llms.txt

Points retenus : adresse réelle du compte pour les lectures (pas adresse d'agent), endpoints mainnet/testnet distincts, tailles et levier à extraire des métadonnées, liquidation selon mark price et marge, frais de compte et éventuels builder fees à intégrer. WebSocket avec heartbeat/reconnexion pour la collecte future. Limites pondérées REST et limites spécifiques aux actions : un compte avec petit volume ne peut pas supposer une fréquence d'ordres illimitée.

État actuel : passerelle REST ETH et lecture de compte uniquement. Pas d'agent intégré, de collecte continue, de stratégie, de simulation, de TPO, de fournisseur macro ou d'exécution réelle. Le levier ×40 n'est ni configuré ni appliqué au compte.

La commande `python sync_docs.py` actualise l'archive et signale les échecs dans `official/manifest.json`.
