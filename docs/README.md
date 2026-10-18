# Documentation active

Documentation de la version logicielle `1.2.0`, revue le 18 octobre 2026. Elle vise un développeur ou un agent n’ayant aucun historique du projet.

## Parcours de lecture

1. [README du dépôt](../README.md) : produit, démarrage et modes.
2. [AGENTS.md](../AGENTS.md) : consignes de contribution et invariants.
3. [ARCHITECTURE.md](ARCHITECTURE.md) : carte du code et circulation des données.
4. [DEVELOPMENT.md](DEVELOPMENT.md) : installation, tests et recettes de modification.
5. [STATUS.md](STATUS.md) : ce qui est vérifié et ce qui ne l’est pas.
6. [WEB.md](WEB.md) pour le parcours depuis le lien, [OPERATIONS.md](OPERATIONS.md) pour Node, [STRATEGY.md](STRATEGY.md) pour la décision ou [DATA.md](DATA.md) pour la persistance.

## Qui documente quoi ?

| Fichier | Responsabilité | Actualiser quand… |
|---|---|---|
| README racine | Présentation, commandes d’entrée, liens | Le démarrage ou les modes changent |
| AGENTS | Règles de travail et invariants | Une convention transversale change |
| ARCHITECTURE | Modules, responsabilités, unités, flux | Un module, contrat ou dépendance change |
| DEVELOPMENT | Commandes, tests et tâches | Un script, build ou processus de validation change |
| OPERATIONS | Exploitation et API locale | Le cycle de vie, un endpoint ou la persistance change |
| [NETWORKS.md](NETWORKS.md) | Identités, endpoints, signatures et isolation des réseaux | Un contrat réseau ou de signature change |
| STRATEGY | Décision et limites par mode | Un seuil, coût, profil ou chemin d’ordre change |
| [WEB.md](WEB.md) | Parcours depuis le lien, coffre web et limites | Le runtime web ou son stockage change |
| [DATA.md](DATA.md) | Données conservées, export, copies et récupération | Une politique de persistance ou son format change |
| STATUS | Preuves, limites et prochaine étape | Une capacité est ajoutée ou une validation réalisée |
| [AUDIT.md](AUDIT.md) | Constats, corrections et périmètre de l’audit du 17 octobre | Une nouvelle passe d’audit change ses résultats |

Éviter de recopier les mêmes détails dans plusieurs fichiers. Les chemins ci-dessus sont la documentation courante. Le code et le lockfile établissent le comportement implémenté ; une divergence documentaire doit être signalée et corrigée.

## Version de référence

La branche `main` contient la seule version maintenue. Les anciennes variantes et leurs documents ont été retirés.

L’archive de documentation externe produite par `python sync_docs.py` va dans `docs/official/`, ignoré par Git. Elle contient des captures de sources, pas des spécifications internes ni une preuve de revue à jour.

Pour les modifications de réseau, signature, identité de compte ou journal exchange : lire [Mainnet et testnet](NETWORKS.md).
