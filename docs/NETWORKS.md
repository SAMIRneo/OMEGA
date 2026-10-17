# Mainnet et testnet — contrats et validation

La configuration canonique est [networks.js](../frontend/core/networks.js). Les transports du navigateur, de la signature manuelle, de l’autorisation d’agent et du service Node en dépendent. Un réseau absent/inconnu ou des endpoints contradictoires bloquent la signature ; aucune conversion implicite d’un identifiant invalide vers mainnet.

| Élément | Mainnet | Testnet |
|---|---|---|
| REST | `https://api.hyperliquid.xyz` | `https://api.hyperliquid-testnet.xyz` |
| WebSocket | `wss://api.hyperliquid.xyz/ws` | `wss://api.hyperliquid-testnet.xyz/ws` |
| Application exchange | `https://app.hyperliquid.xyz/` | `https://app.hyperliquid-testnet.xyz/` |
| Ordres L1 signés par le SDK | source `a` | source `b` |
| Autorisation d’agent signée par le SDK | `hyperliquidChain: Mainnet` | `hyperliquidChain: Testnet` |
| Agent / nonce / état | Agent propre, coffre web ou fichier mainnet Node | Agent propre, coffre web ou fichier testnet Node |
| Consentement au démarrage automatique | `MAINNET` explicite | Pas de consentement fonds réels |

## Identités et signatures

Les lectures utilisent l’adresse du compte propriétaire, pas celle de l’agent. L’agent ne représente que le signataire délégué. L’index ETH et sa précision sont relus depuis les métadonnées du réseau choisi ; aucun index mainnet n’est réutilisé sur testnet.

Les signatures d’ordres L1 et celles d’autorisation d’agent sont deux schémas distincts gérés par le SDK verrouillé. Le réseau EVM affiché dans MetaMask ne sélectionne pas à lui seul le réseau Hyperliquid : le transport et les champs signés ci-dessus font autorité. Le `signatureChainId` de l’action d’autorisation doit correspondre au domaine EIP-712 ; il ne remplace pas `hyperliquidChain`. Aucun transfert, bridge ou retrait n’est implémenté.

Le compte sélectionné en première position dans `eth_accounts` doit rester le propriétaire attendu avant signature. Une modification du compte ferme la session. Une génération de session invalide les réponses de lecture antérieures ; un ancien solde ne peut pas réapparaître après déconnexion. Les autorisations d’agent sont également revérifiées sur le compte et l’agent attendus après la signature.

## Isolation et concurrence

- Le journal d’envoi manuel est isolé par réseau et adresse. Un journal malformé bloque les nouvelles entrées au lieu d’être ignoré.
- Les signatures manuelles et les autorisations d’agent partagent un verrou Web Locks par réseau/propriétaire dans le navigateur.
- Le service exige exactement un paramètre `network` valide dans chaque requête de contrôle. Une réponse appartenant à l’autre réseau n’est pas publiée comme état connecté.
- Le changement de réseau est refusé pendant une signature/autorisation, une opération du service, une position attribuée au bot ou un pending non résolu.
- Les fichiers runtime sont liés à leur réseau. Un ancien fichier sans marqueur conserve son état lors du marquage. Un fichier marqué pour l’autre réseau ou un agent partagé entre les deux réseaux bloque le démarrage.
- La rotation d’un agent n’efface pas les compteurs d’essai, positions ou informations de rapprochement. Elle reste interdite tant qu’une opération, exposition ou incertitude n’est pas résolue.

Les clés, tokens et nonces restent hors interface et hors dépôt. Aucun auto-armement au chargement, à la connexion wallet ou après redémarrage. Les SL/TP reduce-only et les réservations durables restent indépendants de la vue affichée.

## Preuves et limites

Les tests exécutent les deux modes avec transports simulés et le véritable code de signature du SDK : sources L1, autorisation d’agent, domaine, nonces, ordres IOC et protections. Les tests DOM vérifient un index ETH différent sur chaque réseau, les comptes secondaires, réponses tardives, endpoints contradictoires, journaux illisibles et refus de changement de réseau. Le contrôle HTTP réel utilise un dossier temporaire, des agents non financés et aucune autorisation exchange.

Le 17 octobre 2026, une lecture publique `l2Book` ETH a répondu HTTP 200 avec achats et ventes sur chacun des deux endpoints. Cela ne valide ni un wallet financé, ni une approbation réelle MetaMask, ni l’exécution de bout en bout d’un ordre testnet/mainnet. Ces dernières étapes restent à constater dans un environnement d’exploitation dédié avant d’affirmer une validation complète.

Références : [API](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api), [signatures](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/signing), [nonces et API wallets](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/nonces-and-api-wallets), [identifiants des actifs](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/asset-ids).

## Préparation commune, autorisations séparées

Le parcours Bot, en mode web ou Node, peut préparer les deux réseaux dans une seule action explicite, mais produit une signature `approveAgent` distincte sur chacun d’eux. La durée demandée est 30 jours, affichée avant signature. Hyperliquid accepte une expiration personnalisée `valid_until` dans le nom de l’agent, dans sa limite officielle de 180 jours : [endpoint exchange](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/exchange-endpoint#approve-an-api-wallet).

Chaque réseau est interrogé et validé indépendamment ; une approbation n’est jamais copiée de l’autre réseau ou déduite du stockage navigateur. Une autorisation encore valide pour le même propriétaire est réutilisée. Une autorisation expirée/révoquée entraîne une nouvelle clé plutôt que le recyclage de l’ancienne, conformément aux précautions de nonce officielles. Un verrou de préparation par réseau complète le verrou de signature par propriétaire pour sérialiser deux assistants ouverts dans des onglets différents.

La préférence de reconnexion ne contient qu’une adresse publique, commune aux sélections mainnet/testnet de la même origine. Elle ne transporte aucune clé, session HTTP ou autorisation exchange entre origines. La restauration utilise seulement `eth_accounts` puis des lectures publiques du compte.

En mode web, les agents `OMEGAweb-mainnet` et `OMEGAweb-testnet` sont distincts de Node. Le coffre chiffre le ledger complet et lie l’identité/réseau/révision via AES-GCM. Le transport bloque une entrée si l’onglet a perdu son lock, est masqué ou si le moteur a été arrêté pendant les opérations asynchrones. Voir [WEB.md](WEB.md).
