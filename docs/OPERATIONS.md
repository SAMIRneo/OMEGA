# Exploitation, connexion et diagnostic

## Choisir le bon runtime

| Runtime | Démarrage | Adresse | Capacité |
|---|---|---|---|
| Vite | `npm run dev` | URL affichée par Vite | Développement du terminal, paper et bot web |
| Site publié | Ouvrir le site public | Domaine OMEGA | Connexion, réglages et bot web dans un onglet visible ; aucun processus permanent hébergé |
| Node permanent | `npm run build` puis `npm run bot` | `http://127.0.0.1:8766/#pilot` | Signature déléguée et surveillance tant que le processus tourne |
| Python historique | Dépendances + `config.json`, build web, `python app.py` | `http://127.0.0.1:8765` | Recherche/paper/MCP, pas d’ordres exchange |

Pour Node, employer exactement `127.0.0.1:8766`, pas un domaine personnalisé ni `localhost` : le contrôle Host du service est strict. Ouvrir l’interface sur le même ordinateur. Le site public ne sonde pas automatiquement le localhost du visiteur.

Le parcours sans installation est dans [WEB.md](WEB.md). Les sections Node ci-dessous concernent le service optionnel.

## Mise en route Node

```sh
npm ci
npm run build
npm run bot
```

`npm run bot` reconstruit le bundle Node. Après les deux builds, `npm run start:bot` permet de relancer sans reconstruire. Le répertoire courant doit être la racine du dépôt : le service lit le build web et le WASM avec des chemins relatifs à cette racine.

1. Ouvrir l’interface locale dans le navigateur contenant MetaMask (ou un wallet EIP-1193 injecté).
2. Choisir le réseau dans OMEGA ; le réseau sélectionné fixe REST, WebSocket et source de signature.
3. En tête de Bot, cliquer « Connecter MetaMask », autoriser le partage de l’adresse, puis vérifier le compte Hyperliquid et les positions affichées. Cette étape ne signe aucun ordre.
4. Dans les commandes du bot, conserver « Configurer Testnet + Mainnet ensemble » puis cliquer « Configurer dans MetaMask ». Deux signatures distinctes autorisent les agents pour 180 jours maximum. Seuls les réseaux manquants demandent une signature ; une autorisation valide est réutilisée sans rotation de clé. Décocher permet de configurer seulement le réseau sélectionné.
5. Vérifier le compte/réseau effectivement affichés, puis régler profil et plafond de levier dans Réglages.
6. Revenir à Suivi, autoriser explicitement les fonds réels si Mainnet, puis démarrer le pilote.

Le bouton de connexion est aussi accessible dans l’en-tête et dans Compte. Sur le site public, il établit la session wallet utilisée pour les lectures, les signatures manuelles et la configuration explicite du bot web. Le service Node n’est pas requis ; ses commandes HTTP ne sont utilisées que sur son origine locale. Une erreur de changement de réseau remonte dans le parcours de connexion, sans contourner les gardes. Si plusieurs extensions sont installées, OMEGA privilégie MetaMask annoncé via EIP-6963, puis le fournisseur injecté compatible.

Les USDC du compte paper ne financent pas le testnet. Un compte lu n’est pas un agent autorisé ; une autorisation d’agent n’arme pas automatiquement les entrées.

## Cycle de vie Node

| Situation | Comportement implémenté |
|---|---|
| Démarrage/redémarrage du processus | Entrées désarmées ; état durable chargé |
| Armement | Vérifie agent, paramètres, compte, quota et exposition ; mémorise la clôture courante |
| Nouvelle clôture éligible | Réévalue, règle le levier, relit les données, réserve puis envoie |
| Onglet fermé | Le processus Node peut continuer ; le paper navigateur peut être suspendu |
| Arrêter les entrées | Désarme les nouvelles entrées ; ne clôture pas automatiquement une position existante |
| Position du bot enregistrée | Surveillance maintenue, y compris après désarmement et reprise du processus |
| Envoi incertain | Désarmement et conservation du pending ; pas de nouvelle entrée automatique |
| Coupure/veille | Pas de nouveau contrôle local ; les protections déjà acceptées restent côté exchange |
| Perte de connexion de l’UI | État courant à vérifier ; ne constitue pas une confirmation d’arrêt du processus |
| Révocation/expiration d’agent | Les entrées sont arrêtées ; les signatures ultérieures peuvent être refusées |

Le tick du service est de 10 s. Les requêtes ont un délai maximal de 12 s ; les erreurs déclenchent une temporisation croissante. Une clôture manquée n’est pas rattrapée.

## API HTTP Node

Les routes appartiennent au service local, pas au domaine public statique. Pas de CORS. Host, Origin et provenance cross-site sont contrôlés. Les réponses sont non mises en cache.

`GET /api/live/session` délivre la session du processus à l’interface de même origine. Les autres routes demandent l’en-tête `X-Omega-Session` et `?network=testnet` ou `?network=mainnet`. Ne pas recopier le jeton dans des logs ou exemples personnels.

| Méthode / chemin | Corps / responsabilité |
|---|---|
| GET `/api/live/status` | État du réseau : agent public, compte, flags, heartbeat, équité connue, événements et réglages |
| POST `/api/live/configure` | `{owner}` : adresse du compte ; préparation idempotente ; réutilise l’agent valide ou la préparation récente inutilisée, sinon rotation ; refus si occupé, exposé ou pending |
| POST `/api/live/verify` | `{}` : vérifie l’approbation de l’agent sur le réseau |
| POST `/api/live/arm` | `{settings: {profile, leverage, dailyTarget?}, consent?}` ; `consent` doit être `MAINNET` sur mainnet |
| POST `/api/live/stop` | `{}` : arrête les nouvelles entrées |
| POST `/api/live/reconcile` | `{}` : rapproche un cloid enregistré avec les statuts/fills exchange, moteur désarmé |

Objectif `dailyTarget` : 100, 200 ou 500 USDC ; défaut 200. Il est relu au démarrage du pilote et ne constitue pas une promesse de résultat. Profils : `balanced`, `selective`, `aggressive`. Levier : entier 1 à 15, soumis aussi aux métadonnées et au plan final. Les erreurs applicatives renvoient un objet `{error}` ; la présence d’une réponse HTTP n’est pas une preuve de fill ou de protection.

`status` n’expose pas la clé privée, le token ou le nonce. Un heartbeat est l’heure du dernier snapshot réussi du moteur ; ce n’est pas une preuve d’une décision ou d’un ordre récent. Les événements sont propres au service ; le journal paper se trouve dans Compte.

## Persistance

| Emplacement | Contenu |
|---|---|
| `.omega-runtime/testnet.json`, `.omega-runtime/mainnet.json` | Clé d’agent, compte, nonce, tentative UTC, envoi pending, propriété de position, réglages et événements |
| `.omega-runtime/runner.pid` | Verrou d’un processus sur cette installation |
| localStorage navigateur | Paper, réglages et recherche séparés par réseau/origine/appareil |
| `config.json`, `data/` | Configuration, token et état du moteur Python historique |

Les fichiers Node sont versionnés, écrits en temporaire, synchronisés puis renommés ; une génération précédente `.bak` est conservée et les schémas sont validés au chargement. Une corruption bloque le démarrage, sans restauration aveugle ni remise à zéro. Ils ne forment pas un coffre chiffré. Permissions POSIX : répertoire 0700, fichiers 0600. Protéger l’accès au compte système. Ne pas copier un runtime actif entre plusieurs ordinateurs et ne pas réutiliser une même clé dans deux processus de signature.

Ne pas effacer un runtime pour « débloquer » une erreur : cela efface aussi les informations de quota et de rapprochement. Les protections exchange peuvent survivre aux fichiers locaux.

## Diagnostic

| Symptôme | Vérification utile |
|---|---|
| Bot indisponible sur le site public | Vérifier HTTPS, Web Locks, IndexedDB et Web Crypto ; voir le guide WEB. Pour Node, ouvrir son origine locale |
| Host refusé | Employer l’URL exacte `127.0.0.1:8766` |
| Port occupé / service déjà actif | Identifier le processus concerné ; ne pas terminer un service utilisateur au hasard |
| Agent non autorisé/expiré | Vérifier le réseau, le compte propriétaire et l’approbation wallet |
| Équité paper mais testnet vide | Les fonds fictifs ne sont pas le solde exchange |
| Pas d’entrée malgré des indicateurs | Lire la chaîne de décision et le motif du service ; l’alignement seul n’est pas un signal complet |
| Historique ancien ou troué | Attendre une acquisition valide ; ne pas affaiblir le garde-fou |
| Envoi à vérifier | Arrêter les entrées, rapprocher cloid/fills et examiner les protections ; aucune relance d’entrée aveugle |
| Position modifiée hors bot | Le suivi de propriété est limité ; vérifier taille, sens et protections du compte |
| Test HTTP local échoue au démarrage | `test:service` utilise aussi 8766 ; il exige ce port libre et n’arrête pas votre service |

## Compatibilité Python/MCP

Installer les dépendances Python dans un environnement virtuel. Copier manuellement `config.example.json` vers `config.json` **si le fichier personnel n’existe pas**, renseigner l’adresse publique, puis construire le frontend et lancer `python app.py`. `start.ps1` est le raccourci historique de ce serveur Python, pas un lanceur Node.

`agent_bridge.py` est un serveur MCP stdio, pointé par `mcp-config.example.json`. Il utilise `ATELIER_URL` ou `http://127.0.0.1:8765`. Outils : `eth_state`, `eth_candles`, `paper_open`, `paper_close`. Les deux mutations sont des simulations ; elles utilisent le token local produit par Python. Ce MCP n’est pas une passerelle vers les ordres réels du runner Node.

## Session intraday

Jusqu’à quatre tentatives locales UTC, avec comptage conservateur des entrées exchange. Une position à la fois. Pause de 30 min après l’entrée ou la dernière sortie ; après deux ordres de clôture perdants consécutifs du compte, les nouvelles entrées sont bloquées jusqu’au lendemain UTC. Les fills partiels sont regroupés par oid pour ce calcul. Le P&L est réalisé, frais USDC déduits ; le funding et le latent ne sont pas intégrés.

Un objectif atteint bloque les nouvelles entrées, sans supprimer les protections ni arrêter la surveillance. Le processus peut rester marqué actif pendant une pause de session. Un envoi incertain exige toujours un rapprochement et un réarmement explicites. L’expiration du pending ne restitue pas sa tentative consommée. Aucun martingale ou relèvement du budget après perte.

## Rapprochement et données indisponibles

Un accusé de réception partiel du lot manuel conserve son journal pending. Aucune nouvelle entrée n’est permise avant la vérification explicite. La confirmation exige un fill d’entrée valide et deux statuts de protection reconnus ; elle ne garantit pas leur maintien ultérieur.

Le rapprochement Node refuse d’adopter une position inversée ou supérieure aux fills attribuables à l’ordre enregistré. Ne pas effacer le pending pour contourner ce refus : examiner les interventions externes et le compte. La surveillance des positions ne charge pas les bougies ou fills quotidiens et ne dépend pas d’un budget disponible pour une nouvelle entrée. Elle nécessite toujours les données de compte, ordres, métadonnées et carnet.

## Connexion mémorisée du service Node

Pour utiliser le service Node optionnel, commencer directement dans `http://127.0.0.1:8766/#pilot`. Les permissions MetaMask et le stockage du site public sont distincts de ceux de cette origine locale. Cette version correspond à la branche `main` du [dépôt GitHub](https://github.com/SAMIRneo/OMEGA) ; c’est la source de référence pour une installation.

Le navigateur mémorise uniquement l’adresse publique et la préférence de reconnexion. À la prochaine visite de Bot/Compte, `eth_accounts` vérifie passivement le compte primaire déjà autorisé. Aucun popup d’accès, signature, approbation d’agent ou armement n’est déclenché par cette reprise. Si MetaMask est verrouillé, le compte reste mémorisé : au déverrouillage ou au retour sur la page, le même compte est repris passivement quand il est exposé par MetaMask. Un changement de chaîne EVM ne délie pas le compte. Si le compte change réellement, la préférence est effacée et une connexion explicite est requise. Déconnecter oublie la préférence ; cela ne révoque pas les agents ni les ordres exchange.

Le service conserve ses clés distinctes et vérifie les approbations exchange au chargement puis environ chaque minute pendant les rafraîchissements visibles. La date confirmée apparaît pour chaque réseau. La configuration explicite saute les agents du bon compte encore valides ; un agent expiré/révoqué reçoit une nouvelle clé avant signature, afin de ne pas réutiliser un nonce potentiellement purgé. Si la seconde signature est refusée, « Compléter la configuration des réseaux » reprend uniquement les réseaux manquants. Les envois d’ordre incertains restent soumis à la réconciliation existante.

Les nouvelles autorisations demandent 180 jours maximum selon la demande signée et restent révocables depuis Hyperliquid ; une expiration ou révocation exige une nouvelle signature. La reprise du compte n’est donc pas une connexion définitive sans limite. Un redémarrage du processus renouvelle automatiquement la session HTTP locale lors d’un refus 401, une seule fois. Les nouvelles entrées restent désarmées après redémarrage. Mainnet exige toujours le consentement fonds réels et un clic de démarrage séparé.

Le fonctionnement des exports, copies automatiques, erreurs de stockage et récupérations est détaillé dans [DATA.md](DATA.md).
