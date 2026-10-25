(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const library = window.anime;

  const activeAnimations = new Set();

  let enabled = !matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  let tiltFrame = 0;
  let x = 0;
  let y = 0;
  let targetX = 0;
  let targetY = 0;

  const visual = $("#visual");
  const tilt = $("#product-tilt");
  const curtain = $("#gift-curtain");

  /*
   * Animation finie, utilisable avec await.
   * Si la bibliothèque est indisponible, le contenu reste visible.
   */
  function run(targets, options) {
    if (!enabled || !library) return Promise.resolve();

    return new Promise((resolve) => {
      const instance = library.animate(targets, {
        ...options,

        onComplete: (self) => {
          activeAnimations.delete(self);
          resolve();
        }
      });

      activeAnimations.add(instance);
    });
  }

  function finish() {
    [...activeAnimations].forEach((instance) => {
      instance.complete();
    });
  }

  function word(text) {
    const fragment = document.createDocumentFragment();

    for (const character of text) {
      const span = document.createElement("span");
      span.textContent = character;
      fragment.append(span);
    }

    $("#big-word").replaceChildren(fragment);
  }

  function enter() {
    if (!enabled || !library) return Promise.resolve();

    return Promise.all([
      run("#big-word span", {
        translateY: { from: "110%", to: "0%" },
        rotate: { from: 7, to: 0 },
        opacity: { from: 0, to: 1 },
        delay: library.stagger(45),
        duration: 950,
        ease: "outExpo"
      }),

      run(".product-enter", {
        translateY: { from: 75, to: 0 },
        rotate: { from: -5, to: 0 },
        scale: { from: 0.8, to: 1 },
        opacity: { from: 0, to: 1 },
        duration: 1150,
        ease: "outExpo"
      }),

      run(".tag-inner", {
        scale: { from: 0.55, to: 1 },
        opacity: { from: 0, to: 1 },
        delay: 170,
        duration: 800,
        ease: "outBack"
      }),

      run(".info-in", {
        translateY: { from: 20, to: 0 },
        opacity: { from: 0, to: 1 },
        delay: library.stagger(75, { start: 180 }),
        duration: 700,
        ease: "outCubic"
      })
    ]);
  }

  function cover() {
    curtain.style.transformOrigin = "left";

    return run(curtain, {
      scaleX: { from: 0, to: 1 },
      duration: 430,
      ease: "inOutQuart"
    });
  }

  function uncover() {
    curtain.style.transformOrigin = "right";

    if (!enabled || !library) {
      curtain.style.transform = "scaleX(0)";
      return Promise.resolve();
    }

    return run(curtain, {
      scaleX: { from: 1, to: 0 },
      duration: 620,
      ease: "inOutQuart"
    });
  }

  function panel(element) {
    return run(element, {
      translateY: { from: 45, to: 0 },
      opacity: { from: 0, to: 1 },
      duration: 550,
      ease: "outExpo"
    });
  }

  /*
   * Inclinaison avec inertie.
   * La boucle s’arrête dès que le produit rejoint sa position.
   */
  function paintTilt() {
    x += (targetX - x) * 0.11;
    y += (targetY - y) * 0.11;

    tilt.style.transform =
      `perspective(1300px) rotateX(${y}deg) rotateY(${x}deg)`;

    visual.style.setProperty("--word-shift", `${-x * 1.6}px`);

    const moving =
      Math.abs(targetX - x) > 0.01 ||
      Math.abs(targetY - y) > 0.01;

    tiltFrame = moving ? requestAnimationFrame(paintTilt) : 0;
  }

  function requestTilt() {
    if (!tiltFrame) {
      tiltFrame = requestAnimationFrame(paintTilt);
    }
  }

  function resetTilt() {
    targetX = 0;
    targetY = 0;

    if (enabled && !document.hidden) {
      requestTilt();
      return;
    }

    cancelAnimationFrame(tiltFrame);
    tiltFrame = 0;
    x = 0;
    y = 0;

    tilt.style.transform = "";
    visual.style.setProperty("--word-shift", "0px");
  }

  const finePointer = matchMedia(
    "(hover: hover) and (pointer: fine)"
  );

  visual.addEventListener("pointermove", (event) => {
    if (!enabled || !finePointer.matches) return;
    if ($("#showroom").getAttribute("aria-busy") === "true") return;
    if ($("#wishlist").open) return;

    const bounds = visual.getBoundingClientRect();

    targetX =
      ((event.clientX - bounds.left) / bounds.width - 0.5) * 11;

    targetY =
      (0.5 - (event.clientY - bounds.top) / bounds.height) * 7;

    requestTilt();
  });

  visual.addEventListener("pointerleave", resetTilt);

  /*
   * Décor de Noël.
   * Seulement quelques éléments, pas de grosse simulation.
   */
  function decorate() {
    const lights = document.createDocumentFragment();

    for (let index = 0; index < 15; index++) {
      const bulb = document.createElement("i");
      bulb.style.setProperty("--delay", `${index * -0.27}s`);
      lights.append(bulb);
    }

    $("#garland").append(lights);

    const flakes = document.createDocumentFragment();

    for (let index = 0; index < 20; index++) {
      const flake = document.createElement("span");
      flake.className = "snowflake";

      flake.style.setProperty("--x", `${Math.random() * 100}%`);
      flake.style.setProperty("--size", `${2 + Math.random() * 3}px`);
      flake.style.setProperty("--speed", `${8 + Math.random() * 9}s`);
      flake.style.setProperty("--delay", `${Math.random() * -20}s`);
      flake.style.setProperty("--sway", `${Math.random() * 90 - 45}px`);

      flakes.append(flake);
    }

    $("#snow").append(flakes);
  }

  function setMotion(value) {
    enabled = value;
    document.body.classList.toggle("motion", enabled);

    if (!enabled) finish();

    resetTilt();
  }

  decorate();

  window.GiftFX = {
    get enabled() {
      return enabled && Boolean(library);
    },

    word,
    enter,
    cover,
    uncover,
    panel,
    finish,
    resetTilt,
    setMotion
  };
})();
