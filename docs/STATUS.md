# État actuel d’OMEGA

Revue du 18 octobre 2026, version `1.2.0`. Cette page décrit la version de référence sur `main`. Les anciennes variantes ne sont plus maintenues.

## Capacités livrées

| Domaine | Comportement actuel | Référence |
|---|---|---|
| Interface | Terminal DOM TypeScript/JS, direction ALPHA sable/or et nuit/bleu ardoise, navigation latérale et six vues, graphique ETH et profondeur SVG ; aucune figure 3D | [Architecture](ARCHITECTURE.md) |
| Bot web | Connexion MetaMask, configuration des deux réseaux, réglages et démarrage depuis le lien ; onglet visible et appareil éveillé requis | [Mode web](WEB.md) |
| Service Node optionnel | Même LiveEngine, HTTP local sur 127.0.0.1:8766, indépendant de l’onglet tant que le processus fonctionne | [Exploitation](OPERATIONS.md) |
| Simulation / manuel | Capital fictif séparé ; ordres manuels signés par le wallet, distincts du bot délégué | [README](../README.md) |
| Stratégie | Règles Daily/1 h/15 min, jusqu’à quatre tentatives UTC, une position, pause, objectifs réalisés et budgets de risque | [Stratégie](STRATEGY.md) |
| Réseaux / connexion | Agents distincts par réseau et mode ; connexion mémorisée, approbation de 180 jours maximum par réseau manquant ; jamais d’armement automatique | [Réseaux](NETWORKS.md) |
| Persistance | Coffre web AES-GCM/IndexedDB ; ledgers Node atomiques ; écritures attendues avant envoi, corruption bloquante, copies précédentes sans restauration automatique | [Données](DATA.md) |
| Export | Données navigateur autorisées en JSON avec vérification SHA-256 ; CSV de simulation/recherche ; aucun export des clés ou permissions | [Données](DATA.md) |
| Recherche | Replay récent 7/14 jours en Worker ; coûts et liquidité simulés, sans preuve de rentabilité | [Stratégie](STRATEGY.md) |
| Compatibilité | Python/MCP paper-only conservé à la racine sur le port 8765 | [Architecture](ARCHITECTURE.md) |

## Organisation actuelle

`frontend/` possède l’interface et les adaptateurs navigateur ; `shared/` possède LiveEngine, sa politique et la validation du ledger ; `runner/` possède uniquement l’intégration Node. Les calculs purs Daily, indicateurs et réseaux restent canoniques dans `frontend/core/`, importés par le moteur partagé. Ils ne sont pas dupliqués. Les tests du moteur et de la persistance sont placés avec leur code et découverts par `vitest.config.ts`.

Le parcours conserve la préférence wallet lors du verrouillage et des changements de chaîne EVM ; le même compte est repris passivement, un autre compte l’invalide. Les agents valides gardent leur expiration réelle, les nouvelles demandes affichent 180 jours maximum. Les préparations récentes inutilisées survivent au refus/rechargement, et les états des deux réseaux sont vérifiés séparément. Une activité Node confirmée reste affichée sans exiger une reconnexion MetaMask.

README et index orientent vers un guide par sujet. Les documents obsolètes ont été supprimés ; les procédures ci-dessus décrivent la version actuelle.

## Vérifications

La passe de connexion du 17 octobre a validé `npm run check` : **185 tests Vitest sur 26 fichiers et 23 tests navigateur/VM**, builds typés web/Node et contrôle HTTP réel temporaire avec redémarrage. Les tests couvrent aussi la reprise après verrouillage, le compte inchangé/modifié, la déconnexion explicite, les autorisations 180 jours des agents web/Node via le vrai SDK, la préparation idempotente, la confirmation persistée, la révocation, l’interruption et la panne isolée de l’autre réseau. Les transports sont simulés ; aucune permission personnelle ni aucun ordre exchange n’est utilisé.

Le contrôle documentaire est relancé après le retrait des documents obsolètes. Le nouveau contrôle de structure vérifie 49 modules et leurs imports littéraux ; trois sondes temporaires ont confirmé le refus d’un import frontend → Node, shared → adaptateur web et shared → API Node. Il ne vérifie pas les globals dynamiques ou l’intérieur des dépendances tierces.

Les 18 tests Python ont passé lors de l’audit antérieur ; ils ne sont pas inclus dans `npm run check`. Cargo était absent : aucun test Rust ni régénération WASM n’est revendiqué. Les lectures publiques et signatures SDK hors ligne antérieures ne prouvent pas un parcours MetaMask réel.

## Limites et travail restant

- Aucun parcours MetaMask/ordre financé de bout en bout validé pour cette version ; validation testnet dédiée à réaliser par l’exploitant.
- QA graphique desktop et responsive réalisée dans le navigateur ; Safari et iPhone physique non vérifiés.
- Aucun serveur cloud de trading permanent. Le bot web dépend de l’onglet ; Node dépend du processus et de l’ordinateur.
- Aucune rentabilité, calibration probabiliste ou validation économique hors échantillon démontrée.
- Pas de sauvegarde cloud personnelle, d’export des clés du coffre web ou de restauration automatique des états d’exécution.
- Pas de quota transactionnel global entre logiciels/appareils ; attribution d’une position nette limitée face aux interventions externes.
- Ledgers Node protégés par les permissions du système, sans chiffrement applicatif. Le coffre web ne protège pas d’un code compromis sur la même origine.
- Ponts globaux et JavaScript historique encore actifs : réduction progressive, sans suppression incidente.

Pour reprendre : lire [AGENTS](../AGENTS.md), [ARCHITECTURE](ARCHITECTURE.md) et [DEVELOPMENT](DEVELOPMENT.md), puis lancer les contrôles appropriés. Les preuves sont celles du checkout testé, pas une certification des futurs changements.

## Interface actuelle — cockpit ALPHA

La référence ALPHA est intégrée dans la présentation OMEGA : polices locales Bricolage Grotesque et Instrument Serif, thèmes clair brume et sombre nuit/bleu ardoise, grande carte de capital et widgets asymétriques. `frontend/studio.css` porte cette direction unique. Le cockpit est la page d’accueil, avec six destinations : Cockpit, Marché, Bot, Compte, Historique et Lab.

Le capital affiché est soit la simulation, soit le compte perpétuel récemment consulté (75 secondes maximum). Le sélecteur ne change pas le mode d’exécution. Les périodes 1/7/30 jours ou tout filtrent les clôtures enregistrées sur cet appareil ; aucun historique exchange n’est inventé. La courbe inclut le capital valorisé actuellement, et signale les périodes sans clôture. Les widgets affichent le bot confirmé sur le réseau courant, la position ETH, le diagnostic sur bougies clôturées, la marge et la perte simulée du jour, puis les décisions réellement enregistrées. Aucun faux chat IA, stratégie multi-actifs ou résultat de la maquette n’est présenté comme implémenté.

La commande « Arrêter les entrées » réutilise le contrôle existant du service et ne ferme pas les positions. Les règles, autorisations et données conservées ne changent pas. La source de référence reste `main`, avec un seul checkout local dans `C:\Users\samir\Desktop\bot`.

## Fiabilité de l’interface — 18 octobre

Les erreurs de chargement ne sont plus effacées par un rafraîchissement du marché : un panneau indépendant permet de relancer les seuls modules en échec, sans rechargement du bot ni répétition d’une action wallet. Les tentatives simultanées sont regroupées. Le panneau est annoncé et utilisable au clavier. La liquidité affiche le nombre réel de niveaux observés, avec suppression des courbes et valeurs lorsque le carnet devient ancien. La documentation des couches CSS décrit le thème courant.

Les tests de non-régression vérifient erreurs multiples, reprise partielle, concurrence et exclusion des signatures du mécanisme de relance, ainsi que les carnets incomplets et anciens.

Validation de cette passe : **188 tests Vitest et 23 tests navigateur/VM** (211 au total), builds web/Node et contrôle HTTP isolé avec redémarrage réussis. Les cinq vues ont été contrôlées à 320, 768 et 1440 pixels sans débordement, sans erreur console observée. Les scénarios d’échec/reprise sont simulés dans les tests ; aucune signature ni aucun ordre réel testé.

Validation du cockpit ALPHA : **191 tests Vitest et 23 tests navigateur/VM**, soit 214 tests, builds web/Node et contrôle HTTP isolé avec redémarrage réussis. Les tests couvrent la séparation compte/simulation, les lectures anciennes, les périodes de capital et la délégation explicite de l’arrêt. Contrôle visuel des six vues dans les deux thèmes à 320, 390, 768 et 1440 pixels : 48 vérifications sans débordement horizontal, aucune erreur console observée. Les grandes valeurs sont dimensionnées sans coupure au petit format. Aucun ordre réel ni permission wallet utilisée pour ces validations.

## Palette et préparation wallet — 18 octobre 2026

- Accent bleu ardoise à la place de l’or, fonds neutres brume/nuit, favicon et graphiques cohérents. Retrait du bloc historique de couleurs minérales qui imposait encore des accents différents par vue.
- Contrôle navigateur visible avant connexion : HTTPS, wallet compatible, Web Crypto, transaction IndexedDB, localStorage, Web Locks et statut de persistance. Aucun agent ni permission créé par cette sonde.
- Déconnexion du fournisseur : session de lecture invalidée, préférence conservée, arrêt des nouvelles entrées web via le store wallet. Échec de mémorisation du compte signalé au lieu d’annoncer une sauvegarde.
- Revue de l’API officielle Hyperliquid / MetaMask et lectures publiques Mainnet + Testnet détaillées dans NETWORKS.md. Réutilisation des accords valides et refus partiel entre réseaux couverts par les tests d’orchestration.
- Le parcours signé avec le portefeuille personnel et une exécution exchange de bout en bout restent à réaliser par l’utilisateur. Aucun bot cloud permanent ni connaissance hors des flux reçus n’est ajouté.

Validation de cette passe : **198 tests Vitest + 23 tests navigateur/VM (221)**, typage et builds web/Node, contrôle HTTP isolé et redémarrage réussis. Revue des textes DOM visibles dans les six vues et les deux thèmes, y compris panneaux Bot ouverts / réglages / activité : seuil 4,5:1 pour le texte courant, 3:1 pour le grand texte ; corrections des anciennes couleurs cyan/sable et des textes pâles. Cette mesure des styles calculés ne constitue pas un audit WCAG complet (canvas, états non affichés et aides natives du wallet exclus). Contrôle du parcours à 320 px sans débordement horizontal. Le diagnostic réel du navigateur de QA confirme la transaction IndexedDB et signale l’absence de fournisseur MetaMask ; aucune permission personnelle n’est utilisée.

La vérification du build publié a détecté un échec d’initialisation des schémas SDK (`expects`) dans les modules différés, absent en développement. Le build impose désormais l’ordre d’exécution des modules avec `strictExecutionOrder` de Rolldown, tout en conservant le chargement différé. Le contrôle `npm run test:bundle`, ajouté à `npm run check`, importe le vrai bundle du moteur avec un coffre temporaire et refuse toute requête extérieure : les deux réseaux restent désarmés et aucun agent n’est créé. Le build corrigé a également été ouvert en navigateur : mode web disponible et outils manuels chargés, aucune erreur console observée, sans connecter de wallet.


## Connexion et lancement Hyperliquid — 18 octobre 2026

- Connexion explicite par `eth_requestAccounts`, restauration passive distincte, sélection EIP-6963 avec préférence MetaMask et erreurs imbriquées lisibles. `signatureChainId` suit la chaîne du wallet ; `hyperliquidChain` et le transport restent propres à Testnet/Mainnet.
- Connexion téléphone/QR ajoutée avec MetaMask Connect EVM 2.1.1, sans analytics ni chargement initial. Fenêtre OMEGA en français, annulation explicite/Escape, QR éphémère uniquement dans le DOM. Une seule adresse autorisée est acceptée pour éviter de confondre les comptes cumulés des sessions SDK. Reconnexion téléphone explicite après rechargement ; aucun redémarrage du bot.
- Chaque réseau peut être autorisé séparément, même si l'autre est indisponible. Erreurs d'autorisation/lancement conservées pendant les rafraîchissements. Compte perpétuel à solde nul signalé avant démarrage ; liens vers les applications officielles par réseau.
- Lecture de compte dégradée : solde et propriétaire conservés si les lectures secondaires échouent, état des ordres inconnu affiché comme indisponible, lecture complète obligatoire avant envoi. Aucun faux ordre vide utilisé pour autoriser une entrée.
- QA navigateur du build de production : ouverture du QR et annulation sans wallet personnel ; deux thèmes, boutons du compte et autorisations séparées, contrôles à 390 et 320 px sans débordement horizontal. Le SDK peut journaliser un timeout de révocation d'une session QR jamais appairée après annulation ; la fenêtre et les boutons OMEGA sont libérés immédiatement. Les contrôles automatisés ne constituent pas un appairage téléphone ou un trade financé de bout en bout.

Validation : 209 tests Vitest et 23 tests navigateur/VM, compilation web/Node, import du bundle réel sans requête extérieure et contrôle du service isolé. Aucun ordre réel envoyé. L'audit npm signale six avis modérés transitifs du SDK MetaMask autour de uuid ; aucun avis élevé/critique, aucun correctif forcé incompatible appliqué.
