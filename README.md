# Boréal Technique — assets front-end

Fichiers statiques (JS/CSS) servis en CDN via **jsDelivr** pour le site Webflow
`boreal-technique.webflow.io`. **Aucun secret ici** — uniquement du code d'animation.

## Fichiers
- `boreal-app.js` — tous les modules (nav, curseur, parallax, split titres, hero Flip,
  hero bg-zoom, stacking cards, **radial cards slider** (Osmo/GSAP Draggable), odometer,
  logo wall, panorama 3D réalisations, offres d'emploi repliées (T10), footer
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
`initStackingStickyCardsBounce` : les cartes `[data-stacking-card]` d'une section
`[data-stacking-cards-init]` **montent/descendent PILOTÉES PAR LE SCROLL** (`scrub:true`,
staggerées), chacune à un **angle de repos différent**, + **bounce** (`pulseElement`) quand chaque
carte atteint sa position. Le layout **rangée côte-à-côte pleine largeur, sans chevauchement**
(N → 2 → 1 col) est dans `boreal-styles.css` (`.cards-stack__list` en `flex-direction:row` + gap
normal, `.cards-stack__item` en `flex:1 1 0`, container full-bleed).

**Angles (corrigé — 5e service ajouté, août 2026).** Ils sont **calculés à partir du nombre de
cartes**, plus lus dans une liste figée : `restAngles(n)` renvoie un éventail symétrique
(`max × (2i/(n-1) − 1)`, carte du milieu droite si n est impair) dont l'amplitude décroît avec le
nombre (`max = min(6, 24/n)` → 6° à 4 cartes, 4.8° à 5). L'ancienne liste `[-6,-2.5,2.5,6]`
relancée en modulo donnait à la 5e carte l'angle de la 1re : deux voisines penchées **l'une vers
l'autre**, qui se chevauchaient (titre « Installations permanentes » passé dessous).

Deux corollaires CSS : le **padding latéral** du container doit couvrir le débordement d'une carte
inclinée (≈ hauteur × sin(angle) / 2), sinon les cartes de bout sont rognées par le bord de
l'écran ; et le **titre** passe en `font-size` fluide, le h3 du style guide débordant de la carte
à 5 colonnes.

⚠️ Le custom code ne tourne pas dans le canvas Designer → juger le rendu sur l'**URL publiée**.
Le **liseré coloré rotatif** (`conic-gradient` par carte) autour de ces box a été **retiré**
(Userback) : les cartes sont désormais sans contour. Le keyframe `brd-spin` reste utilisé par les
cartes chiffres STATS26 (pages service).

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

### Section Réalisations — panorama (recette Netfolie exacte, Userback #8034641)
`initPanoramaCarousel` — **reconstruit de zéro le 2026-08-12** après plusieurs itérations
ratées (cylindre maison, coverflow, rangée plate : le client n'a jamais été satisfait).

**Pourquoi ça ne marchait pas :** on rejouait une math approchée. Relevé sur netfolie.com,
leur carrousel n'est pas un cylindre maison mais le **module officiel Swiper
`EffectPanorama`** (`effect: 'panorama'`). Le module est désormais embarqué dé-minifié dans
`boreal-app.js` (fonction `EffectPanorama`) et alimenté avec les **valeurs exactes relevées
chez Netfolie** :

| Réglage | Valeur Netfolie |
|---|---|
| `panoramaEffect` | `{ depth: 0, rotate: 37 }` |
| `slidesPerView` / `spaceBetween` | `4` / `19→34px` selon breakpoint |
| `centeredSlides` · `loop` · `speed` | `true` · `true` · `600` |
| `freeMode` | activé, **`momentum: false`** |
| `resistanceRatio` | `0.85` |
| `perspective` (conteneur) | `1200px` |
| tilt (wrapper parent) | `rotate(9deg) scale(1.2)` |
| rayon des cartes | `36px`, ratio `5/4` |

**Différence assumée vs Netfolie :** chez eux la rotation est mappée sur le scroll **absolu**
(`translate = start − scrollY × 0.5`) → passé la section, le carrousel **se vide**
(vérifié : 0 carte visible en bas de page). Ici le pilotage est **relatif à la section**
(ScrollTrigger, progression 0→1 pendant la traversée de l'écran, même ratio 0.5 px/px) et
`loopFix()` garde l'anneau peuplé en permanence. Visuellement identique, sans l'état vide.

Le **drag reste cumulatif** : `dragOffset` mémorise l'écart introduit à la main au `touchEnd`,
sinon la frame de scroll suivante écraserait le glissement de l'utilisateur.

**Cartes rognées en haut/en bas — résolu (2026-08-12, 2ᵉ passe).** Trois causes cumulées, toutes
mesurées avant correction :
1. **Perspective en dur à 1200px.** Netfolie : 1200px pour des cartes de 275px (carte + gap),
   soit un rapport **4,36**. Nos cartes font 336px → à 1200px le grossissement max passait à
   **8,5×** (au lieu de 3,6× chez eux) et les cartes proches devenaient énormes. La perspective
   est maintenant calculée : `taille_carte × 4.36` (`PANO_PERSPECTIVE_RATIO`), à chaque breakpoint.
2. **Les cartes vues de profil.** À rotateY ≈ 86°, la perspective transforme une carte de 251px
   en lamelle de **532px de haut** — illisible, et c'est elle qui se faisait couper. Réserver la
   hauteur pour elle donnait une section de **1245px** (surtout du vide). À la place, un **fondu
   par angle** (`panoApplyFade`, smoothstep sur `cos(rotateY)`) : pleine opacité jusqu'à ~57°,
   invisible à ~72°. Supprime aussi les cartes **de dos**, qui revenaient grossies par l'avant.
3. **Réserve verticale devinée.** Elle est désormais **calculée** (`fitStage`) à partir de
   l'angle et de l'échelle réels lus dans la matrice du tilt : `lift` (le tilt soulève les
   extrémités du plan) + `grow` (grossissement max d'une carte encore visible). Recalculée au
   resize et au `ScrollTrigger.refresh`. Résultat : ~695px à 1440px de large, sans rognage.

⚠️ `fitStage` pose `padding-top`/`padding-bottom` **en inline** sur `.realisations_stage` : c'est
une valeur de géométrie calculée, pas un choix de design. Le `clamp()` de la classe Webflow reste
comme repli si le JS ne tourne pas. Les paddings **horizontaux** restent pilotés par le Designer.
Pas d'épinglage → la section a une hauteur normale, on scrolle librement.
Barba-safe (`swiper.destroy` + `ScrollTrigger.kill` à chaque ré-init).

⚠️ **Requiert Swiper 11** chargé dans Webflow (sans lui le module sort en `return` — c'était
le cas en prod jusqu'au 2026-08-12, la section était donc morte) :
- Head : `<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css">`
- Footer, **avant** `boreal-app.js` : `<script src="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js"></script>`

**Structure Webflow (classes Client-First namespacées) :**
```
.realisations_stage      [data-pano]        (hors container-large = pleine largeur)
  .realisations_tilt                        (rotate 9° + scale 1.2)
    .realisations_viewport [data-pano-ring] (perspective 1200px ; devient le .swiper)
      .realisations_item   [data-pcard]     (lien vers l'étude de cas ; 1 par réalisation)
        .realisations_card
          .realisations_image
          .realisations_meta
            .tag.is-alternate
            .realisations_titles > h3.heading-style-h6
```
⚠️ Les anciennes classes `cards-tornado*` / `demo-card` / `cover-image` ont été **abandonnées
ici** (pas renommées : elles servent encore sur T06 et T07). C'étaient deux sources de bug —
`.cards-tornado__item` gardait la géométrie tornade (`position:absolute; left:50%; top:50%`),
incompatible avec une rangée Swiper, et `demo-card`/`cover-image` sont des noms génériques
Osmo partagés entre modules.

Le look statique (rayon, ratio, meta, tilt, perspective) vit dans les **classes Webflow** →
éditable dans le Designer. `boreal-styles.css` ne porte que la glue Swiper, le scrim et le
`prefers-reduced-motion`. Le nombre de cartes = items de la Collection (~10-14 idéalement).
⚠️ Rendu visible **uniquement sur l'URL publiée**.

**Où le module est utilisé (audit du 2026-08-12) :** un balayage des 11 pages publiées a
comparé tous les `data-*` du DOM aux attributs réellement gérés par `boreal-app.js`. Résultat :
`data-3d-tornado-*` traînait encore sur **T02** et **T07** alors que `init3DCardsTornado` avait
été supprimé → deux sections mortes (7 cartes empilées aux mêmes coordonnées, 900px de vide).
Les deux ont été converties au panorama :

| Page | Section | Statut |
|---|---|---|
| Accueil (T01) | « Des événements qui parlent pour eux. » | 13 cartes ✅ |
| T02 Intérieurs | « Des événements qui parlent pour eux. » | 7 cartes ✅ (ex-tornade morte) |
| T07 Réalisation | « D'autres réalisations du même type. » | 7 cartes ✅ (ex-tornade morte, = Userback **#8034857**) |

**Trop peu de cartes = anneau mort — résolu (2026-08-18).** Swiper **désactive `loop`** quand il
y a moins de `slidesPerView × 2` slides (`Swiper Loop Warning` dans la console). Avec 7
réalisations pour 4 cartes/vue (il en faut 8), T02 et T07 sortaient un anneau figé, à moitié
vide — l'accueil (13 cartes) n'était pas touché, d'où le « ça marche sur l'accueil seulement ».
Le module **duplique désormais les cartes** jusqu'à `PANO_MIN_SLIDES = 12` (4/vue × 3, pour un
anneau plein sur les côtés) : les clones portent `data-pano-clone` (+ `aria-hidden` et
`tabindex="-1"`) et sont retirés en début de ré-init, donc jamais cumulés par Barba.
Viser quand même ~10-14 items réels quand la Collection CMS sera branchée : les doublons se
voient sur un anneau de 7.

**Autre orphelin repéré par l'audit, non traité :** `data-underline-link` (12 occurrences sur
**toutes** les pages, probablement les liens de footer) n'est géré ni par le JS ni par le CSS —
effet de soulignement mort à confirmer avec Jessy.

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

### Gradient Wave Text au scroll (Osmo)
`initGradientWaveText` : sur chaque `[data-gradient-wave-text]`, SplitText découpe le titre en caractères
qui, au scroll, passent de `startColor` (inactif, défaut `rgba(255,255,255,0.2)`) → une **vague** `waveColor`
(défaut = bleu `--_primitives---colors--dodger-blue`, résolu en hex car GSAP n'interpole pas un `var()`) →
`endColor` (couleur CSS de repos du titre). Overrides par attribut : `data-gradient-wave-scroll-start`
(défaut `top 90%`), `-scroll-end` (`center 40%`), `-color-start`, `-color-wave`, `-duration` (0.4), `-scrub` (0.1).
Requiert **SplitText** (chargé + registré dans le head). Barba-safe : registre `_gradientWaveSplits` reverté à
chaque ré-init (le revert du SplitText tue aussi le contexte GSAP + ScrollTrigger). Désactivé en
`prefers-reduced-motion` (titre laissé à sa couleur de repos). Utilisé sur les titres Mission / Vision (À Propos).

### Filtre multi-match (Osmo) — page Réalisations (T06)
`initMultiFilter` : chaque `[data-filter-group]` pilote des boutons `[data-filter-target]` (valeurs `all`,
`reset`, ou un tag) et des items `[data-filter-name]` (tokens séparés par espace ; ou collectés depuis des
enfants `[data-filter-name-collect]`). Modes via `data-filter-target-match` (`single`/`multi`) et
`data-filter-name-match` (`multi`=OR, `single`=AND). Le JS ne pose que `data-filter-status`
(`active`/`not-active`/`transition-out`) + attributs aria ; **toute l'animation est en CSS** (`boreal-styles.css`).
Barba-safe : listener sur le groupe (dans le container remplacé par Barba) + garde `data-filter-bound`.
⚠️ **État actif du bouton adapté** : l'original Osmo (`background:#131313`) est invisible sur le fond sombre du
site → remplacé par l'accent **bleu** (`--_primitives---colors--dodger-blue`, texte sombre). ⚠️ Le filtrage
ne fait effet que si les items portent un `data-filter-name` (à binder sur la catégorie CMS côté Webflow).

### 3D Image Carousel (Osmo) — page À Propos
`init3dImageCarousel` : cylindre 3D de panneaux `[data-3d-carousel-panel]` dans `[data-3d-carousel-wrap]`
(chaque panneau contient un/des `[data-3d-carousel-content]`). Rotation auto infinie, **drag** (Draggable +
InertiaPlugin), **impulsion à la molette** (Observer), et intro au scroll (scale/rotation/fade aléatoire).
Requiert Draggable + InertiaPlugin + Observer (chargés dans le head). CSS : `.img-carousel__panel:nth-of-type(even){justify-content:center}`
dans `boreal-styles.css`. ⚠️ **Écarts vs snippet Osmo brut** (importants dans notre contexte multi-modules /
Barba) : (1) le nettoyage NE fait PAS `ScrollTrigger.getAll().kill()` — il tuerait les autres modules ; on ne
kill que les instances de CE carrousel (`intro.scrollTrigger` inclus) ; (2) le listener `resize` est mémorisé
et retiré à la ré-init via le handle `_carousel3d.teardown()` ; (3) `prefers-reduced-motion` : pas de spin auto
ni d'intro ni d'impulsion molette (état de repos figé), le **drag reste dispo**. Le bloc `.wf-design-mode{…}`
du snippet Osmo n'est PAS dans le CDN (Designer-only) — à coller dans un Embed Webflow si édition au Designer.

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

### Offres d'emploi repliées — page Carrières (T10)
`initCareerJobToggle` : chaque `.career14_item` n'affiche au repos que **le titre (+ tag) et la
ligne d'accroche** ; tout le reste (Description, paragraphe, Compétences, lieu/temps plein,
bouton *Postuler*) est déplacé en JS dans un conteneur injecté `[data-career-body]`
(`.career14_details`) replié à `height: 0`, et un bouton **« Voir plus » / « Voir moins »**
(`.career14_toggle`) est posé sous l'accroche.

- **Rien à restructurer dans le Designer** — le module lit la pile de blocs de l'item et coupe
  **après le premier bloc contenant un `<p>`** (= l'accroche), avec repli sur « les 2 premiers
  blocs » si la structure change.
- Bouton **au-dessus** du corps : sa position ne bouge pas entre ouvert et fermé.
- Hauteur animée en GSAP (`height: 'auto'`, ease `osmo`, 0.55s) + `autoAlpha` (le contenu replié
  est aussi hors tab-order). `prefers-reduced-motion` → bascule instantanée.
- `ScrollTrigger.refresh()` **à l'init** (le repli raccourcit beaucoup la page) et **en fin
  d'animation** : c'est aussi ce qui déclenche le filet des titres splittés masqués
  (`initSplitHeadings`), sinon un titre replié peut rester invisible après ouverture.
- a11y : `<button>` réel, `aria-expanded`, `aria-controls` vers l'id du corps.
- Barba-safe : `data-career-toggle-init` empêche le double traitement ; `data-career-status`
  sur l'item pilote la rotation du chevron en CSS.

Habillage dans `boreal-styles.css` (`.career14_toggle`, chevron, repli) — souligné en blanc,
bleu `dodger-blue` au survol/focus.

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

### Halo de section (flare bleu sur le fond noir) — Userback « trop de noir »
CSS seul (`boreal-styles.css`), aucun élément à créer. Un `::after` non cliquable dessine une
ellipse très diffuse au bleu d'accent, ancrée au bas de la section et volontairement plus large
qu'elle pour n'avoir aucun bord visible.

Deux déclencheurs :
- **`.radial-section`** — automatique : **toute** section de radial cards slider a son halo, sur
  toutes les pages, sans rien poser dans le Designer.
- **`data-section-glow="bottom"` / `"top"`** — à poser sur n'importe quelle autre section.

Les enfants directs repassent au-dessus (`position: relative; z-index: 1`) — pas
d'`overflow: hidden`, qui couperait les cartes du slider radial.

La couleur passe par `color-mix()` sur le **token** `--_primitives---colors--dodger-blue`
(fallback `#1e90ff`) : un seul point de vérité pour le bleu, pas de hex dupliqué.

Réglages, en surcharge sur la section (variables CSS) :
```
--glow-color   : couleur du flare (défaut = dodger-blue du design system)
--glow-opacity : intensité au centre (défaut 0.15 — rester bas sur fond noir)
--glow-height  : hauteur du flare (défaut clamp(22rem, 55vh, 44rem))
--glow-width   : largeur de l'ellipse (défaut min(180rem, 220%))
```
⚠️ Invisible dans le canvas Designer — juger sur l'URL publiée.

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
