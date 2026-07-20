/* =====================================================
   BORÉAL — app.js  (chargé UNE fois, persistant)
   - GSAP + plugins viennent du HEAD (avec verrou window.gsap).
   - Lenis + Barba chargés AVANT ce fichier (voir footer).
   - Toutes les définitions de modules vivent ici (plus aucun
     <script> de section dans les pages).
   - Barba appelle chaque module 1×/page (reload + navigation).
   ===================================================== */

// -----------------------------------------
// STATE
// -----------------------------------------
let lenis = null;
let nextPage = document;
let onceInitialized = false;
let currentInitedContainer = null;

const hasLenis = typeof window.Lenis !== "undefined";
const hasScrollTrigger = typeof window.ScrollTrigger !== "undefined";

const rmMQ = window.matchMedia("(prefers-reduced-motion: reduce)");
let reducedMotion = rmMQ.matches;
rmMQ.addEventListener?.("change", (e) => (reducedMotion = e.matches));
rmMQ.addListener?.((e) => (reducedMotion = e.matches));

const has = (s) => !!(nextPage || document).querySelector(s);
const durationDefault = 0.6;

// Debounce partagé (utilisé par plusieurs modules)
function debounceOnWidthChange(fn, ms) {
  let last = innerWidth, timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (innerWidth !== last) { last = innerWidth; fn.apply(this, args); }
    }, ms);
  };
}


// -----------------------------------------
// BOOT (attend le GSAP du head)
// -----------------------------------------
function boot() {
  if (!window.gsap) { return void setTimeout(boot, 50); }
  gsap.registerPlugin(ScrollTrigger, Flip, SplitText, CustomEase, Observer, Draggable, InertiaPlugin);
  CustomEase.create("osmo", "0.625, 0.05, 0, 1");
  CustomEase.create("osmo-ease", "0.625, 0.05, 0, 1");
  CustomEase.create("depth", "M0,0 C0.6,0 0,1 1,1");
  CustomEase.create("energy", "M0,0 C0.32,0.72 0,1 1,1");
  gsap.defaults({ ease: "osmo", duration: durationDefault });

  if (!reducedMotion) {
    const cols0 = document.querySelectorAll("[data-transition-column]");
    if (cols0.length) gsap.set(cols0, { yPercent: 100 });
  }
  initBarba();
}


// -----------------------------------------
// REGISTRES
// -----------------------------------------

// Modules PERSISTANTS (une seule fois) : nav + curseur (éléments hors container)
function initOnce() {
  if (onceInitialized) return;
  onceInitialized = true;
  initLenis();
  initAnchorSmoothScroll();
  initBoldFullScreenNavigation();
  initCursorMarqueeEffect();
  initFixedUnderlayNavigation(); // panneau formulaire soumission (persistant)
  initAdvancedFormValidation();  // validation live du formulaire (Osmo) — persistant
  initMiniShowreelPlayer();      // lecteur showreel (Osmo, Flip) — persistant, délégation (T07)
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModals(); }); // 1× (persistant)
}

// Modules PAR PAGE : appelés 1×/page (once OU afterEnter, le 1er qui vient)
function runPageModulesOnce(container) {
  if (currentInitedContainer === container) return; // déjà fait pour cette page
  currentInitedContainer = container;
  nextPage = container || document;

  const modules = [
    initButtonCharacterStagger,
    initGlobalParallax,        // parallax flexible Osmo ([data-parallax="trigger"])
    initContentRevealScroll,   // reveal on scroll Osmo ([data-reveal-group])
    initSplitHeadings,
    initFlipOnScroll,        // hero home
    initBackgroundZoom,      // hero page service
    initParallaxLayers,      // hero page réalisation (T07) — parallax image layers Osmo
    initLayeredImageSlider,  // slider images superposées (Osmo) — T07
    initStackingStickyCardsBounce,
    initDepthTiles,
    initModalBasic,          // pop-ups (Osmo modal B) — secteurs T02
    initMarqueeScrollDirection, // marquee direction-au-scroll (Osmo) — section clé en main
    initStickyStepsBasic,    // étapes sticky (Osmo, version GSAP ScrollTrigger) — processus
    initSliders,             // slider centré draggable (Osmo) — témoignages
    initAccordionCSS,        // accordéon CSS (Osmo) — FAQ
    initNumberOdometer,
    initLogoWallCycle,
    initPanoramaCarousel,
    initFooterParallax
  ];
  modules.forEach((fn) => {
    try { if (typeof fn === "function") fn(); }
    catch (e) { console.warn("[boreal] module", fn && fn.name, e); }
  });
}


// -----------------------------------------
// TRANSITIONS — COLUMN WIPE
// -----------------------------------------
function runPageOnceAnimation(next) {
  const wrap = document.querySelector("[data-transition-wrap]");
  const cols = wrap ? wrap.querySelectorAll("[data-transition-column]") : [];
  const tl = gsap.timeline();
  tl.call(() => { resetPage(next); }, null, 0);
  if (reducedMotion || !cols.length) return tl;
  tl.set(cols, { yPercent: 100 }, 0);
  tl.to(cols, { yPercent: 200, duration: 0.6, stagger: 0.06 }, 0.15);
  return tl;
}

function runPageLeaveAnimation(current, next) {
  const wrap = document.querySelector("[data-transition-wrap]");
  const cols = wrap ? wrap.querySelectorAll("[data-transition-column]") : [];
  const tl = gsap.timeline({ onComplete: () => { current.remove(); } });
  if (reducedMotion || !cols.length) return tl.set(current, { autoAlpha: 0 });
  tl.set(next, { autoAlpha: 0 }, 0);
  tl.fromTo(cols, { yPercent: 0 }, { yPercent: 100, duration: 0.6, stagger: { each: 0.06, from: "end" } }, 0);
  return tl;
}

function runPageEnterAnimation(next) {
  const wrap = document.querySelector("[data-transition-wrap]");
  const cols = wrap ? wrap.querySelectorAll("[data-transition-column]") : [];
  const tl = gsap.timeline();
  if (reducedMotion || !cols.length) {
    tl.set(next, { autoAlpha: 1 });
    tl.call(resetPage, [next]);
    tl.add("pageReady");
    return new Promise((resolve) => tl.call(resolve, null, "pageReady"));
  }
  tl.add("startEnter", 1);
  tl.set(next, { autoAlpha: 1 }, "startEnter");
  tl.call(resetPage, [next], "startEnter"); // stabilise le layout à couvert (pas de saut footer)
  tl.to(cols, { yPercent: 200, duration: 0.6, stagger: 0.06, overwrite: "auto" }, "startEnter");
  tl.add("pageReady");
  return new Promise((resolve) => { tl.call(resolve, null, "pageReady"); });
}


// -----------------------------------------
// BARBA
// -----------------------------------------
function initBarba() {
  barba.hooks.before(() => { closeNav(); closeModals(); });

  barba.hooks.beforeEnter((data) => {
    gsap.set(data.next.container, { position: "fixed", top: 0, left: 0, right: 0 });
    if (lenis && typeof lenis.stop === "function") lenis.stop();
    applyThemeFrom(data.next.container);
  });

  barba.hooks.afterLeave(() => {
    if (hasScrollTrigger) ScrollTrigger.getAll().forEach((t) => t.kill());
  });

  barba.hooks.enter((data) => { initBarbaNavUpdate(data); });

  barba.hooks.afterEnter((data) => {
    runPageModulesOnce(data.next.container);
    settleScroll(data.next.container);
  });

  barba.init({
    debug: false,
    timeout: 7000,
    preventRunning: true,
    transitions: [{
      name: "default",
      sync: true,
      async once(data) {
        initOnce();
        applyThemeFrom(data.next.container);
        runPageModulesOnce(data.next.container); // filet si afterEnter ne fire pas sur once
        settleScroll(data.next.container);
        return runPageOnceAnimation(data.next.container);
      },
      async leave(data) {
        return runPageLeaveAnimation(data.current.container, data.next.container);
      },
      async enter(data) {
        return runPageEnterAnimation(data.next.container);
      }
    }]
  });
}


// -----------------------------------------
// HELPERS
// -----------------------------------------
function closeNav() {
  const s = document.querySelector("[data-navigation-status]");
  if (s) s.setAttribute("data-navigation-status", "not-active");
  if (window.lenis) window.lenis.start();
}

function closeModals() {
  document.querySelectorAll("[data-modal-target]").forEach((t) => t.setAttribute("data-modal-status", "not-active"));
  document.querySelectorAll("[data-modal-name]").forEach((m) => m.setAttribute("data-modal-status", "not-active"));
  const g = document.querySelector("[data-modal-group-status]");
  if (g) g.setAttribute("data-modal-group-status", "not-active");
  if (window.lenis) window.lenis.start(); // relance le scroll
}

const themeConfig = {
  light: { nav: "dark",  transition: "light" },
  dark:  { nav: "light", transition: "dark"  }
};

function applyThemeFrom(container) {
  const pageTheme = (container && container.dataset && container.dataset.pageTheme) || "dark";
  const config = themeConfig[pageTheme] || themeConfig.dark;
  document.body.dataset.pageTheme = pageTheme;
  const transitionEl = document.querySelector("[data-theme-transition]");
  if (transitionEl) transitionEl.dataset.themeTransition = config.transition;
  const nav = document.querySelector("[data-theme-nav]");
  if (nav) nav.dataset.themeNav = config.nav;
}

function initLenis() {
  if (lenis) return;
  if (!hasLenis) return;
  lenis = new Lenis({ lerp: 0.165, wheelMultiplier: 1.25, syncTouch: true });
  window.lenis = lenis;
  if (hasScrollTrigger) lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => { lenis.raf(time * 1000); });
  gsap.ticker.lagSmoothing(0);
}

function initAnchorSmoothScroll() {
  document.addEventListener("click", (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute("href");
    if (id.length > 1 && lenis) { e.preventDefault(); lenis.scrollTo(id); }
  });
}

function resetPage(container) {
  window.scrollTo(0, 0);
  gsap.set(container, { clearProps: "position,top,left,right" });
  if (hasLenis) { lenis.resize(); lenis.start(); }
}

// Recale les ScrollTriggers après stabilisation du layout (images, cartes panorama,
// rollers odometer…). En navigation SPA il n'y a pas de window.load → sans ça, des
// triggers (ex. footer parallax) sont mesurés trop tôt → glitch. Correctif : refresh
// immédiat + après 2 RAF + délais + à chaque image du nouveau container qui se charge.
function settleScroll(container) {
  const doIt = () => { if (hasLenis) lenis.resize(); if (hasScrollTrigger) ScrollTrigger.refresh(); };
  if (hasLenis) lenis.start();
  doIt();
  requestAnimationFrame(() => requestAnimationFrame(doIt));
  setTimeout(doIt, 300);
  setTimeout(doIt, 800);
  if (container) {
    container.querySelectorAll("img").forEach((img) => {
      if (!img.complete) img.addEventListener("load", doIt, { once: true });
    });
  }
}

function initBarbaNavUpdate(data) {
  var tpl = document.createElement("template");
  tpl.innerHTML = data.next.html.trim();
  var nextNodes = tpl.content.querySelectorAll("[data-barba-update]");
  var currentNodes = document.querySelectorAll("nav [data-barba-update]");
  currentNodes.forEach(function (curr, index) {
    var next = nextNodes[index];
    if (!next) return;
    var newStatus = next.getAttribute("aria-current");
    if (newStatus !== null) curr.setAttribute("aria-current", newStatus);
    else curr.removeAttribute("aria-current");
    curr.setAttribute("class", next.getAttribute("class") || "");
  });
}


// =========================================================
// MODULES  (définitions — sans DOMContentLoaded ni registerPlugin)
// =========================================================

// ---- NAV : bold full-screen ----
function initBoldFullScreenNavigation() {
  const getNav = () => document.querySelector("[data-navigation-status]");
  const setStatus = (v) => { const el = getNav(); if (el) el.setAttribute("data-navigation-status", v); };
  const isActive = () => { const el = getNav(); return !!el && el.getAttribute("data-navigation-status") === "active"; };
  const openNav = () => { setStatus("active"); if (window.lenis) window.lenis.stop(); };
  const closeNavMenu = () => { setStatus("not-active"); if (window.lenis) window.lenis.start(); };
  const toggleNav = () => (isActive() ? closeNavMenu() : openNav());

  // Délégation sur document : survit aux swaps Barba (les boutons peuvent être re-rendus)
  document.addEventListener("click", (e) => {
    const t = e.target.closest && e.target.closest('[data-navigation-toggle="toggle"]');
    const c = e.target.closest && e.target.closest('[data-navigation-toggle="close"]');
    if (t) { e.preventDefault(); toggleNav(); }
    else if (c) { e.preventDefault(); closeNavMenu(); }
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && isActive()) closeNavMenu(); });
}

// ---- BOUTONS : stagger caractères (guardé pour ne pas re-wrapper) ----
function initButtonCharacterStagger() {
  const offsetIncrement = 0.01;
  const buttons = document.querySelectorAll("[data-button-animate-chars]");
  buttons.forEach((button) => {
    if (button.hasAttribute("data-chars-done")) return; // déjà traité
    button.setAttribute("data-chars-done", "");
    const text = button.textContent;
    button.innerHTML = "";
    [...text].forEach((char, index) => {
      const span = document.createElement("span");
      span.textContent = char;
      span.style.transitionDelay = `${index * offsetIncrement}s`;
      if (char === " ") span.style.whiteSpace = "pre";
      button.appendChild(span);
    });
  });
}

// ---- CURSEUR : marquee ----
function initCursorMarqueeEffect() {
  const hoverOutDelay = 0.4;
  const followDuration = 0.4;
  const speedMultiplier = 5;

  const cursor = document.querySelector("[data-cursor-marquee-status]");
  if (!cursor) return;
  const targets = cursor.querySelectorAll("[data-cursor-marquee-text-target]");

  const xTo = gsap.quickTo(cursor, "x", { duration: followDuration, ease: "power3" });
  const yTo = gsap.quickTo(cursor, "y", { duration: followDuration, ease: "power3" });

  let pauseTimeout = null, activeEl = null, lastX = 0, lastY = 0;

  function playFor(el) {
    if (!el) return;
    if (pauseTimeout) clearTimeout(pauseTimeout);
    const text = el.getAttribute("data-cursor-marquee-text") || "";
    const sec = (text.length || 1) / speedMultiplier;
    targets.forEach((t) => { t.textContent = text; t.style.animationPlayState = "running"; t.style.animationDuration = sec + "s"; });
    cursor.setAttribute("data-cursor-marquee-status", "active");
    activeEl = el;
  }
  function pauseLater() {
    cursor.setAttribute("data-cursor-marquee-status", "not-active");
    if (pauseTimeout) clearTimeout(pauseTimeout);
    pauseTimeout = setTimeout(() => { targets.forEach((t) => { t.style.animationPlayState = "paused"; }); }, hoverOutDelay * 1000);
    activeEl = null;
  }
  function checkTarget() {
    const el = document.elementFromPoint(lastX, lastY);
    const hit = el && el.closest("[data-cursor-marquee-text]");
    if (hit !== activeEl) { if (activeEl) pauseLater(); if (hit) playFor(hit); }
  }
  window.addEventListener("pointermove", (e) => { lastX = e.clientX; lastY = e.clientY; xTo(lastX); yTo(lastY); checkTarget(); }, { passive: true });
  window.addEventListener("scroll", () => { xTo(lastX); yTo(lastY); checkTarget(); }, { passive: true });
  setTimeout(() => { cursor.setAttribute("data-cursor-marquee-status", "not-active"); }, 500);
}

// ---- PARALLAX flexible (Osmo global parallax) ----
// [data-parallax="trigger"] (+ optionnel target/direction/scrub/start/end/scroll-start/scroll-end/disable)
let _parallaxMM;
function initGlobalParallax() {
  if (_parallaxMM) _parallaxMM.revert(); // nettoie l'init précédente (Barba)
  _parallaxMM = gsap.matchMedia();
  _parallaxMM.add(
    {
      isMobile: "(max-width:479px)",
      isMobileLandscape: "(max-width:767px)",
      isTablet: "(max-width:991px)",
      isDesktop: "(min-width:992px)"
    },
    (context) => {
      const { isMobile, isMobileLandscape, isTablet } = context.conditions;
      const ctx = gsap.context(() => {
        document.querySelectorAll('[data-parallax="trigger"]').forEach((trigger) => {
          const disable = trigger.getAttribute("data-parallax-disable");
          if (
            (disable === "mobile" && isMobile) ||
            (disable === "mobileLandscape" && isMobileLandscape) ||
            (disable === "tablet" && isTablet)
          ) return;

          const target = trigger.querySelector('[data-parallax="target"]') || trigger;
          const direction = trigger.getAttribute("data-parallax-direction") || "vertical";
          const prop = direction === "horizontal" ? "xPercent" : "yPercent";
          const scrubAttr = trigger.getAttribute("data-parallax-scrub");
          const scrub = scrubAttr ? parseFloat(scrubAttr) : true;
          const startAttr = trigger.getAttribute("data-parallax-start");
          const startVal = startAttr !== null ? parseFloat(startAttr) : 20;
          const endAttr = trigger.getAttribute("data-parallax-end");
          const endVal = endAttr !== null ? parseFloat(endAttr) : -20;
          const scrollStart = `clamp(${trigger.getAttribute("data-parallax-scroll-start") || "top bottom"})`;
          const scrollEnd = `clamp(${trigger.getAttribute("data-parallax-scroll-end") || "bottom top"})`;

          gsap.fromTo(target, { [prop]: startVal }, {
            [prop]: endVal, ease: "none",
            scrollTrigger: { trigger, start: scrollStart, end: scrollEnd, scrub }
          });
        });
      });
      return () => ctx.revert();
    }
  );
}

// ---- PARALLAX IMAGE LAYERS (Osmo) — hero page Réalisation (T07) ----
// [data-parallax-layers] = wrapper déclencheur ; [data-parallax-layer="1..4"] = couches
// (1 = la plus rapide → 4 = la plus subtile). GSAP + ScrollTrigger déjà chargés/registrés (head).
let _parallaxLayersCtx;
function initParallaxLayers() {
  if (_parallaxLayersCtx) _parallaxLayersCtx.revert(); // nettoie l'init précédente (Barba)
  if (rmMQ.matches) return;                            // reduced-motion : couches statiques
  _parallaxLayersCtx = gsap.context(() => {
    document.querySelectorAll("[data-parallax-layers]").forEach((triggerElement) => {
      const tl = gsap.timeline({
        scrollTrigger: { trigger: triggerElement, start: "0% 0%", end: "100% 0%", scrub: 0 }
      });
      const layers = [
        { layer: "1", yPercent: 70 },
        { layer: "2", yPercent: 55 },
        { layer: "3", yPercent: 40 },
        { layer: "4", yPercent: 10 }
      ];
      layers.forEach((layerObj, idx) => {
        tl.to(
          triggerElement.querySelectorAll(`[data-parallax-layer="${layerObj.layer}"]`),
          { yPercent: layerObj.yPercent, ease: "none" },
          idx === 0 ? undefined : "<"
        );
      });
    });
  });
}

// ---- LAYERED IMAGE SLIDER (Osmo) — page Réalisation (T07) ----
// [data-layered-slider-init] = une instance. Ease "osmo" déjà créée (initOnce),
// Observer/CustomEase déjà registrés (head). Suivi global → destroy des instances
// de la page précédente aux transitions Barba (retire leurs listeners resize/pointer).
let _layeredSliders = [];
function initLayeredImageSlider() {
  _layeredSliders.forEach((s) => { try { s.destroy(); } catch (_) {} });
  _layeredSliders = [];

  document.querySelectorAll('[data-layered-slider-init]').forEach((root) => {
    if (root._layeredSlider) root._layeredSlider.destroy();

    const titles = [...root.querySelectorAll('[data-layered-slider-title]')];
    if (!titles.length) return;
    const count = titles.length;

    const backgrounds = [...root.querySelectorAll('[data-layered-slider-bg]')];
    const maskItems = [...root.querySelectorAll('[data-layered-slider-mask-item]')];
    const maskFrame = root.querySelector('[data-layered-slider-mask]');
    const fill = root.querySelector('[data-layered-slider-fill]');
    const currentEl = root.querySelector('[data-layered-slider-current]');
    const totalEl = root.querySelector('[data-layered-slider-total]');
    const prevBtn = root.querySelector('[data-layered-slider-prev]');
    const nextBtn = root.querySelector('[data-layered-slider-next]');

    const controls = [...new Set([...titles, ...root.querySelectorAll('a, button')])];

    const autoplayAttr = root.getAttribute('data-layered-slider-autoplay');
    const autoplay = autoplayAttr !== null ? parseFloat(autoplayAttr) : 5;

    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const clamp = gsap.utils.clamp;
    const wrap = (distance) => distance - count * Math.round(distance / count);

    const transitionDuration = 1;
    const backgroundZoom = 0;
    const titleGap = 0.5;
    const titleSpacing = 40;

    if (totalEl) totalEl.textContent = String(count).padStart(2, '0');

    let titleStep = 0;
    let maskStep = 0;
    const measure = () => {
      const widestTitle = Math.max(...titles.map((title) => title.offsetWidth));
      titleStep = Math.max(root.clientWidth * titleGap, widestTitle + titleSpacing);
      maskStep = maskFrame ? maskFrame.clientWidth : root.clientWidth;
    };
    measure();

    const state = { progress: 0 };
    let activeIndex = -1;

    const setActive = (previousIndex, index) => {
      [backgrounds, titles, maskItems].forEach((list) => {
        if (previousIndex >= 0 && list[previousIndex]) list[previousIndex].removeAttribute('data-active');
        if (list[index]) list[index].setAttribute('data-active', '');
      });
    };

    const render = (progress) => {
      const centeredIndex = ((Math.round(progress) % count) + count) % count;

      for (let i = 0; i < count; i++) {
        const offset = wrap(i - progress);
        const distance = Math.abs(offset);

        const background = backgrounds[i];
        if (background) {
          const backgroundOpacity = clamp(0, 1, 1 - distance);
          gsap.set(background, {
            opacity: backgroundOpacity,
            scale: 1 + backgroundZoom - backgroundZoom * backgroundOpacity,
            zIndex: Math.round(backgroundOpacity * 100),
          });
        }

        gsap.set(titles[i], { x: offset * titleStep, opacity: i === centeredIndex ? 1 : 0.4, pointerEvents: 'auto' });

        const maskItem = maskItems[i];
        if (maskItem) gsap.set(maskItem, { x: offset * maskStep });
      }

      if (centeredIndex !== activeIndex) {
        const previousIndex = activeIndex;
        activeIndex = centeredIndex;
        setActive(previousIndex, centeredIndex);
        if (currentEl) currentEl.textContent = String(centeredIndex + 1).padStart(2, '0');
      }
    };

    let hovering = 0;
    let autoTween = null;
    const startAutoplay = () => {
      if (!autoTween) return;
      autoTween.restart();
      if (hovering > 0) autoTween.pause();
    };

    let slideTween = null;
    let current = 0;
    function goTo(delta) {
      current += delta;
      if (slideTween) slideTween.kill();
      slideTween = gsap.to(state, {
        progress: current,
        duration: reduced ? 0 : transitionDuration,
        ease: 'osmo',
        onUpdate: () => render(state.progress),
      });
      startAutoplay();
    }

    function goToIndex(i) {
      const delta = wrap(i - current);
      if (delta !== 0) goTo(delta);
    }

    if (autoplay > 0 && !reduced && fill) {
      gsap.set(fill, { scaleX: 0, transformOrigin: 'left center' });
      autoTween = gsap.to(fill, { scaleX: 1, duration: autoplay, ease: 'none', paused: true, onComplete: () => goTo(1) });
    }

    let gestureUsed = false;
    const observer = Observer.create({
      target: root,
      type: 'touch,pointer',
      dragMinimum: 10,
      tolerance: 25,
      lockAxis: true,
      onDragStart() { gestureUsed = false; },
      onLeft() { if (!gestureUsed) { gestureUsed = true; goTo(1); } },
      onRight() { if (!gestureUsed) { gestureUsed = true; goTo(-1); } },
    });

    const onPrev = () => goTo(-1);
    const onNext = () => goTo(1);
    if (prevBtn) prevBtn.addEventListener('click', onPrev);
    if (nextBtn) nextBtn.addEventListener('click', onNext);

    const onTitleClick = (e) => {
      const i = titles.indexOf(e.currentTarget);
      if (i === activeIndex) return;
      e.preventDefault();
      goToIndex(i);
    };
    titles.forEach((title) => title.addEventListener('click', onTitleClick));

    const onEnter = () => { hovering++; if (autoTween) autoTween.pause(); };
    const onLeave = () => { hovering = Math.max(0, hovering - 1); if (autoTween && hovering === 0) autoTween.resume(); };
    controls.forEach((el) => { el.addEventListener('pointerenter', onEnter); el.addEventListener('pointerleave', onLeave); });

    const onResize = () => { measure(); render(state.progress); };
    window.addEventListener('resize', onResize);

    if (document.fonts) document.fonts.ready.then(onResize);

    render(0);
    startAutoplay();

    root._layeredSlider = {
      goTo,
      destroy() {
        observer.kill();
        if (slideTween) slideTween.kill();
        if (autoTween) autoTween.kill();
        window.removeEventListener('resize', onResize);
        if (prevBtn) prevBtn.removeEventListener('click', onPrev);
        if (nextBtn) nextBtn.removeEventListener('click', onNext);
        titles.forEach((title) => title.removeEventListener('click', onTitleClick));
        controls.forEach((el) => { el.removeEventListener('pointerenter', onEnter); el.removeEventListener('pointerleave', onLeave); });
        root._layeredSlider = null;
      },
    };
    _layeredSliders.push(root._layeredSlider);
  });
}

// ---- REVEAL ON SCROLL (Osmo elements reveal) ----
// [data-reveal-group] (+ nested [data-reveal-group-nested], data-stagger/distance/start/ignore)
let _revealCtx;
function initContentRevealScroll() {
  if (_revealCtx) _revealCtx.revert(); // nettoie l'init précédente (Barba)
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  _revealCtx = gsap.context(() => {
    document.querySelectorAll('[data-reveal-group]').forEach(groupEl => {
      const groupStaggerSec = (parseFloat(groupEl.getAttribute('data-stagger')) || 100) / 1000;
      const groupDistance = groupEl.getAttribute('data-distance') || '2em';
      const triggerStart = groupEl.getAttribute('data-start') || 'top 80%';
      const animDuration = 0.8;
      const animEase = "power4.inOut";

      if (prefersReduced) {
        gsap.set(groupEl, { clearProps: 'all', y: 0, autoAlpha: 1 });
        return;
      }

      const directChildren = Array.from(groupEl.children).filter(el => el.nodeType === 1);
      if (!directChildren.length) {
        gsap.set(groupEl, { y: groupDistance, autoAlpha: 0 });
        ScrollTrigger.create({
          trigger: groupEl, start: triggerStart, once: true,
          onEnter: () => gsap.to(groupEl, { y: 0, autoAlpha: 1, duration: animDuration, ease: animEase, onComplete: () => gsap.set(groupEl, { clearProps: 'all' }) })
        });
        return;
      }

      const slots = [];
      directChildren.forEach(child => {
        const nestedGroup = child.matches('[data-reveal-group-nested]') ? child : child.querySelector(':scope [data-reveal-group-nested]');
        if (nestedGroup) {
          const includeParent = child.getAttribute('data-ignore') !== 'true' &&
            (child.getAttribute('data-ignore') === 'false' || nestedGroup.getAttribute('data-ignore') === 'false');
          const nestedChildren = Array.from(nestedGroup.children).filter(el => el.nodeType === 1 && el.getAttribute('data-ignore') !== 'true');
          slots.push({ type: 'nested', parentEl: child, nestedEl: nestedGroup, includeParent, nestedChildren });
        } else {
          if (child.getAttribute('data-ignore') === 'true') return;
          slots.push({ type: 'item', el: child });
        }
      });

      slots.forEach(slot => {
        if (slot.type === 'item') {
          const isNestedSelf = slot.el.matches('[data-reveal-group-nested]');
          const d = isNestedSelf ? groupDistance : (slot.el.getAttribute('data-distance') || groupDistance);
          gsap.set(slot.el, { y: d, autoAlpha: 0 });
        } else {
          if (slot.includeParent) gsap.set(slot.parentEl, { y: groupDistance, autoAlpha: 0 });
          const nestedD = slot.nestedEl.getAttribute('data-distance') || groupDistance;
          slot.nestedChildren.forEach(target => gsap.set(target, { y: nestedD, autoAlpha: 0 }));
        }
      });
      slots.forEach(slot => { if (slot.type === 'nested' && slot.includeParent) gsap.set(slot.parentEl, { y: groupDistance }); });

      ScrollTrigger.create({
        trigger: groupEl, start: triggerStart, once: true,
        onEnter: () => {
          const tl = gsap.timeline();
          slots.forEach((slot, slotIndex) => {
            const slotTime = slotIndex * groupStaggerSec;
            if (slot.type === 'item') {
              tl.to(slot.el, { y: 0, autoAlpha: 1, duration: animDuration, ease: animEase, onComplete: () => gsap.set(slot.el, { clearProps: 'all' }) }, slotTime);
            } else {
              if (slot.includeParent) {
                tl.to(slot.parentEl, { y: 0, autoAlpha: 1, duration: animDuration, ease: animEase, onComplete: () => gsap.set(slot.parentEl, { clearProps: 'all' }) }, slotTime);
              }
              const nestedMs = parseFloat(slot.nestedEl.getAttribute('data-stagger'));
              const nestedStaggerSec = isNaN(nestedMs) ? groupStaggerSec : nestedMs / 1000;
              slot.nestedChildren.forEach((nestedChild, nestedIndex) => {
                tl.to(nestedChild, { y: 0, autoAlpha: 1, duration: animDuration, ease: animEase, onComplete: () => gsap.set(nestedChild, { clearProps: 'all' }) }, slotTime + nestedIndex * nestedStaggerSec);
              });
            }
          });
        }
      });
    });
  });
  return _revealCtx;
}

// ---- TITRES : split lignes ----
// ⚠️ Lignes masquées (mask:"lines" + yPercent:110) : le texte démarre CACHÉ et
//    n'est révélé que par le ScrollTrigger. Deux garde-fous contre le "texte qui
//    reste invisible" : (1) en reduced-motion on ne masque pas du tout ;
//    (2) le reveal a un fallback qui force l'affichage si le trigger ne joue pas.
function initSplitHeadings() {
  if (reducedMotion) return; // texte laissé visible tel quel, jamais masqué
  const headings = nextPage.querySelectorAll('[data-split="heading"]');
  headings.forEach((heading) => {
    if (heading.hasAttribute("data-split-done")) return;
    heading.setAttribute("data-split-done", "");
    SplitText.create(heading, {
      type: "lines", autoSplit: true, mask: "lines",
      onSplit(instance) {
        return gsap.from(instance.lines, {
          duration: 0.8, yPercent: 110, stagger: 0.1, ease: "expo.out",
          scrollTrigger: {
            trigger: heading,
            start: "top 80%",
            once: true,
            // filet : si pour une raison X le trigger ne joue pas, on force l'état visible
            onRefresh: (self) => { if (self.progress === 1) gsap.set(instance.lines, { yPercent: 0 }); }
          }
        });
      }
    });
  });
}

// ---- HERO HOME : scaling element on scroll (Flip) ----
function initFlipOnScroll() {
  let wrapperElements = document.querySelectorAll("[data-flip-element='wrapper']");
  let targetEl = document.querySelector("[data-flip-element='target']");
  if (!wrapperElements.length || !targetEl) return;

  let tl;
  function flipTimeline() {
    if (tl) { tl.kill(); gsap.set(targetEl, { clearProps: "all" }); }
    tl = gsap.timeline({
      scrollTrigger: {
        trigger: wrapperElements[0], start: "center center",
        endTrigger: wrapperElements[wrapperElements.length - 1], end: "center center", scrub: 0.25
      }
    });
    wrapperElements.forEach(function (element, index) {
      let nextIndex = index + 1;
      if (nextIndex < wrapperElements.length) {
        let nextWrapperEl = wrapperElements[nextIndex];
        let nextRect = nextWrapperEl.getBoundingClientRect();
        let thisRect = element.getBoundingClientRect();
        let nextDistance = nextRect.top + window.pageYOffset + nextWrapperEl.offsetHeight / 2;
        let thisDistance = thisRect.top + window.pageYOffset + element.offsetHeight / 2;
        let offset = nextDistance - thisDistance;
        tl.add(Flip.fit(targetEl, nextWrapperEl, { duration: offset, ease: "none" }));
      }
    });
  }
  flipTimeline();
  let resizeTimer;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { flipTimeline(); }, 100);
  });
}

// ---- HERO PAGE SERVICE : image → background zoom (Flip) ----
function initBackgroundZoom() {
  const containers = document.querySelectorAll("[data-bg-zoom-init]");
  if (!containers.length) return;
  let masterTimeline;

  const getScrollRange = ({ trigger, start, endTrigger, end }) => {
    const st = ScrollTrigger.create({ trigger, start, endTrigger, end });
    const range = Math.max(1, st.end - st.start);
    st.kill();
    return range;
  };

  const bgZoomTimeline = () => {
    if (masterTimeline) masterTimeline.kill();
    masterTimeline = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: containers[0].querySelector("[data-bg-zoom-start]") || containers[0],
        start: "clamp(top bottom)",
        endTrigger: containers[containers.length - 1], end: "bottom top",
        scrub: true, invalidateOnRefresh: true
      }
    });

    containers.forEach((container) => {
      const startEl = container.querySelector("[data-bg-zoom-start]");
      const endEl = container.querySelector("[data-bg-zoom-end]");
      const contentEl = container.querySelector("[data-bg-zoom-content]");
      const darkEl = container.querySelector("[data-bg-zoom-dark]");
      const imgEl = container.querySelector("[data-bg-zoom-img]");
      if (!startEl || !endEl || !contentEl) return;

      const startRadius = getComputedStyle(startEl).borderRadius;
      const endRadius = getComputedStyle(endEl).borderRadius;
      const hasRadius = startRadius !== "0px" || endRadius !== "0px";
      contentEl.style.overflow = hasRadius ? "hidden" : "";
      if (hasRadius) gsap.set(contentEl, { borderRadius: startRadius });

      Flip.fit(contentEl, startEl, { scale: false });

      const zoomScrollRange = getScrollRange({ trigger: startEl, start: "clamp(top bottom)", endTrigger: endEl, end: "center center" });
      const afterScrollRange = getScrollRange({ trigger: endEl, start: "center center", endTrigger: container, end: "bottom top" });

      masterTimeline.add(Flip.fit(contentEl, endEl, { duration: zoomScrollRange, ease: "none", scale: false }));
      if (hasRadius) masterTimeline.to(contentEl, { borderRadius: endRadius, duration: zoomScrollRange }, "<");
      masterTimeline.to(contentEl, { y: `+=${afterScrollRange}`, duration: afterScrollRange });
      if (darkEl) { gsap.set(darkEl, { opacity: 0 }); masterTimeline.to(darkEl, { opacity: 0.75, duration: afterScrollRange * 0.25 }, "<"); }
      if (imgEl) { gsap.set(imgEl, { scale: 1, transformOrigin: "50% 50%" }); masterTimeline.to(imgEl, { scale: 1.25, yPercent: -10, duration: afterScrollRange }, "<"); }
    });
    ScrollTrigger.refresh();
  };

  bgZoomTimeline();
  let resizeTimer;
  window.addEventListener("resize", () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(bgZoomTimeline, 100); });
}

// ---- SERVICES — cartes en rangée : montée/descente PILOTÉE PAR LE SCROLL + bounce ----
// (le layout rangée + chevauchement est dans boreal-styles.css)
function initStackingStickyCardsBounce() {
  const sections = document.querySelectorAll("[data-stacking-cards-init]");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const angles = [-6, -2.5, 2.5, 6]; // angle de repos, un peu différent par carte

  sections.forEach((section) => {
    // Barba / ré-entrée : nettoyer les triggers + tweens de CETTE section
    ScrollTrigger.getAll().forEach((t) => { if (t.trigger && section.contains(t.trigger)) t.kill(); });
    const targets = Array.from(section.querySelectorAll("[data-stacking-card-target]"));
    targets.forEach((el) => { gsap.killTweensOf(el); gsap.set(el, { clearProps: "all" }); });
    if (!targets.length) return;

    // angle statique (les cartes restent inclinées ; le chevauchement est en CSS)
    gsap.set(targets, { rotate: (i) => angles[i % angles.length], transformOrigin: "50% 100%" });

    if (reduce) { gsap.set(targets, { y: 0, autoAlpha: 1 }); return; }

    // MONTÉE / DESCENTE pilotée par le scroll (scrub) + stagger : scroller haut/bas déplace les cartes
    gsap.timeline({ scrollTrigger: { trigger: section, start: "top 90%", end: "top 30%", scrub: true } })
      .fromTo(targets, { y: 150, autoAlpha: 0.1 }, { y: 0, autoAlpha: 1, ease: "none", stagger: 0.2 }, 0);

    // bounce (pulseElement) une fois, quand chaque carte atteint sa position
    targets.forEach((el, i) => {
      ScrollTrigger.create({ trigger: section, start: `top ${45 - i * 7}%`, onEnter: () => pulseElement(el) });
    });
  });

  ScrollTrigger.refresh();

  // Bounce Osmo : stretch rapide + retour élastique
  function pulseElement(targetEl) {
    const width = targetEl.offsetWidth, height = targetEl.offsetHeight;
    const fontSize = parseFloat(getComputedStyle(targetEl).fontSize);
    const stretchPx = 1.5 * fontSize;
    const targetScaleX = (width + stretchPx) / width;
    const targetScaleY = (height - stretchPx * 0.33) / height;
    gsap.timeline()
      .to(targetEl, { scaleX: targetScaleX, scaleY: targetScaleY, duration: 0.1, ease: "power1.out" })
      .to(targetEl, { scaleX: 1, scaleY: 1, duration: 1, ease: "elastic.out(1, 0.3)" });
  }
}

// ---- DEPTH TILES (secteurs) ----
function initDepthTiles() {
  document.querySelectorAll("[data-depth-tiles-init]").forEach((container) => {
    const list = container.querySelector("[data-depth-tiles-list]");
    const tiles = container.querySelectorAll("[data-depth-tiles-item]");
    const tileCount = tiles.length;
    if (tileCount < 2) return;

    const xMultiplier = 0.65, backScale = 0.5, backOpacity = 1, backDarkness = 1, sideRotateY = 5, perspective = 75;
    const moveDuration = 1.5, startDelay = 0.5, pauseDuration = 0.125;
    const state = { progress: 0 };
    let isActive = false, isHovering = false, hasStarted = false, stepTimeline, delayedCall, startDelayedCall, activeTileIndex = -1;

    gsap.set(list, { perspective: `${perspective}em` });
    gsap.set(tiles, { transformStyle: "preserve-3d", transformPerspective: perspective * 16 });

    function getRelativeIndex(index) {
      let relative = index - state.progress;
      relative = ((relative + tileCount / 2) % tileCount + tileCount) % tileCount - tileCount / 2;
      return gsap.utils.clamp(-2, 2, relative);
    }
    function getActiveIndex() { return ((Math.round(state.progress) % tileCount) + tileCount) % tileCount; }
    function updateTileStatus() {
      const currentActiveIndex = getActiveIndex();
      if (currentActiveIndex === activeTileIndex) return;
      activeTileIndex = currentActiveIndex;
      tiles.forEach((tile, index) => tile.setAttribute("data-depth-tiles-item-status", index === activeTileIndex ? "active" : "not-active"));
    }
    function renderDepth() {
      const tileWidth = tiles[0].offsetWidth;
      const radiusX = tileWidth * xMultiplier;
      updateTileStatus();
      tiles.forEach((tile, index) => {
        const relative = getRelativeIndex(index);
        const angle = (relative / 2) * Math.PI;
        const orbitX = Math.sin(angle) * radiusX;
        const orbitDepth = (Math.cos(angle) + 1) / 2;
        const x = relative <= -2 || relative >= 2 ? 0 : orbitX;
        const scale = gsap.utils.interpolate(backScale, 1, orbitDepth);
        const opacity = gsap.utils.interpolate(backOpacity, 1, orbitDepth);
        const brightness = gsap.utils.interpolate(backDarkness, 1, orbitDepth);
        const rotateY = Math.sin(angle) * -sideRotateY;
        const zIndex = Math.round(gsap.utils.interpolate(1, 1000, orbitDepth));
        gsap.set(tile, { x, scale, opacity, rotateY, filter: `brightness(${brightness})`, zIndex });
      });
    }
    function goToNextTile() {
      if (!isActive || isHovering) return;
      stepTimeline = gsap.timeline({ paused: true, onComplete: () => { if (isActive && !isHovering) delayedCall = gsap.delayedCall(pauseDuration, goToNextTile); } });
      stepTimeline.to(state, { progress: state.progress + 1, duration: moveDuration, ease: "depth", onUpdate: renderDepth });
      stepTimeline.play();
    }
    function pauseDepth() { isActive = false; if (stepTimeline) stepTimeline.pause(); if (delayedCall) delayedCall.pause(); if (startDelayedCall) startDelayedCall.pause(); }
    function playDepth() {
      isActive = true;
      if (isHovering) return;
      if (!hasStarted) { hasStarted = true; startDelayedCall = gsap.delayedCall(startDelay, goToNextTile); return; }
      if (stepTimeline && stepTimeline.progress() < 1) stepTimeline.play(); else goToNextTile();
    }
    function handleHoverStart() { isHovering = true; if (delayedCall) delayedCall.pause(); if (startDelayedCall) startDelayedCall.pause(); }
    function handleHoverEnd() {
      isHovering = false;
      if (!isActive) return;
      if (!hasStarted) { playDepth(); return; }
      if (stepTimeline && stepTimeline.progress() < 1) stepTimeline.play(); else goToNextTile();
    }
    list.addEventListener("pointerover", (event) => { if (!event.target.closest("[data-depth-tiles-item]")) return; handleHoverStart(); });
    list.addEventListener("pointerleave", () => handleHoverEnd());
    renderDepth();
    ScrollTrigger.create({ trigger: container, start: "top bottom", end: "bottom top", onToggle: (self) => (self.isActive ? playDepth() : pauseDepth()) });
  });
}

// ---- ODOMETER (chiffres) ----
function initNumberOdometer() {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const initFlag = "data-odometer-initialized";
  const activeTweens = new WeakMap();
  const defaults = { duration: 1, ease: "power3.out", elementStagger: 0.1, digitStagger: 0.04, revealDuration: 0.5, revealEase: "power2.out", triggerStart: "top 80%", staggerOrder: "left", digitCycles: 2 };

  document.querySelectorAll("[data-odometer-group]").forEach((group) => {
    if (group.hasAttribute(initFlag)) return;
    group.setAttribute(initFlag, "");
    const elements = Array.from(group.querySelectorAll("[data-odometer-element]"));
    if (!elements.length || prefersReducedMotion) return;

    const staggerOrder = group.getAttribute("data-odometer-stagger-order") || defaults.staggerOrder;
    const triggerStart = group.getAttribute("data-odometer-trigger-start") || defaults.triggerStart;
    const elementStagger = parseFloat(group.getAttribute("data-odometer-stagger")) || defaults.elementStagger;

    const elementData = elements.map((el) => {
      const originalText = el.textContent.trim();
      const hasExplicitStart = el.hasAttribute("data-odometer-start");
      const startValue = parseFloat(el.getAttribute("data-odometer-start")) || 0;
      const duration = parseFloat(el.getAttribute("data-odometer-duration")) || defaults.duration;
      const step = getLineHeightRatio(el);
      let segments = parseSegments(originalText);
      segments = mapStartDigits(segments, startValue);
      segments = markHiddenSegments(segments, startValue);
      const grow = shouldGrow(el, hasExplicitStart, startValue, segments);
      const { rollers, revealEls } = buildRollerDOM(el, segments, step, grow);
      const fontSize = parseFloat(getComputedStyle(el).fontSize);
      const revealData = revealEls.map((revealEl) => { const widthEm = revealEl.offsetWidth / fontSize; gsap.set(revealEl, { width: 0, overflow: "hidden" }); return { el: revealEl, widthEm }; });
      return { el, rollers, duration, step, revealData, originalText };
    });

    const ordered = applyStaggerOrder(elementData, staggerOrder);
    const tl = gsap.timeline({
      scrollTrigger: { trigger: group, start: triggerStart, once: true },
      onComplete() { elementData.forEach(({ el, originalText }) => cleanupElement(el, originalText)); }
    });
    ordered.forEach((data, orderIdx) => {
      const { rollers, duration, step, revealData } = data;
      const offset = orderIdx * elementStagger;
      revealData.forEach(({ el, widthEm }) => tl.to(el, { width: widthEm + "em", opacity: 1, duration: defaults.revealDuration, ease: defaults.revealEase }, offset));
      rollers.forEach(({ roller, targetPos }, digitIdx) => {
        const reversedIdx = rollers.length - 1 - digitIdx;
        tl.to(roller, { y: -targetPos * step + "em", duration, ease: defaults.ease, force3D: true }, offset + reversedIdx * defaults.digitStagger);
      });
    });
  });

  function getLineHeightRatio(el) { const cs = getComputedStyle(el); const lh = cs.lineHeight; if (lh === "normal") return 1.2; return parseFloat(lh) / parseFloat(cs.fontSize); }
  function parseSegments(text) { return [...text].map((char) => ({ type: /\d/.test(char) ? "digit" : "static", char })); }
  function mapStartDigits(segments, startValue) {
    const digitSlots = segments.filter((s) => s.type === "digit");
    const padded = String(Math.floor(Math.abs(startValue))).padStart(digitSlots.length, "0").slice(-digitSlots.length);
    let di = 0;
    return segments.map((s) => (s.type === "digit" ? { ...s, startDigit: parseInt(padded[di++], 10) } : s));
  }
  function markHiddenSegments(segments, startValue) {
    const totalDigits = segments.filter((s) => s.type === "digit").length;
    const absStart = Math.floor(Math.abs(startValue));
    const startDigitCount = absStart === 0 ? 1 : String(absStart).length;
    const leadingZeros = Math.max(0, totalDigits - startDigitCount);
    if (leadingZeros === 0) return segments;
    let digitsSeen = 0, firstDigitSeen = false, prevDigitHidden = false;
    return segments.map((seg) => {
      if (seg.type === "digit") { firstDigitSeen = true; const hidden = digitsSeen < leadingZeros; prevDigitHidden = hidden; digitsSeen++; return { ...seg, hidden }; }
      const hidden = firstDigitSeen && prevDigitHidden;
      return { ...seg, hidden };
    });
  }
  function shouldGrow(el, hasExplicitStart, startValue, segments) {
    if (el.hasAttribute("data-odometer-grow")) return el.getAttribute("data-odometer-grow") !== "false";
    if (!hasExplicitStart) return false;
    const absStart = Math.floor(Math.abs(startValue));
    const startDigitCount = absStart === 0 ? 1 : String(absStart).length;
    const endDigitCount = segments.filter((s) => s.type === "digit").length;
    return startDigitCount < endDigitCount;
  }
  function buildRollerDOM(el, segments, step, grow) {
    el.innerHTML = ""; el.style.height = "";
    const rollers = [], revealEls = [];
    const totalCells = 10 * defaults.digitCycles;
    segments.forEach((seg) => {
      if (seg.type === "static") {
        const span = document.createElement("span");
        span.setAttribute("data-odometer-part", "static");
        span.style.height = step + "em"; span.style.lineHeight = step; span.textContent = seg.char;
        el.appendChild(span);
        if (grow && seg.hidden) { gsap.set(span, { opacity: 0 }); revealEls.push(span); }
        return;
      }
      const mask = document.createElement("span");
      mask.setAttribute("data-odometer-part", "mask"); mask.style.height = step + "em"; mask.style.lineHeight = step;
      const roller = document.createElement("span");
      roller.setAttribute("data-odometer-part", "roller"); roller.style.lineHeight = step;
      const digits = [];
      for (let d = 0; d < totalCells; d++) digits.push(d % 10);
      roller.textContent = digits.join("\n");
      mask.appendChild(roller); el.appendChild(mask);
      const startDigit = seg.startDigit || 0;
      const isReveal = grow && seg.hidden;
      gsap.set(roller, { y: isReveal ? step + "em" : -startDigit * step + "em" });
      const endDigit = parseInt(seg.char, 10);
      const targetPos = endDigit > startDigit ? endDigit : 10 + endDigit;
      rollers.push({ roller, targetPos });
      if (isReveal) revealEls.push(mask);
    });
    return { rollers, revealEls };
  }
  function cleanupElement(el, originalText) {
    el.style.overflow = ""; el.style.height = "";
    const digits = [...originalText].filter((c) => /\d/.test(c));
    let di = 0;
    el.querySelectorAll('[data-odometer-part="mask"]').forEach((mask) => {
      const roller = mask.querySelector('[data-odometer-part="roller"]');
      if (roller) roller.remove();
      mask.textContent = digits[di++] || ""; mask.style.opacity = ""; mask.style.overflow = "";
    });
    el.querySelectorAll('[data-odometer-part="static"]').forEach((stat) => { stat.style.opacity = ""; });
  }
  function applyStaggerOrder(items, order) { const arr = [...items]; if (order === "right") return arr.reverse(); if (order === "random") return shuffleArray(arr); return arr; }
  function shuffleArray(arr) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; }
}

// ---- LOGO WALL ----
function initLogoWallCycle() {
  const loopDelay = 1.5, duration = 0.9;
  document.querySelectorAll("[data-logo-wall-cycle-init]").forEach((root) => {
    const list = root.querySelector("[data-logo-wall-list]");
    const items = Array.from(list.querySelectorAll("[data-logo-wall-item]"));
    const shuffleFront = root.getAttribute("data-logo-wall-shuffle") !== "false";
    const originalTargets = items.map((item) => item.querySelector("[data-logo-wall-target]")).filter(Boolean);
    let visibleItems = [], visibleCount = 0, pool = [], pattern = [], patternIndex = 0, tl;

    function isVisible(el) { return window.getComputedStyle(el).display !== "none"; }
    function shuffleArray(arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
    function setup() {
      if (tl) tl.kill();
      visibleItems = items.filter(isVisible);
      visibleCount = visibleItems.length;
      pattern = shuffleArray(Array.from({ length: visibleCount }, (_, i) => i));
      patternIndex = 0;
      items.forEach((item) => item.querySelectorAll("[data-logo-wall-target]").forEach((old) => old.remove()));
      pool = originalTargets.map((n) => n.cloneNode(true));
      let front, rest;
      if (shuffleFront) { const shuffledAll = shuffleArray(pool); front = shuffledAll.slice(0, visibleCount); rest = shuffleArray(shuffledAll.slice(visibleCount)); }
      else { front = pool.slice(0, visibleCount); rest = shuffleArray(pool.slice(visibleCount)); }
      pool = front.concat(rest);
      for (let i = 0; i < visibleCount; i++) {
        const parent = visibleItems[i].querySelector("[data-logo-wall-target-parent]") || visibleItems[i];
        parent.appendChild(pool.shift());
      }
      tl = gsap.timeline({ repeat: -1, repeatDelay: loopDelay });
      tl.call(swapNext); tl.play();
    }
    function swapNext() {
      const nowCount = items.filter(isVisible).length;
      if (nowCount !== visibleCount) { setup(); return; }
      if (!pool.length) return;
      const idx = pattern[patternIndex % visibleCount];
      patternIndex++;
      const container = visibleItems[idx];
      const parent = container.querySelector("[data-logo-wall-target-parent]") || container.querySelector("*:has(> [data-logo-wall-target])") || container;
      const existing = parent.querySelectorAll("[data-logo-wall-target]");
      if (existing.length > 1) return;
      const current = parent.querySelector("[data-logo-wall-target]");
      const incoming = pool.shift();
      gsap.set(incoming, { yPercent: 50, autoAlpha: 0 });
      parent.appendChild(incoming);
      if (current) gsap.to(current, { yPercent: -50, autoAlpha: 0, duration, ease: "expo.inOut", onComplete: () => { current.remove(); pool.push(current); } });
      gsap.to(incoming, { yPercent: 0, autoAlpha: 1, duration, delay: 0.1, ease: "expo.inOut" });
    }
    setup();
    ScrollTrigger.create({ trigger: root, start: "top bottom", end: "bottom top", onEnter: () => tl.play(), onLeave: () => tl.pause(), onEnterBack: () => tl.play(), onLeaveBack: () => tl.pause() });
    document.addEventListener("visibilitychange", () => (document.hidden ? tl.pause() : tl.play()));
  });
}

// ---- RÉALISATIONS — panorama 3D (Swiper, piloté par le scroll) ----
// Cylindre facon Netfolie via Swiper (drag/momentum) + effet custom. Rotation pilotée par le
// scroll de la page (section hauteur normale => NON bloquant). Requiert Swiper (chargé via Webflow).
// Structure Webflow : [data-pano] > [data-pano-ring] (cartes [data-pcard] dedans) + [data-pano-cursor].
function initPanoramaCarousel() {
  // Cleanup (Barba / ré-entrée)
  if (window._panoSwiper) { try { window._panoSwiper.destroy(true, true); } catch (e) {} window._panoSwiper = null; }
  if (window._panoScroll) { window.removeEventListener("scroll", window._panoScroll); window._panoScroll = null; }
  if (window._panoCursorRAF) { cancelAnimationFrame(window._panoCursorRAF); window._panoCursorRAF = null; }

  const stage = document.querySelector("[data-pano]");
  if (!stage) return;
  const ring = stage.querySelector("[data-pano-ring]");
  if (!ring) return;
  if (typeof Swiper === "undefined") { console.warn("[panorama] Swiper non chargé — ajoute le <script> Swiper dans Webflow (footer, avant boreal-app.js)."); return; }

  // Adapter la structure existante au format Swiper (sans rien changer dans le Designer)
  ring.classList.add("swiper");
  let wrapper = ring.querySelector(":scope > .swiper-wrapper");
  if (!wrapper) {
    wrapper = document.createElement("div");
    wrapper.className = "swiper-wrapper";
    Array.from(ring.querySelectorAll("[data-pcard]")).forEach((c) => { c.classList.add("swiper-slide"); wrapper.appendChild(c); });
    ring.appendChild(wrapper);
  }
  // Wrapper de TILT (angle statique => la rotation ne dérive pas latéralement)
  let tilt = ring.parentElement;
  if (!tilt || !tilt.hasAttribute("data-pano-tilt")) {
    tilt = document.createElement("div");
    tilt.setAttribute("data-pano-tilt", "");
    ring.parentNode.insertBefore(tilt, ring);
    tilt.appendChild(ring);
  }

  const ANGLE = 40, R = 560;
  function panorama(sw) {
    const centerX = sw.width / 2;
    sw.slides.forEach((slide) => {
      const size = slide.swiperSlideSize;
      const off = slide.swiperSlideOffset;
      const c = (-sw.translate + centerX - off - size / 2) / size;   // distance au centre (en cartes) — pilote la rotation
      const angle = c * ANGLE;
      const rad = (angle * Math.PI) / 180;
      const x = Math.sin(rad) * R;
      const z = (Math.cos(rad) - 1) * R;
      const baseX = centerX - size / 2 - off;                        // centre la carte (FIXE => pas de dérive latérale)
      slide.style.transform = `translateX(${baseX + x}px) translateZ(${z}px) rotateY(${angle}deg)`;
      const f = Math.cos(rad);
      slide.style.zIndex = String(Math.round(f * 100) + 100);
      slide.style.opacity = (0.12 + 0.88 * Math.max(0, f + 0.1)).toFixed(3);
      slide.style.filter = `brightness(${(0.45 + 0.55 * Math.max(0, f)).toFixed(3)})`;
    });
  }

  const swiper = new Swiper(ring, {
    slidesPerView: "auto", centeredSlides: true, virtualTranslate: true, grabCursor: true,
    watchSlidesProgress: true, resistanceRatio: 0.65, speed: 500,
    freeMode: { enabled: true, momentum: true, momentumRatio: 0.6, sticky: false },
    on: {
      setTranslate(sw) { panorama(sw); },
      setTransition(sw, d) { sw.slides.forEach((s) => { s.style.transitionDuration = d + "ms"; }); },
      init(sw) { panorama(sw); }
    }
  });
  window._panoSwiper = swiper;

  // Rotation pilotée par le scroll de la page (0..1 pendant que la section traverse l'écran)
  const onScroll = () => {
    const r = stage.getBoundingClientRect(), vh = window.innerHeight;
    const p = Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height)));
    swiper.setProgress(p, 0);
  };
  window._panoScroll = onScroll;
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // Curseur « Glisser »
  const cursor = stage.querySelector("[data-pano-cursor]");
  if (cursor) {
    let tx = 0, ty = 0, cx = 0, cy = 0;
    const follow = () => { cx += (tx - cx) * 0.2; cy += (ty - cy) * 0.2; cursor.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`; window._panoCursorRAF = requestAnimationFrame(follow); };
    follow();
    stage.addEventListener("pointerenter", () => cursor.classList.add("is-on"));
    stage.addEventListener("pointerleave", () => cursor.classList.remove("is-on"));
    stage.addEventListener("pointermove", (e) => { const r = stage.getBoundingClientRect(); tx = e.clientX - r.left; ty = e.clientY - r.top; });
    stage.addEventListener("pointerdown", () => cursor.classList.add("is-grab"));
    window.addEventListener("pointerup", () => cursor.classList.remove("is-grab"));
  }
}

// ---- MODALES (Osmo basic modal B) — pop-ups secteurs ----
function initModalBasic() {
  const modalGroup = document.querySelector("[data-modal-group-status]");
  const modals = document.querySelectorAll("[data-modal-name]");
  const modalTargets = document.querySelectorAll("[data-modal-target]");
  if (!modalTargets.length) return;

  modalTargets.forEach((modalTarget) => {
    modalTarget.addEventListener("click", function (e) {
      e.preventDefault(); // évite le saut en haut si le déclencheur est un <a>
      const name = this.getAttribute("data-modal-target");
      modalTargets.forEach((t) => t.setAttribute("data-modal-status", "not-active"));
      modals.forEach((m) => m.setAttribute("data-modal-status", "not-active"));
      const t = document.querySelector(`[data-modal-target="${name}"]`);
      const m = document.querySelector(`[data-modal-name="${name}"]`);
      if (t) t.setAttribute("data-modal-status", "active");
      if (m) m.setAttribute("data-modal-status", "active");
      if (modalGroup) modalGroup.setAttribute("data-modal-group-status", "active");
      if (window.lenis) window.lenis.stop(); // fige le scroll derrière la modale
    });
  });

  document.querySelectorAll("[data-modal-close]").forEach((btn) => btn.addEventListener("click", closeModals));
}

// ---- PANNEAU FORMULAIRE latéral (Osmo fixed underlay) — soumission ----
function initFixedUnderlayNavigation() {
  const toggleBtn = document.querySelector("[data-underlay-nav-toggle]");
  const toggleLabels = document.querySelectorAll(".underlay-nav__toggle-label");
  const toggleBars = document.querySelectorAll(".underlay-nav__toggle-bar");
  const menuEl = document.querySelector("[data-underlay-nav-menu]");
  const largeItems = document.querySelectorAll("[data-reveal-l]");
  const smallItems = document.querySelectorAll("[data-reveal-s]");
  const menuBorder = document.querySelector(".underlay-nav__bottom-border");
  const mainEl = document.querySelector("[data-main]");
  const overlayEl = document.querySelector("[data-underlay-nav-overlay]");
  const darkEl = document.querySelector(".underlay-nav__dark");
  const corners = document.querySelectorAll(".underlay-nav__corner");
  const overlayBorders = document.querySelectorAll(".underlay-nav__border-row");

  if (!toggleBtn || !menuEl || !mainEl || !overlayEl) return;

  // Le formulaire dépasse souvent la hauteur d'écran : autoriser le scroll natif
  // du panneau malgré Lenis (sinon la molette pilote la page derrière au lieu du formulaire).
  document.querySelectorAll(".underlay-nav__inner").forEach((el) => el.setAttribute("data-lenis-prevent", ""));

  // La nav (fixed) vit DANS [data-main] pour coulisser à gauche avec la page à l'ouverture.
  // Revers : le transform d'ouverture réancre son position:fixed sur [data-main] → après un
  // scroll de S px elle part S px trop haut (elle « disparaît »). On la compense de translateY(S)
  // à l'ouverture (et on gèle le scroll de fond pour que S reste constant), nettoyé à la fermeture.
  const navFixed = document.querySelector("[data-navigation-status]");
  const getScrollY = () => (window.lenis ? window.lenis.scroll : window.scrollY) || 0;
  const clearTargets = navFixed ? [mainEl, overlayEl, navFixed] : [mainEl, overlayEl];

  const closedColor = getComputedStyle(toggleBtn).color;
  const openColor = getComputedStyle(menuEl).color;

  let isOpen = false;
  let tl;
  let enterEndTime = 0;

  const getMenuOffset = () => -menuEl.offsetWidth;

  gsap.set(overlayEl, { visibility: "hidden", pointerEvents: "none" });
  gsap.set(darkEl, { autoAlpha: 0 });
  // ⚠️ PAS de transform au repos sur [data-main] : un transform casserait le
  // position:fixed des éléments à l'intérieur (ex. la vraie nav). Le transform
  // n'est appliqué que pendant l'ouverture, puis nettoyé à la fermeture.
  gsap.set(toggleLabels, { yPercent: 0 });
  gsap.set(toggleBars, { y: 0, rotation: 0 });
  gsap.set(menuBorder, { scaleX: 0 });
  gsap.set(overlayBorders[0], { yPercent: -100 });
  gsap.set(overlayBorders[1], { yPercent: 100 });
  gsap.set(corners, { scale: 0 });

  function buildTimeline() {
    tl = gsap.timeline({
      paused: true,
      defaults: { ease: "energy", easeReverse: "power2.inOut" },
      // Au repos (fermé), on retire le transform de [data-main] pour que la vraie
      // nav (fixed, à l'intérieur) reste fixe. onComplete = fermé depuis l'état ouvert ;
      // onReverseComplete = fermé en cours d'ouverture.
      onComplete: () => gsap.set(clearTargets, { clearProps: "transform" }),
      onReverseComplete: () => gsap.set(clearTargets, { clearProps: "transform" })
    });

    tl.set(overlayEl, { visibility: "visible", pointerEvents: "auto" }, 0);
    tl.to([mainEl, overlayEl], { x: getMenuOffset, duration: 0.7 }, 0)
      .to(darkEl, { autoAlpha: 1, duration: 0.5 }, 0)
      .to(corners, { scale: 1, duration: 0.5 }, 0)
      .to(overlayBorders, { yPercent: 0, duration: 0.5 }, 0)
      .to(toggleLabels, { yPercent: -100, duration: 0.4 }, 0)
      .to(toggleBtn, { color: openColor, duration: 0.4 }, 0)
      .to(toggleBars[0], { y: "0.25em", rotation: 45, duration: 0.35, ease: "back.out(1.4)", easeReverse: "power3.out" }, 0.05)
      .to(toggleBars[1], { y: "-0.25em", rotation: -45, duration: 0.35, ease: "back.out(1.4)", easeReverse: "power3.out" }, 0.05)
      .fromTo(largeItems, { autoAlpha: 0, xPercent: 25 }, { autoAlpha: 1, xPercent: 0, duration: 0.7, stagger: 0.05 }, 0)
      .fromTo(smallItems, { autoAlpha: 0, yPercent: 100 }, { autoAlpha: 1, yPercent: 0, duration: 0.5, stagger: 0.03, ease: "power3.out" }, 0.3)
      .to(menuBorder, { scaleX: 1, duration: 0.5 }, "<");

    enterEndTime = tl.duration();
    tl.addPause();

    tl.to([largeItems, smallItems], { autoAlpha: 0, duration: 0.3 }, "<")
      .to([mainEl, overlayEl], { x: 0, duration: 0.6 }, "<")
      .to(darkEl, { autoAlpha: 0, duration: 0.35, ease: "power2.inOut" }, "<")
      .to(corners, { scale: 0, duration: 0.5 }, "<")
      .to(overlayBorders[0], { yPercent: -100, duration: 0.5 }, "<")
      .to(overlayBorders[1], { yPercent: 100, duration: 0.5 }, "<")
      .to(toggleBtn, { color: closedColor, duration: 0.25 }, "<+=0.1")
      .to(toggleLabels, { yPercent: 0, duration: 0.25, ease: "power3.in" }, "<")
      .to(toggleBars, { y: 0, rotation: 0, duration: 0.25, ease: "power3.in" }, "<")
      .set(overlayEl, { visibility: "hidden", pointerEvents: "none" });
  }

  function toggle() {
    isOpen = !isOpen;
    toggleBtn.setAttribute("aria-expanded", String(isOpen));
    toggleBtn.setAttribute("aria-label", isOpen ? "close menu" : "open menu");
    document.body.setAttribute("data-menu-status", isOpen ? "open" : "");
    if (isOpen) {
      if (navFixed) gsap.set(navFixed, { y: getScrollY() }); // garde la nav à l'écran malgré le transform
      if (window.lenis) window.lenis.stop();                 // gèle le fond (S constant + meilleure UX)
      tl.invalidate();
      if (tl.time() >= enterEndTime) tl.timeScale(1).restart();
      else tl.timeScale(1).play();
    } else {
      if (window.lenis) window.lenis.start();                // la compensation nav est nettoyée par clearTargets
      if (tl.time() < enterEndTime) tl.timeScale(1).reverse();
      else tl.timeScale(1).play();
    }
  }

  buildTimeline();

  // Ouvre le panneau depuis N'IMPORTE quel élément [data-underlay-nav-toggle]
  // (bouton hamburger, CTA « Demander une soumission », nav « Estimation rapide »…)
  document.querySelectorAll("[data-underlay-nav-toggle]").forEach((btn) => btn.addEventListener("click", toggle));
  overlayEl.addEventListener("click", () => { if (isOpen) toggle(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && isOpen) { toggle(); toggleBtn.focus(); } });

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (isOpen) { gsap.set([mainEl, overlayEl], { x: getMenuOffset() }); }
      else { tl.invalidate(); }
    }, 150);
  });
}

// ---- VALIDATION formulaire live (Osmo Advanced) — soumission ----
// États posés : .is--filled / .is--success / .is--error (voir styles.css).
// Requiert [data-form-validate] sur le parent, [data-validate] sur chaque groupe,
// [data-submit] autour du <input type="submit">. Anti-spam : rejet si < 5 s.
function initAdvancedFormValidation() {
  const forms = document.querySelectorAll('[data-form-validate]');

  forms.forEach((formContainer) => {
    const startTime = new Date().getTime();

    const form = formContainer.querySelector('form');
    if (!form) return;

    const validateFields = form.querySelectorAll('[data-validate]');
    const dataSubmit = form.querySelector('[data-submit]');
    if (!dataSubmit) return;

    const realSubmitInput = dataSubmit.querySelector('input[type="submit"]');
    if (!realSubmitInput) return;

    function isSpam() {
      const currentTime = new Date().getTime();
      return currentTime - startTime < 5000;
    }

    // Désactive les options de select invalides au chargement
    validateFields.forEach(function (fieldGroup) {
      const select = fieldGroup.querySelector('select');
      if (select) {
        const options = select.querySelectorAll('option');
        options.forEach(function (option) {
          if (
            option.value === '' ||
            option.value === 'disabled' ||
            option.value === 'null' ||
            option.value === 'false'
          ) {
            option.setAttribute('disabled', 'disabled');
          }
        });
      }
    });

    function validateAndStartLiveValidationForAll() {
      let allValid = true;
      let firstInvalidField = null;

      validateFields.forEach(function (fieldGroup) {
        const input = fieldGroup.querySelector('input, textarea, select');
        const radioCheckGroup = fieldGroup.querySelector('[data-radiocheck-group]');
        if (!input && !radioCheckGroup) return;

        if (input) input.__validationStarted = true;
        if (radioCheckGroup) {
          radioCheckGroup.__validationStarted = true;
          const inputs = radioCheckGroup.querySelectorAll('input[type="radio"], input[type="checkbox"]');
          inputs.forEach(function (input) {
            input.__validationStarted = true;
          });
        }

        updateFieldStatus(fieldGroup);

        if (!isValid(fieldGroup)) {
          allValid = false;
          if (!firstInvalidField) {
            firstInvalidField = input || radioCheckGroup.querySelector('input');
          }
        }
      });

      if (!allValid && firstInvalidField) {
        firstInvalidField.focus();
      }

      return allValid;
    }

    function isValid(fieldGroup) {
      const radioCheckGroup = fieldGroup.querySelector('[data-radiocheck-group]');
      if (radioCheckGroup) {
        const inputs = radioCheckGroup.querySelectorAll('input[type="radio"], input[type="checkbox"]');
        const checkedInputs = radioCheckGroup.querySelectorAll('input:checked');
        const min = parseInt(radioCheckGroup.getAttribute('min')) || 1;
        const max = parseInt(radioCheckGroup.getAttribute('max')) || inputs.length;
        const checkedCount = checkedInputs.length;

        if (inputs[0].type === 'radio') {
          return checkedCount >= 1;
        } else {
          if (inputs.length === 1) {
            return inputs[0].checked;
          } else {
            return checkedCount >= min && checkedCount <= max;
          }
        }
      } else {
        const input = fieldGroup.querySelector('input, textarea, select');
        if (!input) return false;

        let valid = true;
        const min = parseInt(input.getAttribute('min')) || 0;
        const max = parseInt(input.getAttribute('max')) || Infinity;
        const value = input.value.trim();
        const length = value.length;

        if (input.tagName.toLowerCase() === 'select') {
          if (
            value === '' ||
            value === 'disabled' ||
            value === 'null' ||
            value === 'false'
          ) {
            valid = false;
          }
        } else if (input.type === 'email') {
          const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          valid = emailPattern.test(value);
        } else {
          if (input.hasAttribute('min') && length < min) valid = false;
          if (input.hasAttribute('max') && length > max) valid = false;
        }

        return valid;
      }
    }

    function updateFieldStatus(fieldGroup) {
      const radioCheckGroup = fieldGroup.querySelector('[data-radiocheck-group]');
      if (radioCheckGroup) {
        const inputs = radioCheckGroup.querySelectorAll('input[type="radio"], input[type="checkbox"]');
        const checkedInputs = radioCheckGroup.querySelectorAll('input:checked');

        if (checkedInputs.length > 0) {
          fieldGroup.classList.add('is--filled');
        } else {
          fieldGroup.classList.remove('is--filled');
        }

        const valid = isValid(fieldGroup);

        if (valid) {
          fieldGroup.classList.add('is--success');
          fieldGroup.classList.remove('is--error');
        } else {
          fieldGroup.classList.remove('is--success');
          const anyInputValidationStarted = Array.from(inputs).some(input => input.__validationStarted);
          if (anyInputValidationStarted) {
            fieldGroup.classList.add('is--error');
          } else {
            fieldGroup.classList.remove('is--error');
          }
        }
      } else {
        const input = fieldGroup.querySelector('input, textarea, select');
        if (!input) return;

        const value = input.value.trim();

        if (value) {
          fieldGroup.classList.add('is--filled');
        } else {
          fieldGroup.classList.remove('is--filled');
        }

        const valid = isValid(fieldGroup);

        if (valid) {
          fieldGroup.classList.add('is--success');
          fieldGroup.classList.remove('is--error');
        } else {
          fieldGroup.classList.remove('is--success');
          if (input.__validationStarted) {
            fieldGroup.classList.add('is--error');
          } else {
            fieldGroup.classList.remove('is--error');
          }
        }
      }
    }

    validateFields.forEach(function (fieldGroup) {
      const input = fieldGroup.querySelector('input, textarea, select');
      const radioCheckGroup = fieldGroup.querySelector('[data-radiocheck-group]');

      if (radioCheckGroup) {
        const inputs = radioCheckGroup.querySelectorAll('input[type="radio"], input[type="checkbox"]');
        inputs.forEach(function (input) {
          input.__validationStarted = false;

          input.addEventListener('change', function () {
            requestAnimationFrame(function () {
              if (!input.__validationStarted) {
                const checkedCount = radioCheckGroup.querySelectorAll('input:checked').length;
                const min = parseInt(radioCheckGroup.getAttribute('min')) || 1;

                if (checkedCount >= min) {
                  input.__validationStarted = true;
                }
              }

              if (input.__validationStarted) {
                updateFieldStatus(fieldGroup);
              }
            });
          });

          input.addEventListener('blur', function () {
            input.__validationStarted = true;
            updateFieldStatus(fieldGroup);
          });
        });
      } else if (input) {
        input.__validationStarted = false;

        if (input.tagName.toLowerCase() === 'select') {
          input.addEventListener('change', function () {
            input.__validationStarted = true;
            updateFieldStatus(fieldGroup);
          });
        } else {
          input.addEventListener('input', function () {
            const value = input.value.trim();
            const length = value.length;
            const min = parseInt(input.getAttribute('min')) || 0;
            const max = parseInt(input.getAttribute('max')) || Infinity;

            if (!input.__validationStarted) {
              if (input.type === 'email') {
                if (isValid(fieldGroup)) input.__validationStarted = true;
              } else {
                if (
                  (input.hasAttribute('min') && length >= min) ||
                  (input.hasAttribute('max') && length <= max)
                ) {
                  input.__validationStarted = true;
                }
              }
            }

            if (input.__validationStarted) {
              updateFieldStatus(fieldGroup);
            }
          });

          input.addEventListener('blur', function () {
            input.__validationStarted = true;
            updateFieldStatus(fieldGroup);
          });
        }
      }
    });

    dataSubmit.addEventListener('click', function () {
      if (validateAndStartLiveValidationForAll()) {
        if (isSpam()) {
          alert('Formulaire envoyé trop vite. Merci de réessayer dans un instant.');
          return;
        }
        realSubmitInput.click();
      }
    });

    form.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' && event.target.tagName !== 'TEXTAREA') {
        event.preventDefault();
        if (validateAndStartLiveValidationForAll()) {
          if (isSpam()) {
            alert('Formulaire envoyé trop vite. Merci de réessayer dans un instant.');
            return;
          }
          realSubmitInput.click();
        }
      }
    });
  });
}

// ---- MINI SHOWREEL PLAYER (Osmo, + lecture vidéo) — page Réalisation (T07) ----
// Association par NOM : [data-mini-showreel-open="X"] ouvre [data-mini-showreel-lightbox="X"]
// et anime (Flip) [data-mini-showreel-player="X"] dans [data-mini-showreel-target].
// La vidéo jouée = le <video> (ou lecteur Bunny) À L'INTÉRIEUR de [data-mini-showreel-player="X"].
// Persistant + délégation attachée 1× → Barba-safe (les noms sont re-résolus à chaque ouverture).
// Flip déjà registré dans le head.
let _showreelInited = false;
function initMiniShowreelPlayer() {
  if (_showreelInited) return;
  _showreelInited = true;

  const duration = 1;
  const ease = "expo.inOut";
  const zIndex = 999;

  let n = "", isOpen = false;
  let lb, pw, tg;
  let pwCss = "", lbZ = "", pwZ = "";

  const q = (sel, root = document) => root.querySelector(sel);
  const getLB = (name) => q(`[data-mini-showreel-lightbox="${name}"]`);
  const getPW = (name) => q(`[data-mini-showreel-player="${name}"]`);
  const safe = (t) => t.closest("[data-mini-showreel-safearea]") || q("[data-mini-showreel-safearea]", t) || t;

  const fit = (b, a) => {
    let w = b.width, h = w / a;
    if (h > b.height) { h = b.height; w = h * a; }
    return { left: b.left + (b.width - w) / 2, top: b.top + (b.height - h) / 2, width: w, height: h };
  };
  const rectFor = (t) => {
    const b = safe(t).getBoundingClientRect();
    const r = t.getBoundingClientRect();
    const a = r.width > 0 && r.height > 0 ? r.width / r.height : 16 / 9;
    return fit(b, a);
  };
  const place = (el, r) => gsap.set(el, { position: "fixed", left: r.left, top: r.top, width: r.width, height: r.height, margin: 0, x: 0, y: 0 });

  function setStatus(status) {
    if (!n) return;
    document.querySelectorAll(`[data-mini-showreel-lightbox="${n}"], [data-mini-showreel-player="${n}"]`).forEach((el) => el.setAttribute("data-mini-showreel-status", status));
  }
  function zOn() { lbZ = lb?.style.zIndex || ""; pwZ = pw?.style.zIndex || ""; if (lb) lb.style.zIndex = String(zIndex); if (pw) pw.style.zIndex = String(zIndex); }
  function zOff() { if (lb) lb.style.zIndex = lbZ; if (pw) pw.style.zIndex = pwZ; }

  // Lecture / arrêt : lecteur Bunny si présent, sinon <video> natif.
  function playFor(name) {
    const wrap = getPW(name); if (!wrap) return;
    const bunny = wrap.querySelector("[data-bunny-player-init]");
    const video = wrap.querySelector("video"); if (!video) return;
    if (bunny) { const btn = bunny.querySelector('[data-player-control="play"], [data-player-control="playpause"]'); if (btn && (video.paused || video.ended)) btn.click(); return; }
    try { video.play(); } catch (_) {}
  }
  function stopFor(name) {
    const wrap = getPW(name); if (!wrap) return;
    const bunny = wrap.querySelector("[data-bunny-player-init]");
    const video = wrap.querySelector("video"); if (!video) return;
    if (bunny) { const btn = bunny.querySelector('[data-player-control="pause"], [data-player-control="playpause"]'); if (btn && (!video.paused && !video.ended)) btn.click(); }
    else { try { video.pause(); } catch (_) {} }
    try { video.currentTime = 0; } catch (_) {}
  }

  function openBy(name) {
    if (!name || isOpen) return;
    lb = getLB(name); pw = getPW(name);
    if (!lb || !pw) return;
    tg = q("[data-mini-showreel-target]", lb);
    if (!tg) return;
    n = name; isOpen = true;
    pw.dataset.flipId = n; pwCss = pw.style.cssText || "";
    zOn(); setStatus("active"); playFor(n);
    const state = Flip.getState(pw);
    place(pw, rectFor(tg));
    Flip.from(state, { duration, ease, absolute: true, scale: false });
  }

  function closeBy(nameOrEmpty) {
    if (!isOpen || !pw) return;
    if (nameOrEmpty && nameOrEmpty !== n) return;
    stopFor(n); setStatus("not-active");
    const state = Flip.getState(pw);
    pw.style.cssText = pwCss;
    if (lb) lb.style.zIndex = String(zIndex);
    if (pw) pw.style.zIndex = String(zIndex);
    Flip.from(state, {
      duration, ease, absolute: true, scale: false,
      onComplete: () => { zOff(); n = ""; isOpen = false; lb = pw = tg = null; pwCss = ""; lbZ = ""; pwZ = ""; }
    });
  }

  function onResize() { if (!isOpen || !pw || !tg) return; place(pw, rectFor(tg)); }

  // Délégation : couvre les boutons de n'importe quelle page (T07), sans re-binding par nav.
  document.addEventListener("click", (e) => {
    const openBtn = e.target.closest("[data-mini-showreel-open]");
    if (openBtn) { e.preventDefault(); openBy(openBtn.getAttribute("data-mini-showreel-open") || ""); return; }
    const closeBtn = e.target.closest("[data-mini-showreel-close]");
    if (closeBtn) { e.preventDefault(); closeBy(closeBtn.getAttribute("data-mini-showreel-close") || ""); }
  });
  window.addEventListener("keydown", (e) => { if (e.key === "Escape") closeBy(""); });
  window.addEventListener("resize", onResize);
}

// ---- ACCORDÉON CSS (Osmo) — FAQ ----
function initAccordionCSS() {
  document.querySelectorAll("[data-accordion-css-init]").forEach((accordion) => {
    const closeSiblings = accordion.getAttribute("data-accordion-close-siblings") === "true";
    accordion.addEventListener("click", (event) => {
      const toggle = event.target.closest("[data-accordion-toggle]");
      if (!toggle) return;
      const singleAccordion = toggle.closest("[data-accordion-status]");
      if (!singleAccordion) return;
      const isActive = singleAccordion.getAttribute("data-accordion-status") === "active";
      singleAccordion.setAttribute("data-accordion-status", isActive ? "not-active" : "active");
      if (closeSiblings && !isActive) {
        accordion.querySelectorAll('[data-accordion-status="active"]').forEach((sibling) => {
          if (sibling !== singleAccordion) sibling.setAttribute("data-accordion-status", "not-active");
        });
      }
    });
  });
}

// ---- SLIDER CENTRÉ draggable (Osmo) — témoignages ----
function initSliders() {
  const sliderWrappers = gsap.utils.toArray(document.querySelectorAll('[data-centered-slider="wrapper"]'));

  sliderWrappers.forEach((sliderWrapper) => {
    const slides = gsap.utils.toArray(sliderWrapper.querySelectorAll('[data-centered-slider="slide"]'));
    const bullets = gsap.utils.toArray(sliderWrapper.querySelectorAll('[data-centered-slider="bullet"]'));
    const prevButton = sliderWrapper.querySelector('[data-centered-slider="prev-button"]');
    const nextButton = sliderWrapper.querySelector('[data-centered-slider="next-button"]');

    let activeElement;
    let activeBullet;
    let currentIndex = 0;
    let autoplay;

    const autoplayEnabled = sliderWrapper.getAttribute('data-slider-autoplay') === 'true';
    const autoplayDuration = autoplayEnabled ? parseFloat(sliderWrapper.getAttribute('data-slider-autoplay-duration')) || 0 : 0;

    slides.forEach((slide, i) => { slide.setAttribute("id", `slide-${i}`); });

    if (bullets && bullets.length > 0) {
      bullets.forEach((bullet, i) => {
        bullet.setAttribute("aria-controls", `slide-${i}`);
        bullet.setAttribute("aria-selected", i === currentIndex ? "true" : "false");
      });
    }

    const loop = horizontalLoop(slides, {
      paused: true,
      draggable: true,
      center: true,
      onChange: (element, index) => {
        currentIndex = index;
        if (activeElement) activeElement.classList.remove("active");
        element.classList.add("active");
        activeElement = element;
        if (bullets && bullets.length > 0) {
          if (activeBullet) activeBullet.classList.remove("active");
          if (bullets[index]) { bullets[index].classList.add("active"); activeBullet = bullets[index]; }
          bullets.forEach((bullet, i) => { bullet.setAttribute("aria-selected", i === index ? "true" : "false"); });
        }
      }
    });

    loop.toIndex(2, { duration: 0.01 });

    function startAutoplay() {
      if (autoplayDuration > 0 && !autoplay) {
        const repeat = () => {
          loop.next({ ease: "osmo-ease", duration: 0.725 });
          autoplay = gsap.delayedCall(autoplayDuration, repeat);
        };
        autoplay = gsap.delayedCall(autoplayDuration, repeat);
      }
    }
    function stopAutoplay() { if (autoplay) { autoplay.kill(); autoplay = null; } }

    ScrollTrigger.create({
      trigger: sliderWrapper,
      start: "top bottom",
      end: "bottom top",
      onEnter: startAutoplay,
      onLeave: stopAutoplay,
      onEnterBack: startAutoplay,
      onLeaveBack: stopAutoplay
    });

    sliderWrapper.addEventListener("mouseenter", stopAutoplay);
    sliderWrapper.addEventListener("mouseleave", () => { if (ScrollTrigger.isInViewport(sliderWrapper)) startAutoplay(); });

    slides.forEach((slide, i) => {
      slide.addEventListener("click", () => { loop.toIndex(i, { ease: "osmo-ease", duration: 0.725 }); });
    });

    if (bullets && bullets.length > 0) {
      bullets.forEach((bullet, i) => {
        bullet.addEventListener("click", () => {
          loop.toIndex(i, { ease: "osmo-ease", duration: 0.725 });
          if (activeBullet) activeBullet.classList.remove("active");
          bullet.classList.add("active");
          activeBullet = bullet;
          bullets.forEach((b, j) => { b.setAttribute("aria-selected", j === i ? "true" : "false"); });
        });
      });
    }

    if (prevButton) {
      prevButton.addEventListener("click", () => {
        let newIndex = currentIndex - 1;
        if (newIndex < 0) newIndex = slides.length - 1;
        loop.toIndex(newIndex, { ease: "osmo-ease", duration: 0.725 });
      });
    }
    if (nextButton) {
      nextButton.addEventListener("click", () => {
        let newIndex = currentIndex + 1;
        if (newIndex >= slides.length) newIndex = 0;
        loop.toIndex(newIndex, { ease: "osmo-ease", duration: 0.725 });
      });
    }
  });
}

// GSAP helper — seamless horizontal loop (https://gsap.com/docs/v3/HelperFunctions/helpers/seamlessLoop)
function horizontalLoop(items, config) {
  let timeline;
  items = gsap.utils.toArray(items);
  config = config || {};
  gsap.context(() => {
    let onChange = config.onChange,
      lastIndex = 0,
      tl = gsap.timeline({repeat: config.repeat, onUpdate: onChange && function() {
          let i = tl.closestIndex();
          if (lastIndex !== i) { lastIndex = i; onChange(items[i], i); }
        }, paused: config.paused, defaults: {ease: "none"}, onReverseComplete: () => tl.totalTime(tl.rawTime() + tl.duration() * 100)}),
      length = items.length,
      startX = items[0].offsetLeft,
      times = [],
      widths = [],
      spaceBefore = [],
      xPercents = [],
      curIndex = 0,
      indexIsDirty = false,
      center = config.center,
      pixelsPerSecond = (config.speed || 1) * 100,
      snap = config.snap === false ? v => v : gsap.utils.snap(config.snap || 1),
      timeOffset = 0,
      container = center === true ? items[0].parentNode : gsap.utils.toArray(center)[0] || items[0].parentNode,
      totalWidth,
      getTotalWidth = () => items[length-1].offsetLeft + xPercents[length-1] / 100 * widths[length-1] - startX + spaceBefore[0] + items[length-1].offsetWidth * gsap.getProperty(items[length-1], "scaleX") + (parseFloat(config.paddingRight) || 0),
      populateWidths = () => {
        let b1 = container.getBoundingClientRect(), b2;
        items.forEach((el, i) => {
          widths[i] = parseFloat(gsap.getProperty(el, "width", "px"));
          xPercents[i] = snap(parseFloat(gsap.getProperty(el, "x", "px")) / widths[i] * 100 + gsap.getProperty(el, "xPercent"));
          b2 = el.getBoundingClientRect();
          spaceBefore[i] = b2.left - (i ? b1.right : b1.left);
          b1 = b2;
        });
        gsap.set(items, { xPercent: i => xPercents[i] });
        totalWidth = getTotalWidth();
      },
      timeWrap,
      populateOffsets = () => {
        timeOffset = center ? tl.duration() * (container.offsetWidth / 2) / totalWidth : 0;
        center && times.forEach((t, i) => {
          times[i] = timeWrap(tl.labels["label" + i] + tl.duration() * widths[i] / 2 / totalWidth - timeOffset);
        });
      },
      getClosest = (values, value, wrap) => {
        let i = values.length, closest = 1e10, index = 0, d;
        while (i--) {
          d = Math.abs(values[i] - value);
          if (d > wrap / 2) { d = wrap - d; }
          if (d < closest) { closest = d; index = i; }
        }
        return index;
      },
      populateTimeline = () => {
        let i, item, curX, distanceToStart, distanceToLoop;
        tl.clear();
        for (i = 0; i < length; i++) {
          item = items[i];
          curX = xPercents[i] / 100 * widths[i];
          distanceToStart = item.offsetLeft + curX - startX + spaceBefore[0];
          distanceToLoop = distanceToStart + widths[i] * gsap.getProperty(item, "scaleX");
          tl.to(item, {xPercent: snap((curX - distanceToLoop) / widths[i] * 100), duration: distanceToLoop / pixelsPerSecond}, 0)
            .fromTo(item, {xPercent: snap((curX - distanceToLoop + totalWidth) / widths[i] * 100)}, {xPercent: xPercents[i], duration: (curX - distanceToLoop + totalWidth - curX) / pixelsPerSecond, immediateRender: false}, distanceToLoop / pixelsPerSecond)
            .add("label" + i, distanceToStart / pixelsPerSecond);
          times[i] = distanceToStart / pixelsPerSecond;
        }
        timeWrap = gsap.utils.wrap(0, tl.duration());
      },
      refresh = (deep) => {
        let progress = tl.progress();
        tl.progress(0, true);
        populateWidths();
        deep && populateTimeline();
        populateOffsets();
        deep && tl.draggable ? tl.time(times[curIndex], true) : tl.progress(progress, true);
      },
      onResize = () => refresh(true),
      proxy;
    gsap.set(items, {x: 0});
    populateWidths();
    populateTimeline();
    populateOffsets();
    window.addEventListener("resize", onResize);
    function toIndex(index, vars) {
      vars = vars || {};
      (Math.abs(index - curIndex) > length / 2) && (index += index > curIndex ? -length : length);
      let newIndex = gsap.utils.wrap(0, length, index), time = times[newIndex];
      if (time > tl.time() !== index > curIndex && index !== curIndex) { time += tl.duration() * (index > curIndex ? 1 : -1); }
      if (time < 0 || time > tl.duration()) { vars.modifiers = {time: timeWrap}; }
      curIndex = newIndex;
      vars.overwrite = true;
      gsap.killTweensOf(proxy);
      return vars.duration === 0 ? tl.time(timeWrap(time)) : tl.tweenTo(time, vars);
    }
    tl.toIndex = (index, vars) => toIndex(index, vars);
    tl.closestIndex = setCurrent => {
      let index = getClosest(times, tl.time(), tl.duration());
      if (setCurrent) { curIndex = index; indexIsDirty = false; }
      return index;
    };
    tl.current = () => indexIsDirty ? tl.closestIndex(true) : curIndex;
    tl.next = vars => toIndex(tl.current()+1, vars);
    tl.previous = vars => toIndex(tl.current()-1, vars);
    tl.times = times;
    tl.progress(1, true).progress(0, true);
    if (config.reversed) { tl.vars.onReverseComplete(); tl.reverse(); }
    if (config.draggable && typeof(Draggable) === "function") {
      proxy = document.createElement("div");
      let wrap = gsap.utils.wrap(0, 1),
        ratio, startProgress, draggable, dragSnap, lastSnap, initChangeX, wasPlaying,
        align = () => tl.progress(wrap(startProgress + (draggable.startX - draggable.x) * ratio)),
        syncIndex = () => tl.closestIndex(true);
      typeof(InertiaPlugin) === "undefined" && console.warn("InertiaPlugin required for momentum-based scrolling and snapping. https://greensock.com/club");
      draggable = Draggable.create(proxy, {
        trigger: items[0].parentNode,
        type: "x",
        onPressInit() {
          let x = this.x;
          gsap.killTweensOf(tl);
          wasPlaying = !tl.paused();
          tl.pause();
          startProgress = tl.progress();
          refresh();
          ratio = 1 / totalWidth;
          initChangeX = (startProgress / -ratio) - x;
          gsap.set(proxy, {x: startProgress / -ratio});
        },
        onDrag: align,
        onThrowUpdate: align,
        overshootTolerance: 0,
        inertia: true,
        snap(value) {
          if (Math.abs(startProgress / -ratio - this.x) < 10) { return lastSnap + initChangeX; }
          let time = -(value * ratio) * tl.duration(),
            wrappedTime = timeWrap(time),
            snapTime = times[getClosest(times, wrappedTime, tl.duration())],
            dif = snapTime - wrappedTime;
          Math.abs(dif) > tl.duration() / 2 && (dif += dif < 0 ? tl.duration() : -tl.duration());
          lastSnap = (time + dif) / tl.duration() / -ratio;
          return lastSnap;
        },
        onRelease() { syncIndex(); draggable.isThrowing && (indexIsDirty = true); },
        onThrowComplete: () => { syncIndex(); wasPlaying && tl.play(); }
      })[0];
      tl.draggable = draggable;
    }
    tl.closestIndex(true);
    lastIndex = curIndex;
    onChange && onChange(items[curIndex], curIndex);
    timeline = tl;
    return () => window.removeEventListener("resize", onResize);
  });
  return timeline;
}

// ---- ÉTAPES STICKY (Osmo, version GSAP ScrollTrigger) ----
function initStickyStepsBasic() {
  const containers = document.querySelectorAll("[data-sticky-steps-init]");
  if (!containers.length) return;

  containers.forEach((container) => {
    const items = [...container.querySelectorAll("[data-sticky-steps-item]")];
    if (!items.length) return;

    function setActiveStep(activeIndex) {
      items.forEach((item, index) => {
        let status = "active";
        if (index < activeIndex) status = "before";
        if (index > activeIndex) status = "after";
        item.setAttribute("data-sticky-steps-item-status", status);
      });
    }

    items.forEach((item, index) => {
      const anchor = item.querySelector("[data-sticky-steps-anchor]");
      if (!anchor) return;
      ScrollTrigger.create({
        trigger: anchor,
        start: "center center",
        onEnter: () => setActiveStep(index),
        onEnterBack: () => setActiveStep(index)
      });
    });

    setActiveStep(0);
  });
}

// ---- MARQUEE direction-au-scroll (Osmo) ----
function initMarqueeScrollDirection() {
  document.querySelectorAll("[data-marquee-scroll-direction-target]").forEach((marquee) => {
    const marqueeContent = marquee.querySelector("[data-marquee-collection-target]");
    const marqueeScroll = marquee.querySelector("[data-marquee-scroll-target]");
    if (!marqueeContent || !marqueeScroll) return;

    const { marqueeSpeed: speed, marqueeDirection: direction, marqueeDuplicate: duplicate, marqueeScrollSpeed: scrollSpeed } = marquee.dataset;

    const marqueeSpeedAttr = parseFloat(speed);
    const marqueeDirectionAttr = direction === "right" ? 1 : -1;
    const duplicateAmount = parseInt(duplicate || 0);
    const scrollSpeedAttr = parseFloat(scrollSpeed);
    const speedMultiplier = window.innerWidth < 479 ? 0.25 : window.innerWidth < 991 ? 0.5 : 1;

    let marqueeSpeed = marqueeSpeedAttr * (marqueeContent.offsetWidth / window.innerWidth) * speedMultiplier;

    marqueeScroll.style.marginLeft = `${scrollSpeedAttr * -1}%`;
    marqueeScroll.style.width = `${(scrollSpeedAttr * 2) + 100}%`;

    if (duplicateAmount > 0) {
      const fragment = document.createDocumentFragment();
      for (let i = 0; i < duplicateAmount; i++) {
        fragment.appendChild(marqueeContent.cloneNode(true));
      }
      marqueeScroll.appendChild(fragment);
    }

    const marqueeItems = marquee.querySelectorAll("[data-marquee-collection-target]");
    const animation = gsap.to(marqueeItems, {
      xPercent: -100,
      repeat: -1,
      duration: marqueeSpeed,
      ease: "linear"
    }).totalProgress(0.5);

    gsap.set(marqueeItems, { xPercent: marqueeDirectionAttr === 1 ? 100 : -100 });
    animation.timeScale(marqueeDirectionAttr);
    animation.play();

    marquee.setAttribute("data-marquee-status", "normal");

    ScrollTrigger.create({
      trigger: marquee,
      start: "top bottom",
      end: "bottom top",
      onUpdate: (self) => {
        const isInverted = self.direction === 1;
        const currentDirection = isInverted ? -marqueeDirectionAttr : marqueeDirectionAttr;
        animation.timeScale(currentDirection);
        marquee.setAttribute("data-marquee-status", isInverted ? "normal" : "inverted");
      }
    });

    const tl = gsap.timeline({
      scrollTrigger: { trigger: marquee, start: "0% 100%", end: "100% 0%", scrub: 0 }
    });
    const scrollStart = marqueeDirectionAttr === -1 ? scrollSpeedAttr : -scrollSpeedAttr;
    const scrollEnd = -scrollStart;
    tl.fromTo(marqueeScroll, { x: `${scrollStart}vw` }, { x: `${scrollEnd}vw`, ease: "none" });
  });
}

// ---- FOOTER PARALLAX ----
function initFooterParallax() {
  document.querySelectorAll("[data-footer-parallax]").forEach((el) => {
    const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: "clamp(top bottom)", end: "clamp(top top)", scrub: true } });
    const inner = el.querySelector("[data-footer-parallax-inner]");
    const dark = el.querySelector("[data-footer-parallax-dark]");
    if (inner) tl.from(inner, { yPercent: -25, ease: "linear" });
    if (dark) tl.from(dark, { opacity: 0.5, ease: "linear" }, "<");
  });
}


// -----------------------------------------
// GO
// -----------------------------------------
if (document.readyState !== "loading") boot();
else document.addEventListener("DOMContentLoaded", boot);
