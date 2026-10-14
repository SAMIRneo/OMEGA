> Note : documentation technique antérieure à la refonte ETH v2. Pour l’interface actuelle et ses limites, consulter README.md et docs/ETH_V2.md.

# État au 3 octobre 2026

Version fonctionnelle locale : Python, interface responsive sans CDN, collecte ETH WebSocket, historique REST, indicateurs, profils approximés, portefeuille public, simulation 50 $ / ×40, test historique exploratoire et passerelle HTTP/MCP stdio.

Vérifications réalisées : huit tests unitaires (coûts/persistance, fraîcheur locale et source, NaN/risque, stop, limite quotidienne, indicateurs sur bougies closes, marché plat), syntaxe JavaScript, connexion mainnet et lecture de compte, protocole MCP initialisation/liste/lecture, refus origine externe et mutation non authentifiée, refus d'un ordre incohérent depuis l'interface. Aucun ordre réel ni trade paper n'a été ouvert lors des essais de l'application finale ; les tests de transactions ont utilisé des fichiers temporaires isolés.

Affichage contrôlé en viewport étroit et desktop. Aucun message d'erreur console au dernier contrôle. Décalage observé source/horloge locale ~8–11 s : à résoudre/mesurer avant toute prétention de faible latence. Seuil de fraîcheur source configurable 15 s, réception locale 5 s.

Non terminé au sens d'un système professionnel de production : données économiques externes, source de volume réellement exécuté par prix sur historique long, validation des stratégies hors échantillon, infrastructure HFT, modèle IA intégré et compatibilité de l'installation Hermes spécifique. Aucun accès trading réel, aucune clé de signature et aucune décision autonome sur fonds réels.
