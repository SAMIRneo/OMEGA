# Utiliser OMEGA depuis le lien

Le site publié permet la connexion MetaMask, la configuration de Testnet et Mainnet, les réglages, l’armement du bot, l’arrêt des entrées et la réconciliation. Aucun terminal ou service local n’est nécessaire pour ce mode. Ouvrir [OMEGA](https://omega.kairos-labspro.chatgpt.site/#pilot) dans un navigateur avec MetaMask, Web Locks, Web Crypto et IndexedDB disponibles, sur une origine sécurisée.

## Vérifier cet appareil avant la connexion

Dans Bot, ouvrir **Préparation de cet appareil**. Le contrôle ne demande aucun accès au wallet, ne crée aucun agent et ne signe rien : il vérifie HTTPS, le fournisseur EIP-1193, Web Crypto, Web Locks, une transaction réelle IndexedDB et un aller-retour de la préférence localStorage. La sonde du coffre n’accède à aucun enregistrement d’agent ; sa valeur temporaire est supprimée dans la même transaction. Une erreur de stockage est affichée. Le statut de stockage persistant est lu sans demander de permission.

Une écriture de préférence échouée n’est plus annoncée comme « compte mémorisé ». Une déconnexion du fournisseur MetaMask invalide la session en conservant la préférence publique ; elle est publiée aux moteurs web afin d’arrêter leurs nouvelles entrées. Elle ne révoque pas les agents sur Hyperliquid.

Les deux comptes Hyperliquid doivent disposer de leurs propres fonds sur le réseau choisi. OMEGA ne dépose pas de fonds : consulter l’[onboarding officiel](https://hyperliquid.gitbook.io/hyperliquid-docs/onboarding/how-to-start-trading). Une lecture publique réussie n’établit pas qu’un compte est financé ou autorisé. Le contrôle avant armement vérifie les fonds, l’exposition et l’agent.

## Parcours

1. Dans **Bot**, connecter MetaMask et vérifier le compte ainsi que le réseau affichés. L’accès à l’adresse ne signe aucun ordre.
2. Conserver **Configurer Testnet + Mainnet ensemble**, puis cliquer **Configurer dans MetaMask**. Chaque réseau manquant demande sa propre signature ; l’autorisation est demandée pour 180 jours maximum et reste révocable. Les autorisations valides du même compte sont conservées.
3. Dans **Réglages**, choisir profil, plafond de levier et objectif journalier. Les soldes doivent être ceux du compte Hyperliquid du réseau choisi ; le capital de simulation ne finance pas les ordres réels.
4. Choisir le réseau à utiliser. Pour Mainnet, cocher le consentement aux fonds réels puis cliquer **Démarrer le bot**. L’armement attend une nouvelle clôture admissible ; il ne transmet pas une entrée immédiatement.
5. Garder l’onglet ouvert et visible, l’appareil éveillé et connecté. Arrêter les entrées ou vérifier un pending depuis les commandes existantes. Les ordres manuels et leur clôture restent accessibles avec le wallet.

Une signature refusée sur le second réseau conserve le premier. Une préparation non confirmée, inutilisée (nonce nul) et âgée de moins de 24 heures conserve aussi son agent après refus ou rechargement ; aucune signature n’est relancée automatiquement. Le bouton de complément reprend le réseau manquant. Une expiration/révocation confirmée ou une identité déjà utilisée non autorisée entraîne une nouvelle clé avant réautorisation, sans recycler un ancien nonce. Une panne de lecture ne déclenche aucune rotation. Le navigateur ne demande jamais la clé privée ou phrase de récupération MetaMask.

## Une connexion, puis réutilisation

| Situation | Ce que fait OMEGA |
|---|---|
| Première configuration des deux réseaux | Une permission de compte MetaMask, puis deux signatures d’agent distinctes ; durée demandée de 180 jours maximum, révocable |
| Retour sur la même adresse du site et le même navigateur | Restauration passive via eth_accounts, puis vérification indépendante des agents auprès d’Hyperliquid ; aucune signature si valides |
| Changement du réseau EVM affiché dans MetaMask | Le compte mémorisé est conservé ; le sélecteur OMEGA et le transport signé choisissent Hyperliquid mainnet/testnet |
| MetaMask verrouillé ou accès aux comptes suspendu | Le compte et les agents restent mémorisés ; nouvelles entrées web arrêtées. Déverrouiller reprend la lecture sans nouvelle permission si MetaMask expose le même compte |
| Véritable changement de compte ou clic Déconnecter | Session oubliée, nouvelles entrées web arrêtées ; aucune substitution silencieuse du propriétaire |
| Agent expiré/révoqué, coffre effacé ou autre appareil/origine | Nouvelle configuration pour le réseau concerné ; les autres autorisations valides restent conservées |

Les agents existants gardent leur expiration réelle, y compris ceux précédemment autorisés pour 30 jours. Ils ne sont ni prolongés ni remplacés automatiquement. La date relue sur chaque réseau fait autorité. Le focus de la page et le déverrouillage ne demandent jamais eth_requestAccounts, de signature ou d’armement.

Le compte reste lié au bot, mais l’autorisation n’est pas une connexion illimitée. Recharger la page conserve le lien et exige un clic Démarrer. Pour une activité indépendante de l’onglet, utiliser le service Node et maintenir son processus actif ; fermer ce site statique ne laisse aucun moteur hébergé tourner.

## Exécution et interruptions

Le mode web instancie le même [LiveEngine](../shared/engine.ts) que Node : données propres au moteur, Daily/1 h/15 min, revalidation après réglage du levier, jusqu’à quatre tentatives, marge ≤ 50 %, budget automatique ≤ min(100 USDC, 1 % de l’équité, 90 % du budget restant), IOC + SL/TP reduce-only et aucun renvoi automatique d’une entrée incertaine.

Masquer l’onglet arrête les nouvelles entrées et interrompt un armement en cours. Le transport vérifie encore l’état de l’onglet et l’autorité du moteur au moment d’envoyer une entrée, après signature et sauvegarde du nonce. Une requête déjà partie vers l’exchange ne peut pas être annulée par la fermeture de la page : son pending durable reste à réconcilier.

Après rechargement ou retour de cycle de page, le moteur relit le même agent, ses compteurs, réglages et incertitudes, mais reste désarmé. Une nouvelle action de démarrage est nécessaire. Un changement ou une déconnexion du compte wallet arrête les nouvelles entrées. Les protections déjà acceptées restent côté Hyperliquid. La surveillance locale d’une position peut être ralentie en arrière-plan et cesse lorsque le navigateur est fermé ou suspendu ; aucune garantie de sortie locale à une heure précise.

## Coffre du navigateur

[BrowserVault](../frontend/web/vault.ts) utilise IndexedDB, avec une clé AES-GCM de 256 bits non extractible via Web Crypto. La totalité du ledger, y compris la clé d’agent, est chiffrée ; réseau, propriétaire, agent et révision sont liés par les données authentifiées du chiffrement. Chaque réseau conserve sa propre identité. La clé privée MetaMask n’entre pas dans ce coffre.

Le coffre est automatiquement accessible au code de cette origine sur cet appareil. Il ne constitue pas une protection contre un script malveillant exécuté sur la même origine, une extension ou un poste compromis, et n’est pas un coffre matériel. Le chiffrement n’authentifie pas les futures versions du site. Les autorisations restent révocables depuis Hyperliquid.

Les écritures attendent la fin de la transaction IndexedDB, avec durabilité stricte demandée au navigateur. Un compteur de révision refuse un écrivain périmé, la génération précédente reste chiffrée et aucune copie ancienne n’est restaurée automatiquement. Une panne de sauvegarde bloque les nouvelles entrées ; le nonce et la réservation doivent être confirmés avant transmission. Une corruption ou une clé de chiffrement absente ne régénère jamais silencieusement un agent.

Les clés d’agent n’apparaissent ni dans localStorage, ni dans les réponses de statut, ni dans l’export JSON de données. Effacer les données du site ou perdre le profil peut supprimer le coffre : vérifier alors le compte et ses ordres directement sur Hyperliquid avant de réautoriser un nouvel agent. Il n’existe pas de sauvegarde cloud ou d’export des clés du coffre web.

## Isolation

- Un Web Lock d’exécution par réseau réserve la commande à un seul onglet de la même origine. Un deuxième onglet ne peut pas devenir un second moteur.
- Un verrou de préparation et un verrou de signature complètent cette exclusivité. La sauvegarde chiffrée est sérialisée et vérifie la propriété de l’onglet au commit.
- Testnet et Mainnet ont des clés distinctes ; les transports et schémas de signature viennent de la configuration canonique. Le contrôle MetaMask du propriétaire est refait au démarrage.
- Les noms d’agents web `OMEGAweb-mainnet` / `OMEGAweb-testnet` respectent les 16 caractères du SDK et diffèrent de ceux de Node. Les identités du coffre web et des fichiers Node ne sont pas copiées entre modes.
- Les locks ne sont pas globaux entre origines, appareils ou logiciels. Utiliser une seule origine et un seul moteur par compte/réseau ; aucune limite transactionnelle de compte inter-machines n’est garantie.

Le service Node reste une option pour une exécution indépendante de l’onglet, décrite dans [OPERATIONS.md](OPERATIONS.md). Aucun serveur de trading cloud permanent n’est déployé.

## Validation

La connexion mobile utilise le SDK MetaMask Connect officiel chargé seulement après une action utilisateur. La fenêtre QR native OMEGA est annulable au clavier et ne déclenche aucune signature. Le mode web ne devient actif qu’après autorisation du réseau puis démarrage explicite. L’action principale autorise le réseau sélectionné par défaut ; la configuration des deux réseaux ensemble est optionnelle. Chaque réseau dispose de son bouton d’autorisation ; un réseau indisponible n’impose pas de reconfigurer l’autre. Une erreur de lancement reste visible pendant les rafraîchissements.

Une lecture secondaire indisponible n’empêche plus d’afficher le propriétaire et le solde perpétuel si la lecture principale réussit. Les ordres et historiques sont alors signalés indisponibles et les opérations manuelles exigent une lecture complète avant envoi. Un solde nul n’est pas présenté comme un bot prêt à démarrer.

Tests du véritable code AES-GCM avec IndexedDB simulé : non-extraction de la clé, réouverture, corruption, mauvais réseau, écritures concurrentes/périmées et transaction échouée. Tests du moteur web avec transports simulés : isolation, consentement Mainnet, absence d’entrée à l’armement, checkpoint avant envoi, interruption tardive, cycle de page et compte modifié. Signatures et noms d’agents validés hors ligne avec le SDK réel sur les deux réseaux.

Aucune permission MetaMask réelle, autorisation d’agent financé ou exécution sur compte financé n’a servi à ces tests. La QA graphique du parcours sans wallet a été réalisée ; le parcours signé avec l’extension reste à réaliser ; les tests de logique ne les remplacent pas. Voir [STATUS.md](STATUS.md).
