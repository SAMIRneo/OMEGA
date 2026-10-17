# Audit technique — 17 octobre 2026

Audit du checkout OMEGA 1.2.0 : lecture des contrats et chemins critiques, tests automatisés et corrections. Il ne constitue pas un audit externe indépendant, une certification de sécurité ni une preuve de rentabilité. Aucun compte personnel, agent autorisé ou ordre exchange réel n’a servi aux vérifications.

## Corrections livrées

La priorité exprime l’impact possible du défaut, pas une perte constatée.

| Priorité | Défaut confirmé | Correction et preuve |
|---|---|---|
| Haute | Le suivi d’une position chargeait les bougies et fills quotidiens : leur indisponibilité empêchait aussi le contrôle des protections | Snapshot de surveillance sans ces appels ni validation du quota d’entrée ; clôture reduce-only vérifiée avec bougies/fills indisponibles, équité négative et compteur d’entrée invalide |
| Haute | La présence d’un fill d’ouverture suffisait à adopter toute la position ETH lors du rapprochement | Attribution limitée au même ordre, actif, sens et à la somme des tailles exécutées ; refus d’une position agrandie ou inversée et d’un historique tronqué |
| Moyenne | Une réponse de trois statuts sans erreur était considérée comme un bracket protégé, même sans fill d’entrée | Fill positif fini et identifiant valides requis ; seuls les statuts reconnus des protections sont acceptés. Une réponse partielle conserve le pending manuel et bloque un nouvel envoi |
| Moyenne | Un arrêt suivi d’un réarmement, ou une suspension pendant une lecture, pouvait laisser reprendre une ancienne validation paper | Génération de session capturée et revérifiée après les attentes ; tests d’interruption sans entrée |
| Moyenne | Un journal de clôtures contenant une valeur non numérique contournait la comparaison inter-onglets | Journal invalide refusé, aucune entrée automatique |
| Moyenne | Les métadonnées non finies de levier pouvaient contourner sa comparaison de plafond | Validation explicite de l’actif, de la précision, du plafond, du sens et du cloid avant construction du plan |

Les seuils de stratégie, objectifs, budgets, réservations de tentatives, consentements mainnet et séparation testnet/mainnet ne sont pas assouplis. Les sorties restent reduce-only ; aucune relance automatique d’entrée n’est ajoutée.

## Périmètre et résultats

| Domaine | Vérification | Résultat / limite |
|---|---|---|
| Décision et risque | Règles Daily, session UTC, sizing, frais, liquidité, replay et tests existants | Contrats logiciels vérifiés ; aucun backtest économique supplémentaire ni calibration |
| Exécution Node | Armement/arrêt, revalidation, pending durable, attribution, protections et sorties | Corrections ci-dessus et tests avec transports simulés ; pas d’exécution financée |
| Mainnet/testnet | Configuration canonique, signatures SDK hors ligne, comptes, ledgers, changement de réseau | Suite réseau existante passée ; aucun nouvel essai exchange de bout en bout |
| Frontière HTTP | Authentification, Host/Origin, consentement, agents distincts, rotation, absence de clé dans les réponses | Service réel lancé en répertoire temporaire, aucun ordre envoyé |
| UI/UX | Contrats DOM, connexion, actions explicites, états occupés, chargement différé et graphiques | Tests DOM/VM passés ; pas de navigateur graphique ni d’appareil physique |
| HTML | Unicité des IDs et boutons nommés | Aucun ID dupliqué ni bouton sans texte/nom ARIA dans le HTML source ; pas un audit WCAG complet |
| Dépendances Node | `npm audit --json` | 0 vulnérabilité connue signalée à la date du contrôle ; pas une garantie d’absence de défaut |
| Python de compatibilité | Dépendances verrouillées installées dans un environnement temporaire, suite unittest | 18 tests passés ; voie paper distincte de Node |
| Rust/WASM | Lecture du noyau, build et consommateurs WASM testés côté Node | Tests Cargo non exécutés : Cargo absent ; binaire WASM non régénéré |
| Documentation/source | Liens et commandes, comparaison code/docs, absence de fichiers personnels suivis aux emplacements interdits | Contrôle documentaire et diff passés ; aucun secret personnel lu |

`npm run check` : **136 tests Vitest + 20 tests navigateur/VM**, builds typés web et Node, documentation et contrôle HTTP isolé passés. La suite Python apporte **18 tests** supplémentaires, soit **174 tests unitaires/VM/Python** au total, en plus du contrôle HTTP. Les dix nouveaux tests Vitest couvrent les défauts corrigés, dont deux cas paramétrés d’attribution ambiguë.

## Limites et suite

La surveillance nécessite toujours un compte, des ordres, des métadonnées et un carnet exchange accessibles et valides. Une panne de ces services ou du processus local empêche une sortie locale ; les protections déjà acceptées restent côté exchange. La propriété d’une position nette n’est pas parfaitement reconstructible : une modification externe de même sens et de taille inférieure peut rester ambiguë.

La prochaine validation utile est un parcours testnet dédié : signatures réelles, fills partiels, refus de protection, redémarrage et rapprochement observés avec des fonds de test. Le rendu desktop/Safari/iPhone doit également être vérifié visuellement. Le chiffrement local des clés et un quota commun à plusieurs machines restent des travaux distincts. Les limites complètes restent dans [STATUS.md](STATUS.md).

La publication du frontend n’actualise pas un service Node déjà installé : récupérer les nouvelles sources, arrêter proprement l’ancien processus et reconstruire le service. Ne pas supprimer son répertoire d’état pour effectuer la mise à jour ; voir [OPERATIONS.md](OPERATIONS.md).
