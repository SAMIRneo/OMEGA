# Documentation active

Documentation de la version logicielle `1.2.0`, revue le 16 octobre 2026. Elle vise un développeur ou un agent n’ayant aucun historique du projet.

## Parcours de lecture

1. [README du dépôt](../README.md) : produit, démarrage et modes.
2. [AGENTS.md](../AGENTS.md) : consignes de contribution et invariants.
3. [ARCHITECTURE.md](ARCHITECTURE.md) : carte du code et circulation des données.
4. [DEVELOPMENT.md](DEVELOPMENT.md) : installation, tests et recettes de modification.
5. [STATUS.md](STATUS.md) : ce qui est vérifié et ce qui ne l’est pas.
6. [OPERATIONS.md](OPERATIONS.md) ou [STRATEGY.md](STRATEGY.md) selon la tâche.

## Qui documente quoi ?

| Fichier | Responsabilité | Actualiser quand… |
|---|---|---|
| README racine | Présentation, commandes d’entrée, liens | Le démarrage ou les modes changent |
| AGENTS | Règles de travail et invariants | Une convention transversale change |
| ARCHITECTURE | Modules, responsabilités, unités, flux | Un module, contrat ou dépendance change |
| DEVELOPMENT | Commandes, tests et tâches | Un script, build ou processus de validation change |
| OPERATIONS | Exploitation et API locale | Le cycle de vie, un endpoint ou la persistance change |
| STRATEGY | Décision et limites par mode | Un seuil, coût, profil ou chemin d’ordre change |
| STATUS | Preuves, limites et prochaine étape | Une capacité est ajoutée ou une validation réalisée |

Éviter de recopier les mêmes détails dans plusieurs fichiers. Les chemins ci-dessus sont la documentation courante. Le code et le lockfile établissent le comportement implémenté ; une divergence documentaire doit être signalée et corrigée.

## Documents historiques

[archive/README.md](archive/README.md) indexe les notes antérieures. Leur vocabulaire, anciens capitaux/leviers, chemins `public/` ou `web/`, noms Atelier et conclusions de tests appartiennent à leur version. Ils ne doivent pas servir de procédure de lancement ou d’instructions à un agent actuel.

L’archive de documentation externe produite par `python sync_docs.py` va dans `docs/official/`, ignoré par Git. Elle contient des captures de sources, pas des spécifications internes ni une preuve de revue à jour.
