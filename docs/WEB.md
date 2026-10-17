# Utiliser OMEGA depuis le lien

Le site publié permet la connexion MetaMask, la configuration de Testnet et Mainnet, les réglages, l’armement du bot, l’arrêt des entrées et la réconciliation. Aucun terminal ou service local n’est nécessaire pour ce mode. Ouvrir [OMEGA](https://omega.kairos-labspro.chatgpt.site/#pilot) dans un navigateur avec MetaMask, Web Locks, Web Crypto et IndexedDB disponibles, sur une origine sécurisée.

## Parcours

1. Dans **Bot**, connecter MetaMask et vérifier le compte ainsi que le réseau affichés. L’accès à l’adresse ne signe aucun ordre.
2. Conserver **Configurer Testnet + Mainnet ensemble**, puis cliquer **Configurer dans MetaMask**. Chaque réseau manquant demande sa propre signature ; l’autorisation est demandée pour 30 jours et reste révocable. Les autorisations valides du même compte sont conservées.
3. Dans **Réglages**, choisir profil, plafond de levier et objectif journalier. Les soldes doivent être ceux du compte Hyperliquid du réseau choisi ; le capital de simulation ne finance pas les ordres réels.
4. Choisir le réseau à utiliser. Pour Mainnet, cocher le consentement aux fonds réels puis cliquer **Démarrer le bot**. L’armement attend une nouvelle clôture admissible ; il ne transmet pas une entrée immédiatement.
5. Garder l’onglet ouvert et visible, l’appareil éveillé et connecté. Arrêter les entrées ou vérifier un pending depuis les commandes existantes. Les ordres manuels et leur clôture restent accessibles avec le wallet.

Une signature refusée sur le second réseau conserve le premier. Le bouton de complément reprend le réseau manquant. Une expiration/révocation entraîne une nouvelle clé avant réautorisation, sans recycler un ancien nonce. Le navigateur ne demande jamais la clé privée ou phrase de récupération MetaMask.

## Exécution et interruptions

Le mode web instancie le même [LiveEngine](../runner/engine.ts) que Node : données propres au moteur, Daily/1 h/15 min, revalidation après réglage du levier, jusqu’à quatre tentatives, marge ≤ 50 %, budget automatique ≤ min(100 USDC, 1 % de l’équité, 90 % du budget restant), IOC + SL/TP reduce-only et aucun renvoi automatique d’une entrée incertaine.

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

Tests du véritable code AES-GCM avec IndexedDB simulé : non-extraction de la clé, réouverture, corruption, mauvais réseau, écritures concurrentes/périmées et transaction échouée. Tests du moteur web avec transports simulés : isolation, consentement Mainnet, absence d’entrée à l’armement, checkpoint avant envoi, interruption tardive, cycle de page et compte modifié. Signatures et noms d’agents validés hors ligne avec le SDK réel sur les deux réseaux.

Aucune permission MetaMask réelle, autorisation d’agent financé ou exécution sur compte financé n’a servi à ces tests. La QA graphique et le parcours avec l’extension restent à réaliser ; les tests de logique ne les remplacent pas. Voir [STATUS.md](STATUS.md).
