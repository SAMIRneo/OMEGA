> **ARCHIVE HISTORIQUE — ne décrit pas la version actuelle.** Lire la [documentation active](../README.md). Les anciens seuils, chemins, commandes et capacités ci-dessous ne sont pas des instructions de travail.

> Note : documentation technique antérieure à la refonte ETH v2. Pour l’interface actuelle et ses limites, consulter README.md et docs/ETH_V2.md.

# Interface et connexions — version 0.3

Quatre vues : terminal, stratégies, simulation et connexions. Navigation disponible sur mobile, focus clavier visible, animations désactivées si préférence de réduction des mouvements. Graphique avec horizons rapides, zoom sur 40 à 300 bougies, curseur de lecture et EMA20/50 visuelles calculées sur l'historique affichable (300 bougies maximum, pas exactement la même initialisation que les indicateurs serveur sur 1 000 bougies).

Simulation : prévisualisation indicative de l'exposition, de la quantité, des coûts et de la perte au stop ; rejet visuel des risques supérieurs au plafond ; backend toujours autoritaire. Exemple ATR à la demande, pas un signal d'entrée. Aucun trade d'essai n'a été placé sur le compte simulé de l'utilisateur.

Connexions : serveur, fraîcheur du carnet, lecture du portefeuille et consultation récente par un client MCP. La dernière consultation ne prouve ni la présence d'Hermes ni l'activité continue d'un modèle. Configuration MCP générée avec l'exécutable Python local et ATELIER_URL ; pas de secret de signature. Positions réelles consultées seulement.

Optimisations : indicateurs mis en cache au rafraîchissement des bougies ; réponse UI limitée à l'horizon choisi et 300 bougies ; gzip ; validation ETag des fichiers ; pas de requêtes de polling concurrentes ; attente accrue en arrière-plan et après échec ; graphiques/tableaux stables non reconstruits à chaque tick ; reconnexion de session au changement d'instance serveur et après rejet 403. Une requête de mutation dont la réponse n'arrive pas n'est jamais répétée automatiquement.

Agent : eth_state fournit la synthèse sans historiques bruts ; eth_candles demande 10–300 bougies pour un horizon. Les outils paper_open/paper_close restent simulés. L'API GET /api/state complète est conservée pour compatibilité.

Vérifications : 13 tests du moteur passent. Contrôles HTTP de gzip, ETag/304, origine refusée, horizon invalide, lecture MCP et eth_candles. Navigation entre vues, prévisualisation et bouton désactivé pour risque excessif, coupure du serveur et reprise de l'interface, sélection d'horizon/zoom, format desktop et largeur mobile vérifiés. Pas de débordement horizontal au contrôle mobile, pas d'erreur JavaScript au contrôle final. Capital paper toujours 50 $.

Mesure ponctuelle : réponse complète non compressée 1 218 153 octets, réponse UI 4 h compressée 17 956 octets, soit 98,5 % de réduction. Ce chiffre porte sur ce payload, pas sur la latence Hyperliquid, la vitesse globale ni une capacité HFT.
