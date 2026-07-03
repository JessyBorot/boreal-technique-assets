# Boréal Technique — assets front-end

Fichiers statiques (JS/CSS) servis en CDN via **jsDelivr** pour le site Webflow
`boreal-technique.webflow.io`. **Aucun secret ici** — uniquement du code d'animation.

## Fichiers
- `boreal-app.js` — tous les modules (nav, curseur, parallax, split titres, hero Flip,
  hero bg-zoom, stacking cards, depth tiles, odometer, logo wall, 3D tornado, footer
  parallax, panneau formulaire underlay, **validation formulaire live** Osmo) + le harnais
  Barba/Lenis/transitions de page. Chargé dans le **footer** Webflow.
- `boreal-styles.css` — styles de ces modules. Chargé dans le **head** Webflow.

### Formulaire underlay (soumission)
- Panneau latéral persistant (`initFixedUnderlayNavigation`) ouvert par tout `[data-underlay-nav-toggle]`.
- `.underlay-nav__inner` : `data-lenis-prevent` (posé en JS) + `max-height:100svh; overflow-y:auto`
  pour scroller le formulaire quand il dépasse l'écran.
- Champs restylés pour le thème sombre (fond/texte/placeholder via tokens Primitives) au lieu du blanc Webflow.
  Inclut un override `:-webkit-autofill` (le fond blanc/pâle forcé par Chrome/Arc n'est pas surchargeable
  par `background-color` → repeint via `box-shadow` interne + `-webkit-text-fill-color`).
- Validation live (`initAdvancedFormValidation`) : pose `.is--filled/.is--success/.is--error`.
  Requiert `[data-form-validate]` (parent), `[data-validate]` (chaque groupe), `[data-submit]`
  (autour du `input[type=submit]`). Couleur d'erreur = token `--_primitives---colors--carnation`.
  Anti-spam : rejet si soumission < 5 s.
- Nav : `[data-twostep-nav]` reste DANS `[data-main]` (pour coulisser avec la page à l'ouverture).
  Le `transform` d'ouverture réancrait son `position:fixed` → après scroll elle sautait hors écran.
  Fix (`initFixedUnderlayNavigation`) : `translateY(scrollY)` sur la nav à l'ouverture + `lenis.stop()`
  (fond gelé), nettoyé à la fermeture. Global (toutes pages), rien à faire dans le Designer.

## URLs CDN (jsDelivr)
```
https://cdn.jsdelivr.net/gh/JessyBorot/boreal-technique-assets@main/boreal-app.js
https://cdn.jsdelivr.net/gh/JessyBorot/boreal-technique-assets@main/boreal-styles.css
```

## Mise à jour
1. Éditer le fichier, `git commit` + `git push`.
2. jsDelivr met en cache ~7 jours sur `@main`. Pour forcer la fraîcheur, soit :
   - pointer une version taguée (`@v1.0.1`) au lieu de `@main`, soit
   - ajouter `?v=2` (puis `v=3`…) à la fin de l'URL dans le custom code Webflow.

Dépend du HEAD/FOOTER custom code du site (voir dossier `webflow/` du projet Boréal).
