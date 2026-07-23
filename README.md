# Boréal Technique — assets front-end

Fichiers statiques (JS/CSS) servis en CDN via **jsDelivr** pour le site Webflow
`boreal-technique.webflow.io`. **Aucun secret ici** — uniquement du code d'animation.

## Fichiers
- `boreal-app.js` — tous les modules (nav, curseur, parallax, split titres, hero Flip,
  hero bg-zoom, stacking cards, **radial cards slider** (Osmo/GSAP Draggable), odometer,
  logo wall, panorama 3D réalisations, footer
  parallax, parallax image layers (hero Réalisation T07), mini showreel player (Flip, T07),
  layered image slider (Observer/CustomEase, T07), lecteur vidéo HLS Bunny (hls.js, T07),
  panneau formulaire underlay,
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
l'**URL publiée**. Le **liseré coloré rotatif** (`conic-gradient` par carte) autour de ces box a été
**retiré** (Userback) : les cartes sont désormais sans contour. Le keyframe `brd-spin` reste utilisé
par les cartes chiffres STATS26 (pages service).

### Section Types d'événements — radial cards slider (Osmo/GSAP, remplace depth-tiles)
`initRadialCardsSlider` : slider en **roue radiale** (composant Osmo « Radial Cards Slider GSAP »)
piloté par GSAP **Draggable + InertiaPlugin** (drag + inertie) et boutons `prev`/`next`. Remplace
l'ancien `depth-tiles` pour présenter les types d'événements (cartes en **format paysage**). Clone
automatiquement les items pour remplir la roue et boucler. Barba-safe : un registre `_radialSliders`
tue le Draggable + retire le proxy à chaque ré-init. Ease `"radial"` créée au boot.

**Structure Webflow attendue** (structure Osmo standard) :
```
[data-radial-slider-init]              (.radial-gsap-slider)
  [data-radial-slider-collection]
    [data-radial-slider-list]
      [data-radial-slider-item] × N    (.radial-card à l'intérieur)
  [data-radial-slider-control="prev"] / ["next"]   (boutons ; dots/compteur optionnels)
```
Géométrie via 2 variables CSS (`boreal-styles.css`) réglées pour le paysage : `--slider-rotate`
(écart angulaire entre cartes) et `--slider-radius` (rayon, en % de la hauteur d'une carte).
⚠️ Rendu visible **uniquement sur l'URL publiée** → ajuster ces 2 valeurs à l'œil après publication.

**Pop-ups sur les cartes :** le calque de drag (proxy) capte les clics → un `data-modal-target`
posé sur une carte ne recevrait jamais le clic. Le module câble donc `onClick` du Draggable :
il retrouve la carte réellement cliquée (`elementFromPoint`, proxy ignoré le temps de la mesure)
et ouvre sa modale via `openModalByName` (helper partagé avec `initModalBasic`). Poser
`data-modal-target="<nom>"` sur la carte et `data-modal-name="<nom>"` sur la pop-up.

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

### Section Spécialisations T02 — masonry grid (Osmo, remplace les cartes icônes, Userback #8034721)
`initMasonryGrid` : grid **masonry** (colonnes de hauteurs inégales) sur `[data-masonry-list]`.
Nombre de colonnes + gap via CSS (`--masonry-col` / `--masonry-gap`, 4 → 3 → 2 par breakpoint) ;
le JS positionne les items en `absolute` et fixe la hauteur du container. Recalcule au resize, au
chargement des images et des polices ; `ScrollTrigger.refresh()` après layout (la hauteur change).
`data-masonry-shuffle="false"` préserve l'ordre HTML. Barba-safe (registre `_masonryGrids` → destroy
des instances de la page précédente). Remplace l'ancienne rangée de **cartes icônes** (grid statique
Webflow, sans code custom — retirée dans le Designer) qu'Hugo jugeait « pas pro ». ⚠️ Rendu visible
**uniquement sur l'URL publiée**.

### Apparition au scroll (glisse horizontale ou zoom)
`initTextApparition` : un élément avec `apparition="left"` entre depuis la gauche, `apparition="right"`
depuis la droite, jusqu'à sa position initiale (`x:0`) + fondu. `apparition="zoom"` grossit depuis une
échelle réduite jusqu'à `1` + fondu (effet d'apparition façon RestoAmir, utilisé sur les
`.timeline9_item` de la page À Propos). **Lié au scroll** (`scrub` : de `top bottom` à `center center`).
Distance de départ en vw via `apparition-distance` (défaut 40, left/right) ; échelle de départ du zoom
via `apparition-scale` (défaut 0.8). Barba-safe (`gsap.context` reverté à chaque ré-init) ; désactivé
en `prefers-reduced-motion`. ⚠️ La section conteneur d'un left/right doit être en **`overflow: hidden`**
(sinon `apparition="right"` peut créer un scroll horizontal). Attributs custom sans préfixe `data-` (voulu côté client).

### Remplissage de la ligne timeline au scroll (page À Propos)
`initTimelineProgress` : remplit la `.timeline9_line` (Relume) d'un bleu `var(--_primitives---colors--dodger-blue)`
qui grandit du haut vers le bas en suivant le scroll. Non destructif : une barre `[data-timeline-fill]`
est injectée en JS par-dessus la ligne sombre existante, puis scalée en Y (`scrub`, de `top center` à
`bottom center` sur `.timeline9_progress`). Barba-safe (`gsap.context`) ; en `prefers-reduced-motion`
la ligne est laissée pleine (bleu statique).

### Lecteur vidéo HLS (Bunny, Osmo advanced) — page Réalisation (T07)
`initBunnyPlayer` : lecteur vidéo HLS custom sur `[data-bunny-player-init]` (+ `data-player-src="<url .m3u8>"`).
Contrôles délégués `[data-player-control="playpause|mute|fullscreen"]`, timeline scrubbable, ratio auto
(`data-player-update-size="true"`) ou plein cadre (`"cover"`), lazy (`data-player-lazy="true|meta"`).
**Autoplay** : `data-player-autoplay="true"` → force muted + loop + `IntersectionObserver` (play quand visible,
pause hors écran). Barba-safe : registre `_bunnyPlayers` → destroy (hls.js, IntersectionObserver, rAF,
listeners globaux document/window) à chaque ré-init. CSS `.bunny-player__*` (Step 3 Osmo) dans `boreal-styles.css`.

⚠️ **Requiert hls.js** chargé dans le **footer**, **avant** `boreal-app.js` :
`<script src="https://cdn.jsdelivr.net/npm/hls.js@1.6.11"></script>`
(Safari lit le HLS nativement ; hls.js couvre Chrome/Firefox/Edge.)

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
