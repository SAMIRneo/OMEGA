# BTC Atelier — édition web

Version statique autonome adaptée du projet https://github.com/SAMIRneo/bot.

Ouvrir index.html via un hébergement HTTPS. Données publiques Hyperliquid (REST et WebSocket), graphiques et indicateurs JavaScript. Aucun secret et aucun ordre réel.

La simulation de 50 $ est enregistrée dans localStorage sur cet appareil. Elle ne synchronise pas le moteur Python. La surveillance dépend de la visibilité de la page et de données fraîches ; fermer ou suspendre Safari arrête la surveillance. Les mouvements hors ligne ne sont pas reconstitués. Funding et liquidation ne sont pas modélisés. Les frais et le slippage sont simulés. Les pertes peuvent dépasser le risque prévu en cas de saut de prix.

Le verrouillage Web Locks est requis pour ouvrir ou fermer une simulation. Portefeuille réel en consultation ponctuelle via une adresse publique envoyée à Hyperliquid, jamais de clé privée.

Backtests, MCP, ADX, CMF, OBV et signaux du moteur Python ne sont pas portés. Les indicateurs utilisent les bougies clôturées et peuvent différer de TA-Lib.

Validation : tests des indicateurs sur série constante, limites, doublons, page masquée, comptabilité des frais et références DOM ; API publique vérifiée HTTP et CORS. Aucun test visuel navigateur ou sur iPhone effectué dans cet environnement.
