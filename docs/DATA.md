# Données, sauvegardes et récupération

OMEGA ne possède pas de base cloud personnelle. Le site public, le navigateur, le service Node et Hyperliquid ont des responsabilités distinctes. Publier une version du site ne sauvegarde pas les données de ton navigateur ou le dossier du service installé sur ton ordinateur.

## Ce qui est conservé

| Données | Emplacement | Conservation et sauvegarde |
|---|---|---|
| Simulations, capital fictif, positions, historique et compteurs | localStorage de l’origine et du navigateur, séparé mainnet/testnet | État versionné et daté après écriture ; génération précédente dans une clé de secours dès qu’un état précédent existe |
| Profil, objectif et levier navigateur | localStorage, séparé par réseau | Écriture vérifiée par l’API de stockage ; export JSON disponible |
| Journal du contrôleur | localStorage, séparé par réseau | 200 événements maximum ; inclus dans l’export |
| Dernier replay et options | localStorage, séparé par réseau | Seul le dernier résultat est mémorisé ; erreur d’enregistrement affichée ; inclus dans l’export |
| Préférence MetaMask | Adresse publique + préférence dans le navigateur | Aucune clé privée ; exclue de l’export de données |
| Envois manuels non résolus | Journal local par compte/réseau | Conservé pour éviter un double envoi ; exclu de l’export et jamais remplacé par une sauvegarde de simulation |
| Agent, clé déléguée, nonce, quota, pending, préparation/confirmation d’agent et réglages web | IndexedDB de cette origine, chiffré AES-GCM | Transactions attendues, révisions vérifiées, copie chiffrée précédente ; hors export JSON |
| Clés d’agents, nonces, quota, pending, protections, préparation/confirmation d’agent et événements Node | `.omega-runtime/mainnet.json`, `.omega-runtime/testnet.json` | Écriture atomique, copie de la génération précédente `.bak`, schéma/réseau validés et révision/date enregistrées |
| Réglages du dernier armement Node réussi | Les mêmes ledgers Node | Rechargés après redémarrage ; le pilote reste désarmé |
| Fonds, positions et ordres réels | Hyperliquid | Relus auprès de l’exchange ; le cache UI ou une simulation locale ne les remplace pas |

L’historique paper n’est pas tronqué automatiquement. Un état supérieur à 2 Mio bloque les mutations et demande un export ; une écriture refusée par le navigateur ne doit pas être présentée comme enregistrée. Le journal du contrôleur et celui du service restent volontairement bornés. Les bougies et carnets sont des caches de marché, pas une archive historique complète.

## Depuis Compte

Ouvrir **Données et sauvegardes** : état du stockage, dates de simulation par réseau, export JSON et vérification d’un fichier. Le chargement de ce panneau est différé jusqu’à la visite de Compte/Journal.

L’export contient uniquement une liste autorisée de clés de simulation, réglages, journaux, copies paper de secours et dernier replay. Il n’inclut aucune clé d’agent, session HTTP, permission MetaMask, signature ou journal pending exchange. Les données illisibles restent exportables comme texte pour diagnostic.

Le fichier est versionné et contient une empreinte SHA-256 du contenu des données. **Vérifier une sauvegarde** contrôle format, clés autorisées, taille et empreinte. L’empreinte détecte une modification accidentelle ; elle n’authentifie pas l’auteur du fichier. Cette action ne restaure aucune donnée et n’autorise aucun ordre. L’import automatique n’est pas livré : une sauvegarde ancienne ne doit pas remettre silencieusement à zéro une tentative, ressusciter une position ou supprimer un pending.

Le bouton de protection du stockage demande au navigateur de réduire l’éviction automatique quand son API le permet. Cela ne protège pas d’un effacement manuel, d’un profil supprimé, d’une panne du disque ou de la navigation privée. Conserver un export hors du navigateur pour une copie indépendante.

## Comportement en cas de panne

- JSON paper invalide, version inconnue ou position malformée : nouvelles mutations de simulation bloquées, données d’origine conservées. Le terminal peut afficher le diagnostic.
- Écriture paper refusée : relecture de l’état effectivement enregistré et simulation bloquée jusqu’à résolution/rechargement. Aucun ordre réel n’est concerné.
- Ledger Node invalide ou réseau incohérent : démarrage bloqué ; aucune génération silencieuse d’une nouvelle identité.
- Fichier principal absent avec `.bak` présent : démarrage bloqué pour récupération manuelle, sans retour automatique à d’anciens nonces/quotas.
- Écriture Node échouée : entrées désarmées et erreur de sauvegarde visible en mémoire. Une réservation durable échouée empêche l’envoi de l’entrée ; aucune relance automatique n’est ajoutée. Le suivi de la position attribuée au bot reste soumis à la disponibilité du processus, du disque et de l’exchange.

## Copies du service local

Les fichiers secrets restent dans `.omega-runtime/`, hors Git, du build statique et de l’export navigateur. Sur POSIX, le répertoire est protégé en 0700 et les fichiers en 0600 ; le fichier principal et sa copie sont synchronisés puis remplacés atomiquement, avec synchronisation du répertoire. Ces permissions ne constituent pas un chiffrement.

Une copie `.bak` est sur le même disque : elle aide à diagnostiquer une écriture ou un fichier endommagé, sans remplacer une copie indépendante du dossier. Pour une sauvegarde externe, arrêter proprement le service et conserver le dossier complet dans un emplacement protégé. Ne pas copier une clé vers un deuxième processus actif.

Avant toute récupération, examiner l’état actuel du compte Hyperliquid, ses ordres et les pendings ; conserver les fichiers endommagés et les deux réseaux. Ne pas renommer aveuglément `.bak` en fichier principal : un nonce ou quota ancien peut être dangereux. Une clé révoquée/expirée doit être remplacée et réautorisée selon [NETWORKS.md](NETWORKS.md). Les fonds restent sur Hyperliquid ; un fichier de sauvegarde n’est pas un portefeuille de fonds.

## Preuves

Tests avec stockages simulés et répertoires temporaires : corruption préservée, quota de stockage, génération précédente, clé de réseau incorrecte, schéma inconnu, échec de copie, archive altérée ou contenant une clé étrangère et permissions POSIX. Le contrôle HTTP redémarre le vrai service sur des états synthétiques et vérifie agent identique, pending/quota/réglages conservés, token renouvelé et entrées désarmées. Aucun compte financé ni ordre exchange utilisé. Voir [STATUS.md](STATUS.md) pour les résultats datés et les limites.

Le mode web possède désormais son coffre sur cet appareil ; aucun export JSON ne le remplace. Le chiffrement et les limites de sécurité/reprise sont détaillés dans [WEB.md](WEB.md).
