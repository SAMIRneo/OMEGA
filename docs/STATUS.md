# État actuel d’OMEGA

Revue du 18 octobre 2026, version `1.2.0`. Cette page décrit le checkout courant ; les [jalons successifs](archive/PROGRESS_2026-10-17.md) conservent les anciennes preuves et les parcours remplacés.

## Capacités livrées

| Domaine | Comportement actuel | Référence |
|---|---|---|
| Interface | Terminal DOM TypeScript/JS, direction Copper Studio graphite/cuivre, navigation latérale et cinq vues, graphique ETH et profondeur SVG ; aucune figure 3D | [Architecture](ARCHITECTURE.md) |
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

README et index orientent vers un guide par sujet. Les anciens jalons sont archivés ; leurs nombres de tests et leur parcours local obligatoire ne décrivent pas l’état actuel.

## Vérifications

La passe de connexion du 17 octobre a validé `npm run check` : **185 tests Vitest sur 26 fichiers et 23 tests navigateur/VM**, builds typés web/Node et contrôle HTTP réel temporaire avec redémarrage. Les tests couvrent aussi la reprise après verrouillage, le compte inchangé/modifié, la déconnexion explicite, les autorisations 180 jours des agents web/Node via le vrai SDK, la préparation idempotente, la confirmation persistée, la révocation, l’interruption et la panne isolée de l’autre réseau. Les transports sont simulés ; aucune permission personnelle ni aucun ordre exchange n’est utilisé.

Le contrôle documentaire passe sur 25 fichiers Markdown et 187 liens locaux. Le nouveau contrôle de structure vérifie 49 modules et leurs imports littéraux ; trois sondes temporaires ont confirmé le refus d’un import frontend → Node, shared → adaptateur web et shared → API Node. Il ne vérifie pas les globals dynamiques ou l’intérieur des dépendances tierces.

Les 18 tests Python ont passé lors de l’audit antérieur ; ils ne sont pas inclus dans `npm run check`. Cargo était absent : aucun test Rust ni régénération WASM n’est revendiqué. Les lectures publiques et signatures SDK hors ligne antérieures ne prouvent pas un parcours MetaMask réel.

## Limites et travail restant

- Aucun parcours MetaMask/ordre financé de bout en bout validé pour cette version ; validation testnet dédiée à réaliser par l’exploitant.
- QA graphique desktop/Safari/iPhone physique non réalisée dans cet environnement.
- Aucun serveur cloud de trading permanent. Le bot web dépend de l’onglet ; Node dépend du processus et de l’ordinateur.
- Aucune rentabilité, calibration probabiliste ou validation économique hors échantillon démontrée.
- Pas de sauvegarde cloud personnelle, d’export des clés du coffre web ou de restauration automatique des états d’exécution.
- Pas de quota transactionnel global entre logiciels/appareils ; attribution d’une position nette limitée face aux interventions externes.
- Ledgers Node protégés par les permissions du système, sans chiffrement applicatif. Le coffre web ne protège pas d’un code compromis sur la même origine.
- Ponts globaux et JavaScript historique encore actifs : réduction progressive, sans suppression incidente.

Pour reprendre : lire [AGENTS](../AGENTS.md), [ARCHITECTURE](ARCHITECTURE.md) et [DEVELOPMENT](DEVELOPMENT.md), puis lancer les contrôles appropriés. Les preuves sont celles du checkout testé, pas une certification des futurs changements.

## Refonte visuelle du 18 octobre

Copper Studio recompose le terminal : rail de navigation sur ordinateur, barre inférieure à cinq destinations sur mobile, graphique dominant et parcours du bot séparé de ses commandes. La palette cuivre, les graphiques et les vues Compte/Historique/Recherche utilisent le même système. Les sources historiques de présentation restent dans des couches CSS de priorité inférieure ; `frontend/studio.css` porte la direction actuelle. Les IDs, règles de trading, permissions et données conservées ne changent pas.

Validation locale : 185 tests Vitest, 23 tests navigateur/VM, builds web/Node et test HTTP isolé avec redémarrage réussis. Vérification des cinq vues à 320, 390, 768 et 1440 pixels sans débordement horizontal ; revue visuelle du marché, bot et recherche. Aucun compte financé ni ordre réel testé. La publication de cette refonte est une étape distincte.
