# ETH Atelier v2 — 14 octobre 2026

Refonte du terminal en quatre espaces : Terminal, Pilotage, Portefeuille, Journal. La source principale du frontend public se trouve dans `public/`. `web/` partage HTML/CSS/contrôleur/UI, mais utilise `local-adapter.js` pour parler au serveur Python.

Le bot automatique est un contrôleur paper dans `pilot.js`, inactif par défaut, et non un agent IA ou un exécuteur réel. Il ne dispose d’aucune méthode de signature ou d’ordre exchange. Les méthodes paper et la consultation du compte sont les seuls chemins d’action.

La source de données est ETH dans les deux éditions. Historiques BTC préservés par isolation du fichier `paper-eth.json` et de la clé `eth-atelier-web-paper-v2`. Levier par défaut 10, validé contre les métadonnées exchange lors d’une entrée.

Le contrôleur ignore les bougies déjà présentes au démarrage et celles manquées pendant une suspension. Il filtre les bougies 5 min et 1 h trop anciennes, refuse la duplication via Web Locks et garde au plus 200 événements de contrôle locaux. Les refus d’exécution sont journalisés. Le moteur maintient une position maximale et revalide frais, profondeur, prix, risque et capital.

Le portefeuille est privé à l’appareil ou à la configuration locale. Aucun wallet personnel n’est codé dans le site public. L’interface ne donne aucun droit sur les fonds. L’actualisation du wallet est de 30 s dans le navigateur et environ 60 s dans Python. Les données anciennes/partielles sont signalées.

Le site public conserve son URL historique `btc-atelier` pour ne pas casser les liens. Tout le contenu fonctionnel est ETH. Aucun backtest Python ne valide directement les performances du contrôleur v2.
