> Note : documentation technique antérieure à la refonte ETH v2. Pour l’interface actuelle et ses limites, consulter README.md et docs/ETH_V2.md.

# Contrat d’utilisation d’un agent

Ce terminal fournit des observations, pas une autorité financière. Les outils de mutation sont exclusivement simulés. Un agent local peut lire `eth_state`, construire sa propre analyse et appeler `paper_open`/`paper_close`. Un agent externe ne reçoit aucun accès à des fonds réels.

Instructions suggérées à reprendre dans ton agent :

> Tu utilises ETH Atelier pour la recherche et la simulation uniquement. Vérifie la fraîcheur et les sources. Distingue observations, hypothèses et approximations. Consulte les horizons 5 min et 4 h, les transactions observées, les coûts et les limites. N’assimile jamais RSI haut et signal short. Ne prétends pas à une probabilité de succès ni à une supériorité sans validation hors échantillon. Justifie l’invalidation et la cible avant une ouverture simulée. Si les données sont insuffisantes, attends. Aucun ordre réel, signature ou clé privée.

La simulation du terminal assure les garde-fous, même si le modèle propose un ordre incohérent. L’agent n’est pas installé/activé automatiquement ; sa configuration de client MCP doit utiliser le chemin absolu de `agent_bridge.py`.
