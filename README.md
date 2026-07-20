# Boréal Technique — assets front-end

Fichiers statiques (JS/CSS) servis en CDN via **jsDelivr** pour le site Webflow
`boreal-technique.webflow.io`. **Aucun secret ici** — uniquement du code d'animation.

## Fichiers
- `boreal-app.js` — tous les modules (nav, curseur, parallax, split titres, hero Flip,
  hero bg-zoom, stacking cards, depth tiles, odometer, logo wall, panorama 3D réalisations, footer
  parallax, parallax image layers (hero Réalisation T07), mini showreel player (Flip, T07),
  layered image slider (Observer/CustomEase, T07), panneau formulaire underlay,
  **validation formulaire live** Osmo) + le harnais
  Barba/Lenis/transitions de page. Chargé dans le **footer** Webflow.
- `boreal-styles.css` — styles de ces modules. Chargé dans le **head** Webflow.

### Couleur d'accent (V2 — juil. 2026)
Les usages d'accent (bordure stats, bullets/outline témoignages, remplissage lien footer,
focus des champs, checkbox/radio cochée) utilisent le token Webflow
`--_primitives---colors--dodger-blue` (bleu du papillon du logo, `#29b6ff`).
Auparavant `--_primitives---colors--sunshade` (jaune/orange), retiré de la DA V2.
Le token est défini dans Webflow (variables du site), pas dans ce fichier.

### Section Services — rangée pleine largeur (V2 — Userback #8034497)
`initStackingStickyCardsBounce` : les 4 cartes `[data-stacking-card]` d'une section
`[data-stacking-cards-init]` **montent/descendent PILOTÉES PAR LE SCROLL** (`scrub:true`,
staggerées), chacune à un **angle de repos différent** (`[-6,-2.5,2.5,6]°`), + **bounce**
(`pulseElement`) quand chaque carte atteint sa position. Le layout **rangée côte-à-côte pleine
largeur, sans chevauchement** (4 → 2 → 1 col) est dans `boreal-styles.css` (`.cards-stack__list`
en `flex-direction:row` + gap normal, `.cards-stack__item` en `flex:1 1 0`, container
full-bleed). ⚠️ Le custom code ne tourne pas dans le canvas Designer → juger le rendu sur
l'**URL publiée**.

### Section Réalisations — panorama 3D (remplace le tornado, Userback #8034641)
`initPanoramaCarousel` (remplace l'ancien `init3DCardsTornado`, retiré) : cylindre 3D façon
Netfolie **construit avec Swiper** (même techno que Netfolie) + un effet panorama custom
(`on.setTranslate` → chaque carte placée sur le cylindre via son `progress`). Swiper gère
drag + momentum. La rotation **suit la progression du scroll** de la page (section hauteur
normale, `setProgress` → **PAS d'épinglage**, on passe librement à la suite). Tilt statique
`rotateZ(3deg) rotateX(6deg)` sur un wrapper `[data-pano-tilt]` créé en JS (angle sans dérive
latérale). Curseur « Glisser ». Params : `ANGLE=40` (écart entre cartes), `R=560` (rayon).
Barba-safe (`swiper.destroy` + retrait des listeners à chaque ré-init).

⚠️ **Requiert Swiper 11** chargé dans Webflow :
- Head : `<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css">`
- Footer, **avant** `boreal-app.js` : `<script src="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js"></script>`

Le module adapte la structure existante en JS (ajoute `swiper`/`swiper-wrapper`/`swiper-slide`
+ le wrapper de tilt) — **rien à changer dans le Designer** hormis charger Swiper.

**Structure Webflow attendue :**
```
[data-pano]            (section)
  [data-pano-ring]     (Collection List — wrapper des cartes)
    [data-pcard]       (Collection Item = lien vers l'étude de cas ; 1 par réalisation)
      … image + titre + tag …
  [data-pano-cursor]   (div « Glisser » ; optionnel mais recommandé)
```
Le nombre de cartes = nombre d'items de la Collection (idéalement ~10-14 pour un anneau bien
rempli). Largeur/hauteur des cartes, perspective, tilt et hauteur de section sont gérés par
`boreal-styles.css` (surchargeables). ⚠️ Rendu visible **uniquement sur l'URL publiée**.

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
- Nav : la nav `[data-navigation-status]` reste DANS `[data-main]` (pour coulisser avec la page à l'ouverture).
  Le `transform` d'ouverture réancrait son `position:fixed` → après scroll elle sautait hors écran.
  Fix (`initFixedUnderlayNavigation`) : `translateY(scrollY)` sur la nav à l'ouverture + `lenis.stop()`
  (fond gelé), nettoyé à la fermeture. Global (toutes pages), rien à faire dans le Designer.

### Menu — bold full-screen (Osmo) — remplace le two-step scaling
Module `initBoldFullScreenNavigation` (persistant, `initOnce`). Toggle/close via
`[data-navigation-toggle="toggle"|"close"]` (délégation sur `document` → survit aux swaps Barba),
statut sur `[data-navigation-status]` (`active`/`not-active`), ESC ferme. Intègre `lenis.stop()`
à l'ouverture / `lenis.start()` à la fermeture. CSS `.bold-nav-full__*` dans `boreal-styles.css`
(hamburger, tile clip-path plein écran, liens qui montent en cascade + hover). L'ancien
`initTwostepScalingNavigation` / `.twostep-nav__*` est retiré.

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
