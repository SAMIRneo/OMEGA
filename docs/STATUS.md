# État réel et reprise de travail

Revue documentaire : **16 octobre 2026**. Version logicielle : `1.2.0` dans `package.json`. La numérotation des versions publiées par l’hébergement est indépendante ; la version publiée et son historique se consultent dans Sites. Les modifications documentaires seules ne nécessitent pas une nouvelle publication de l’application.

## Implémenté

| Domaine | État et source |
|---|---|
| Terminal statique | Marché, Bot, Compte, Recherche ; Vite, DOM TS/JS et CSS |
| Connexion wallet | Parcours Bot visible, MetaMask depuis en-tête/Compte, lecture partagée, choix réseau gardé, erreurs et guide local ; autorisation et armement séparés |
| Hallmark / Bot | Première passe ciblée Workbench : colonne compte, espace de commande, polices locales dérivées d’IBM Plex, tokens partagés et progression native après lecture ; fonctions de trading conservées |
| UI / couleurs | Fond noir, surfaces graphite, navigation cyan, actions ambre, recherche violet ; gains/pertes verts/rouges, réseaux distingués par texte et couleur ; contrôles tactiles et focus clavier |
| Visualisations | Graphique financier incrémental, carnet L2 3D ; horizons du Bot sans figure décorative ; pas de modèle de prédiction |
| Recherche | Replay récent en Worker, deux hypothèses de coûts, CSV |
| Paper web | Compte local et contrôleur de clôtures avec Web Locks |
| Exchange manuel | Wallet EIP-1193, testnet/mainnet, lot IOC + SL/TP et rapprochement |
| Automatisation Node | Agent dédié, session locale, armement, nouvelle clôture, réservation durable et surveillance |
| Python/MCP | Compatibilité recherche/paper ; aucune mutation exchange réelle |
| Documentation | README court, AGENTS, cinq guides actifs, archives identifiées et contrôle automatisé des liens/commandes |

## Preuves disponibles

Lors de la revue du 16 octobre 2026, `npm run check` a passé : contrôle de la documentation, **102 tests Vitest + 20 tests du moteur navigateur**, builds typés web/Node et test HTTP du service dans un répertoire temporaire. Environnement : Node 24.19.0. Aucun agent exchange n’a été autorisé ni aucun ordre envoyé par ces vérifications. Un contrôle documentaire supplémentaire a passé après l’ajout de la carte des modules Python. La passe connexion MetaMask ajoute des tests de refus/reconnexion, changement de compte, lecture sans ordre, sélection du fournisseur et parcours public. Son rendu graphique et les fenêtres réelles de l’extension restent à contrôler sur appareil.

Les transports de signature/exécution des tests sont simulés. Ces résultats concernent le checkout vérifié ; ils ne constituent pas une certification durable du prochain commit.

Des lectures L2 publiques ETH ont répondu HTTP 200 sur testnet et mainnet le 16 octobre 2026. Cela prouve l’accès aux données publiques à cet instant, pas une connexion à un portefeuille financé.

Les tests Python/Rust demandent des toolchains séparées ; leur réussite n’est pas déduite de `npm run check`. Les nombres de tests peuvent évoluer : consulter la sortie actuelle plutôt que maintenir un nombre comme contrat logiciel.

## Non validé / non livré

- Aucun ordre signé depuis un wallet financé n’a validé cette version de bout en bout.
- Aucun service cloud permanent n’est déployé ; le processus local dépend de l’ordinateur et de son état de veille.
- Rendu final et fluidité Safari/iPhone physique non contrôlés dans cette session.
- Aucune rentabilité, robustesse hors échantillon ou calibration de probabilité démontrée.
- Historique profond et versionné avec liquidité, funding, liquidations et coûts de compte réels non intégré au replay.
- Pas de quota transactionnel global commun à tous les logiciels/machines du même compte.
- Clé d’agent locale sur disque, permissions système mais pas de coffre chiffré.
- Attribution de propriété de position limitée face à des interventions externes ; les positions nettes peuvent être ambiguës.
- Le frontend et le runtime comportent encore des ponts globaux et du JavaScript historique actif. L’étiquette « legacy » n’autorise pas leur suppression.

## Prochaines tâches proposées

| Priorité | Travail concret | Critère de fin |
|---|---|---|
| 1 | QA visuelle desktop/iPhone des sous-onglets, formulaires et scènes | Parcours, tailles, focus, gestes et réduction des mouvements réellement observés |
| 2 | Validation end-to-end testnet dans un environnement dédié | Approbation, ordre, fill partiel/refus, protections et rapprochement constatés ; reçus sans secrets |
| 3 | Durcir les transitions/reprises du service | Scénarios de crash, fin de jour, révocation et état incertain documentés/testés |
| 4 | Améliorer l’infrastructure de recherche | Historique versionné, coûts/liquidité explicités, séparation chronologique indépendante |
| 5 | Réduire progressivement les ponts globaux | Contrats typés et tests préservés ; migration ciblée, sans réécriture totale incidente |

Ces lignes décrivent du travail restant, pas des capacités déjà acquises. Une validation du compte de l’utilisateur relève de son exploitation avec son wallet, pas d’un effet de bord d’une contribution au code.

## Pour reprendre immédiatement

Lire AGENTS → ARCHITECTURE → DEVELOPMENT, lancer `npm ci` si nécessaire puis `npm run check`. Choisir ensuite une tâche de portée bornée. Pour comprendre une décision, consulter STRATEGY et la source ; pour une panne de service, OPERATIONS. Ne pas utiliser les archives comme contrat actuel.

## Nettoyage du 17 octobre 2026

Suppression de la figure orbitale du Bot, de ses styles, contrôles et observateurs, ainsi que de l’ancien module de tore non importé et de son test devenu sans objet. La chaîne de décision redondante est retirée : le diagnostic conserve les motifs et contrôles détaillés. Les commandes, lectures des horizons, règles Daily et protections exchange sont conservées.

Validation de cette passe : `npm run check` réussi (102 tests Vitest, 19 tests du moteur navigateur, builds web/Node et contrôle HTTP isolé). Aucun ordre envoyé. Le rendu visuel sur navigateur et iPhone reste non vérifié. Les deux anciens fichiers générés suivis sous dist sont retirés du suivi Git ; le build reste produit pour publication.

## Interface du 17 octobre 2026

Navigation et surfaces unifiées avec les polices locales et les tokens ambre/graphite. Le Bot affiche une prochaine étape issue de l’état wallet/service confirmé, avec raccourcis de navigation sans signature ni armement. Le compte se replie nativement sur petit écran et s’ouvre depuis le raccourci de connexion. Les commandes, horizons et diagnostics conservent leurs contrats.

Validation : `npm run check` réussi, 103 tests Vitest et 19 tests navigateur/VM, builds typés et contrôle HTTP isolé. Le nouveau test couvre la progression wallet → service → prêt, un envoi en attente et la perte de connexion sans action exchange. Rendu graphique et iPhone physique non vérifiés dans cet environnement.
