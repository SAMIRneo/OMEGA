# Frontend et adaptateurs navigateur

Application DOM TypeScript/JavaScript/CSS, buildée par Vite depuis ce dossier. [main.ts](main.ts) installe l’adaptateur, les contrôles et les modules différés ; [index.html](index.html) définit les contrats HTML.

| Zone | Responsabilité |
|---|---|
| `core/` | Règles Daily, types, indicateurs, réseaux, simulation, replay et stockage paper ; les modules purs sont aussi consommés par shared |
| `shared/` | Stores et utilitaires communs aux vues navigateur ; distinct du moteur multiplateforme à la racine |
| `web/` | Adaptateur du bot web, Web Locks et coffre IndexedDB chiffré |
| `legacy/` | Code actif : flux publics, UI, adaptateur Python et WASM généré ; aucune suppression fondée sur le nom |
| `charts/`, `visuals/` | Graphique et profondeur ; réutilisent market-store sans flux exchange supplémentaire |
| Modules à la racine | Connexion, exchange manuel, contrôles Bot, compte, recherche et présentation |

Le frontend importe [shared](../shared/README.md) pour le moteur ; il n’importe aucun fichier de `runner/`. Le choix web/API locale est dans [runner-ui.ts](runner-ui.ts). Le guide [WEB](../docs/WEB.md) décrit les limites du navigateur.

Depuis la racine : `npm run dev`, `npm run build`, `npm test`. Voir [Développement](../docs/DEVELOPMENT.md) pour les contrôles et [Architecture](../docs/ARCHITECTURE.md) pour la carte complète.
