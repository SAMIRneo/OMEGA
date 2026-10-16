# Développement et contribution

Lire [AGENTS.md](../AGENTS.md), puis choisir le chemin correspondant à la tâche. Toutes les commandes ci-dessous partent de la racine du dépôt.

## Installation reproductible

```sh
node --version
npm --version
npm ci
npm run dev
```

Node 22.12+ ; vérifications courantes réalisées avec Node 24.19.0, aussi indiqué dans [.node-version](../.node-version). `package.json` déclare le gestionnaire et les versions ; `package-lock.json` verrouille l’installation. Ne pas remplacer `npm ci` par une mise à jour générale de dépendances pour une retouche de documentation/UI.

Vite affiche son URL, généralement sur le port 5173. Il sert la source navigateur et ne remplace pas le serveur Node d’exécution. Le contrôle du runner est prévu sur l’interface buildée servie depuis `127.0.0.1:8766`.

## Commandes

| Commande | Effet |
|---|---|
| `npm run dev` | Serveur Vite de développement |
| `npm run preview` | Aperçu local du build web déjà produit |
| `npm run typecheck` | TypeScript frontend et dépendances importées |
| `npm run typecheck:bot` | Contrôle TypeScript du service Node |
| `npm test` | Vitest : tests co-localisés sous `frontend/` |
| `npm run test:browser` | Contrats du moteur navigateur via Node/VM, sans navigateur graphique |
| `npm run build` | Typecheck frontend puis build statique dans `dist/` |
| `npm run build:bot` | Typecheck service puis bundle dans `runner-dist/` |
| `npm run start:bot` | Lance le bundle Node déjà construit ; démarre désarmé |
| `npm run bot` | Construit puis lance le service Node |
| `npm run test:service` | Build du service et test HTTP isolé ; aucun ordre exchange |
| `npm run check:docs` | Vérifie liens locaux, chemins documentés et scripts npm cités |
| `npm run check` | Vérification Node complète, documentation incluse |

`check` exécute : documentation → Vitest → tests du moteur navigateur → build web → build/test HTTP du service. Il ne lance pas de wallet, ne signe pas d’agent et ne fait pas un backtest de rentabilité.

## Matrice de validation

| Modification | Contrôles pertinents |
|---|---|
| Documentation seule | `npm run check:docs` ; relire la source décrite |
| UI, IDs, navigation, stores, imports différés | Vitest, tests navigateur, build web ; QA visuelle si navigateur disponible |
| Graphique, cache, calcul d’EMA d’affichage | Tests ChartBuffer et build ; vérifier zoom/corrections historiques |
| Géométrie ou données 3D | Tests du modèle ; QA visuelle des caméras, sélection, mobile et pause |
| Règles/risque/ordres/session/persistance | `npm run check` ; tests ciblés des refus, interruptions et doubles envois |
| Rust/WASM | Tests Rust, régénération, puis contrôles Node des consommateurs |
| Python/MCP | Tests Python avec dépendances installées ; Node si contrat frontend partagé touché |

Un changement purement visuel ne nécessite pas un nouvel essai sur un compte financé. Pour une modification sensible du moteur, tester les scénarios de refus et d’incertitude, pas seulement le chemin favorable.

## Où sont les tests ?

- `frontend/core/*.test.ts` : stratégie, contrôleur, plans, replay et moteur Node importé par les tests.
- `frontend/exchange.test.ts` : wallet/transport simulés, signatures manuelles et lecture du compte.
- `frontend/network.test.ts` : blocage du changement de réseau quand le runner est actif.
- `frontend/workspace.test.ts`, `bot-dashboard.test.ts`, `runner-ui.test.ts` : DOM via happy-dom, états et navigation.
- `frontend/charts/data-buffer.test.ts` : EMA et corrections de bougies.
- `frontend/visuals/depth-model.test.ts` : données et géométrie pure.
- `tests/browser.test.cjs` : moteur navigateur dans une VM Node.
- `scripts/check-runner.mjs` : processus réel temporaire, authentification et séparation des réseaux, sans agent autorisé.
- `tests/test_engine.py`, `tests/test_multiframe.py` : moteur Python historique.

La configuration Vitest a `root: frontend`. Un nouveau test placé seulement dans `runner/` n’est pas automatiquement découvert : le placer selon les conventions existantes ou modifier explicitement la configuration.

## Recettes de modification

### Ajouter un widget ou un sous-onglet

1. Définir les éléments/IDs dans `frontend/index.html` et vérifier les consommateurs existants avec `rg`.
2. Placer la présentation dans le module UI propriétaire ; mettre les calculs purs dans `core/` ou le modèle de visualisation.
3. Consommer `market-store` pour l’observation ou `runner-store` pour le service. Ne pas ajouter un WebSocket par widget.
4. Préserver clavier, statuts inconnus, données anciennes et réduction des mouvements.
5. Vérifier qu’un module différé n’active pas un formulaire avant son installation et qu’un changement de réseau ne contourne pas les gardes.

### Modifier le mandat ou une règle

Lire STRATEGY.md, modifier la règle canonique et ses tests. Rechercher les copies de seuils dans le navigateur, le plan exchange, le runner, Rust, Python et les libellés HTML avant de conclure. Documenter tout écart volontaire entre modes. Ne pas réinitialiser un quota ou changer de clé de stockage pour rendre le scénario favorable.

### Modifier un style

`interface.css` est le point d’entrée et importe les [tokens de présentation](../tokens.css). La passe Hallmark est limitée à `#view-pilot` : sa palette nommée, ses polices locales et sa grille ne remplacent pas les anciens thèmes des autres vues. Les choix et limites de contrôle sont conservés dans `.hallmark/`. `layout.css` est la base structurelle en couche ; `obsidian.css` porte le thème et les priorités visuelles. Éviter d’ajouter une troisième cascade de corrections successives. Garder des classes sémantiques réutilisables et des règles responsive groupées. Les tokens `--accent` (cyan), `--action` (ambre), `--violet`, `--green` et `--red` distinguent navigation, action, recherche et données directionnelles. Les réseaux se distinguent aussi par leur libellé ; le point coloré du sélecteur ne confirme pas la santé de la connexion.

## Toolchains optionnelles

Rust, si le noyau change :

```sh
cargo test --manifest-path rust-core/Cargo.toml
rustup target add wasm32-unknown-unknown
node scripts/build-rust.mjs
```

Le script génère `frontend/legacy/risk-core.js` à partir du binaire. Il ne faut pas modifier manuellement sa chaîne WASM ; le chargement Node la lit également.

Python, pour le moteur historique : créer un environnement virtuel, installer `requirements.txt`, puis :

```sh
python -m unittest discover -s tests -v
```

La présence des dépendances Node ne prouve pas celle de TA-Lib/NumPy. Si une toolchain manque, l’indiquer ; ne pas annoncer ces tests comme réussis.

## Livraison et hébergement

- Modifier les sources, pas le build généré. Conserver les dépendances et fichiers personnels hors commit.
- Pour un changement applicatif publié, suivre le workflow Sites disponible, conserver le `project_id` de `.openai/hosting.json`, pousser l’état exact puis publier une version sauvegardée. Préserver l’audience existante.
- GitHub et le dépôt source de l’hébergement sont deux remotes distincts. Synchroniser les sources attendues ; une écriture dans l’un ne prouve pas une publication dans l’autre.
- Pour la documentation seule, synchroniser les sources sans refaire un déploiement du site inchangé.
- Remettre un bilan factuel : modification, tests effectués, tests non effectués et éventuelles limites. Mettre à jour STATUS.md si les capacités/preuves changent.
