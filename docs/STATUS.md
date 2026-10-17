# État réel et reprise de travail

Revue documentaire : **17 octobre 2026**. Version logicielle : `1.2.0` dans `package.json`. La numérotation des versions publiées par l’hébergement est indépendante ; la version publiée et son historique se consultent dans Sites. Les modifications documentaires seules ne nécessitent pas une nouvelle publication de l’application.

## Implémenté

| Domaine | État et source |
|---|---|
| Terminal statique | Marché, Bot, Compte, Recherche ; Vite, DOM TS/JS et CSS |
| Connexion wallet | Parcours Bot visible, MetaMask depuis en-tête/Compte, lecture partagée, choix réseau gardé, erreurs et guide local ; autorisation et armement séparés |
| Hallmark / Bot | Bloc de connexion unique : étapes Compte/Autorisation/Démarrage, action principale contextuelle, compte et détails techniques repliables ; règles de trading conservées |
| UI / couleurs | Fond noir, surfaces graphite, navigation cyan, actions ambre, recherche violet ; gains/pertes verts/rouges, réseaux distingués par texte et couleur ; contrôles tactiles et focus clavier |
| Visualisations | Graphique financier incrémental, profondeur cumulée SVG ; horizons du Bot sans figure décorative ; pas de modèle de prédiction |
| Recherche | Replay récent en Worker, deux hypothèses de coûts, CSV |
| Paper web | Compte local et contrôleur de clôtures avec Web Locks |
| Exchange manuel | Wallet EIP-1193, testnet/mainnet, lot IOC + SL/TP et rapprochement |
| Bot web | Configuration et armement depuis le lien, coffre chiffré, même LiveEngine ; onglet visible et appareil éveillé |
| Automatisation Node | Agent dédié, session intraday, jusqu’à 4 tentatives, pause 30 min, objectif réalisé et réservation durable |
| Python/MCP | Compatibilité recherche/paper ; aucune mutation exchange réelle |
| Documentation | README court, AGENTS, guides actifs, archives identifiées et contrôle automatisé des liens/commandes |

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

Les sections datées suivantes décrivent des jalons successifs ; le dernier jalon précise les évolutions récentes.

## Nettoyage du 17 octobre 2026

Suppression de la figure orbitale du Bot, de ses styles, contrôles et observateurs, ainsi que de l’ancien module de tore non importé et de son test devenu sans objet. La chaîne de décision redondante est retirée : le diagnostic conserve les motifs et contrôles détaillés. Les commandes, lectures des horizons, règles Daily et protections exchange sont conservées.

Validation de cette passe : `npm run check` réussi (102 tests Vitest, 19 tests du moteur navigateur, builds web/Node et contrôle HTTP isolé). Aucun ordre envoyé. Le rendu visuel sur navigateur et iPhone reste non vérifié. Les deux anciens fichiers générés suivis sous dist sont retirés du suivi Git ; le build reste produit pour publication.

## Interface du 17 octobre 2026

Navigation et surfaces unifiées avec les polices locales et les tokens ambre/graphite. Le Bot affiche une prochaine étape issue de l’état wallet/service confirmé, avec raccourcis de navigation sans signature ni armement. Le compte se replie nativement sur petit écran et s’ouvre depuis le raccourci de connexion. Les commandes, horizons et diagnostics conservent leurs contrats.

Validation : `npm run check` réussi, 103 tests Vitest et 19 tests navigateur/VM, builds typés et contrôle HTTP isolé. Le nouveau test couvre la progression wallet → service → prêt, un envoi en attente et la perte de connexion sans action exchange. Rendu graphique et iPhone physique non vérifiés dans cet environnement.

## Intraday — 17 octobre 2026

Politique partagée navigateur/replay/Node : jusqu’à quatre opérations admissibles par jour UTC, objectif de session 100/200/500 USDC (défaut 200), une position à la fois, pause 30 min après entrée/sortie et arrêt après deux pertes. Taille ajustée au stop et aux coûts sous plafond 100 USDC / 1 % de l’équité / budget restant, marge ≤ 50 %. ADX minimal, plafond de volatilité et distance EMA20 filtrent les régimes et poursuites tardives. Ce sont des règles nouvelles, sans preuve de rentabilité.

Les compteurs d’essai et horaires restent persistants dans le service ; les anciens ledgers conservent leur tentative. Les refus/timeouts ne déclenchent pas de nouvelle entrée automatique. Le P&L réalisé et les frais sont distingués du funding et du latent non reconstruits.

La scène 3D Marché et ses contrôles sont supprimés. La courbe SVG utilise les quantités visibles exactes ; aucun flux supplémentaire ni boucle d’animation. Les widgets mettent en avant P&L, objectif et entrées. Documentation de stratégie, exploitation, architecture et consignes agents actualisée.

La nouvelle politique n’a pas été validée sur compte financé, en testnet de bout en bout, en simulation historique réelle hors échantillon ni sur iPhone physique. Le moteur Python/MCP garde ses règles paper historiques.

Validation de la politique intraday : `npm run check` réussi (109 tests Vitest, 19 tests moteur navigateur/VM, builds web et Node typés, contrôle HTTP du service dans un dossier temporaire). Les tests couvrent les arrêts de session, le refroidissement inter-opérations, le budget restant, la migration des compteurs et l’absence de renvoi automatique. Aucun wallet financé ni ordre exchange utilisé.

## Durcissement mainnet/testnet — 17 octobre 2026

Configuration réseau partagée et immuable ; refus des identifiants/endpoints incohérents, réponses du service validées, binding réseau des ledgers, agents obligatoirement distincts, signatures inter-onglets sérialisées, compte primaire revérifié, lectures périmées invalidées après déconnexion et journaux pending validés. Aucun changement du mandat de risque intraday.

Lectures publiques ETH : HTTP 200 sur mainnet et testnet. La signature MetaMask réelle et les ordres sur comptes financés restent non validés de bout en bout. Les contrats et preuves sont détaillés dans [NETWORKS.md](NETWORKS.md).

Validation de cette passe réseau : `npm run check` réussi, **124 tests Vitest + 20 tests moteur navigateur/VM**, builds web/Node typés et contrôle HTTP isolé. Les signatures SDK sont aussi produites puis récupérées cryptographiquement hors ligne avec une clé déterministe de test, pour les ordres et autorisations sur chacun des réseaux. Aucune clé personnelle, aucun fonds ni ordre exchange utilisé.

## Connexion simplifiée — 17 octobre 2026

Les commandes et le compte sont regroupés au-dessus des onglets Suivi/Réglages/Activité. Le parcours Compte → Autorisation → Démarrage reste visible ; les détails de connexion et le compte se déplient à la demande. L’action principale ouvre directement MetaMask pour lire le compte, puis peut transmettre un clic explicite à l’autorisation ou au démarrage existants. Sur mainnet, elle conduit d’abord au consentement fonds réels si celui-ci n’a pas été coché. Aucune mise à jour d’état ne signe ou n’arme automatiquement le pilote.

Les boutons techniques d’autorisation/démarrage restent les cibles internes des contrôles existants ; une seule action principale est présentée. Le réseau, les consentements, les refus d’opérations concurrentes et l’incertitude des envois restent conservés. Le guide local et les diagnostics sont disponibles sans occuper la vue principale. Les anciennes explications de simulation à une entrée et allocation fixe ont été corrigées.

Validation : 126 tests Vitest et 20 tests moteur navigateur/VM, builds web/Node et contrôle HTTP isolé. Tests spécifiques de consentement mainnet, déclenchement uniquement au clic et attente pendant une opération. Aucun fonds engagé. Rendu graphique sur navigateur et iPhone physique non contrôlé dans cet environnement.

## Audit correctif — 17 octobre 2026

[Rapport d’audit](AUDIT.md) : surveillance découplée des bougies/fills et du quota d’entrée, rapprochement limité aux quantités et au sens attribuables, confirmation stricte des brackets, conservation du pending manuel partiel, invalidation des anciennes validations paper et validation des métadonnées/journaux.

Validation : `npm run check` passé avec 136 tests Vitest + 20 tests navigateur/VM, builds typés et contrôle HTTP isolé. Dépendances Python installées dans un environnement temporaire : 18 tests passés. `npm audit` ne signale aucune vulnérabilité connue. Cargo absent : tests Rust non exécutés. Aucun fonds engagé, aucune validation graphique ou rentabilité démontrée. Le service Node local doit être mis à jour pour appliquer les corrections d’exécution.

## Connexion mémorisée — 17 octobre 2026

Le site public guide désormais les nouveaux utilisateurs vers OMEGA local avant la connexion du bot, afin d’éviter deux permissions sur deux origines. L’adresse publique et la préférence de reconnexion sont mémorisées ; la reprise vérifie `eth_accounts` et relit le compte sans demander d’accès ni signer. Un wallet verrouillé demande une action explicite, un compte changé invalide la préférence, et Déconnecter l’efface sans révoquer les agents.

Une action peut configurer Testnet + Mainnet avec deux approbations distinctes de 30 jours. Les agents du bon compte encore autorisés sont réutilisés ; une signature refusée sur le second réseau ne recommence pas le premier. L’état et la date d’expiration sont lus séparément auprès du service. La session HTTP locale se renouvelle une fois après un 401. Ni restauration ni approbation ne démarrent le bot ; consentement mainnet et armement restent explicites. Le guide fournit l’archive de la branche courante tant que la PR #2 n’est pas fusionnée.

Validation : `npm run check` passé avec **144 tests Vitest + 20 tests navigateur/VM**, builds web/Node typés et contrôle HTTP isolé. Tests nouveaux : restauration passive, compte changé/verrouillé, reprise UI, orientation du visiteur public, configuration des deux réseaux, refus/reprise partielle, sélection d’un seul réseau, session HTTP renouvelée et expiration/révocation affichées. Aucun wallet personnel, approbation réelle ni ordre exchange utilisé. Le rendu graphique et le parcours MetaMask réel restent à contrôler.

## Persistance et sauvegardes — 17 octobre 2026

État paper versionné/daté, génération précédente, validation au chargement et blocage des mutations sur corruption ou erreur de stockage ; conservation des données d’origine. Les réglages navigateur sont appliqués après écriture réussie. Compte propose un panneau repliable d’état du stockage, un export JSON des données locales des deux réseaux et une vérification SHA-256. La protection contre l’éviction reste une demande explicite au navigateur. Les erreurs de mémorisation du replay sont signalées.

Les ledgers Node sont validés et écrits atomiquement avec copie `.bak`, révision/date et permissions POSIX. Les réglages du dernier armement sont rechargés sans armer le moteur. Un fichier absent avec sauvegarde présente ou un état corrompu bloque le démarrage plutôt que de régénérer une identité. Une panne de sauvegarde désarme les entrées ; un échec de réservation ne transmet pas d’ordre et l’échec du journal ne provoque pas de rejet de tick non géré.

Validation : `npm run check` passé avec **157 tests Vitest + 23 tests navigateur/VM**, builds typés et contrôle HTTP réel incluant arrêt/redémarrage, agent identique, pending/quota/réglages conservés et token renouvelé. Aucun ordre ou agent financé utilisé. Le guide [DATA.md](DATA.md) précise les exclusions, limites, copies hors disque et récupération manuelle. Aucun stockage cloud personnel ni import automatique d’anciennes sauvegardes n’est livré. Rendu graphique et parcours MetaMask réel non vérifiés dans cet environnement.

## Exécution depuis le lien — 17 octobre 2026

Le site publié propose maintenant le bot web : connecter MetaMask, configurer les deux réseaux, régler et armer depuis la page, sans service local obligatoire. Les agents web portent des noms distincts de Node, limités à 16 caractères avant le suffixe d’expiration. Les agents valides sont repris et chaque réseau reste autorisé séparément. Mainnet exige toujours son consentement explicite et le compte MetaMask propriétaire est revérifié au démarrage.

LiveEngine est partagé entre Node et navigateur ; ses sauvegardes peuvent être asynchrones et sont attendues. Le coffre IndexedDB chiffre le ledger complet en AES-GCM avec clé de chiffrement non extractible via Web Crypto, révisions vérifiées et génération précédente chiffrée. Les clés d’agents restent hors localStorage, statuts et exports. Un lock d’exécution par réseau et un contrôle final au transport empêchent un second onglet ou une entrée tardive après arrêt/masquage de la page. Aucun moteur cloud permanent n’est ajouté.

La fermeture, le masquage ou le changement de compte stoppe les nouvelles entrées ; recharger reste désarmé et conserve les incertitudes. Les protections exchange persistent, mais leur surveillance locale dépend de l’onglet et de l’appareil. Le chiffrement ne protège pas d’un code compromis sur la même origine et le coffre n’est pas exporté. Les règles de risque, réservations, refus de renvoi et contrôles mainnet/testnet sont conservés. Le parcours et les limites sont dans [WEB.md](WEB.md).

Validation : `npm run check` passé avec **171 tests Vitest + 23 tests navigateur/VM**, builds web/Node typés et contrôle HTTP avec redémarrage. Les tests additionnels couvrent coffre chiffré, clé non extractible, corruption, mauvais réseau, écrivain périmé, transaction échouée, agents distincts, armement mainnet, commit avant transmission, onglet masqué, cycle de page, compte modifié et UI publique sans localhost. Signatures/noms web validés hors ligne via le SDK réel. `npm audit` signale 0 vulnérabilité connue. Aucun fonds, permission MetaMask réelle ou ordre exchange utilisé. QA graphique/extension et parcours financé de bout en bout non réalisés ; tests Rust non exécutés.
