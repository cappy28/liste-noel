(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];

  const animate = window.anime?.animate;
  const stagger = window.anime?.stagger;

  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)");

  const video = $("#screen-video");
  const videoButton = $("#video-toggle");
  const videoStatus = $("#video-status");
  const screen = $("#monitor-screen");

  const monitorFigure = $("#monitor-figure");
  const monitorScroll = $("#monitor-scroll");
  const tilt = $("#monitor-tilt");

  const audio = $("#audio");
  const audioPhoto = $("#audio-photo");
  const dialog = $("#wishlist");

  const runningAnimations = new Set();

  let motion = !reducedMotion.matches;
  let monitorVisible = false;
  let wantsPlayback = motion && !navigator.connection?.saveData;
  let videoFailed = false;
  let localVideoURL = null;
  let previousOverflow = "";

  /*
   * ANIME.JS
   *
   * Rien n’est masqué par défaut :
   * la page reste lisible si la bibliothèque ne charge pas.
   */

  function playAnimation(targets, options) {
    if (!animate || !motion) return;

    const instance = animate(targets, {
      ...options,
      onComplete: (self) => {
        runningAnimations.delete(self);
        options.onComplete?.(self);
      }
    });

    runningAnimations.add(instance);
    return instance;
  }

  function animateCounter(element) {
    if (!animate || !motion) return;

    const end = Number(element.dataset.count);
    const state = { value: 0 };

    playAnimation(state, {
      value: end,
      duration: 1300,
      ease: "outExpo",

      onUpdate: () => {
        element.textContent = Math.round(state.value);
      },

      onComplete: () => {
        element.textContent = end;
      }
    });
  }

  function reveal(element) {
    playAnimation(element, {
      opacity: { from: 0, to: 1 },
      translateY: { from: 28, to: 0 },
      duration: 900,
      ease: "outCubic"
    });

    element.querySelectorAll("[data-count]").forEach(animateCounter);
  }

  if ("IntersectionObserver" in window) {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          reveal(entry.target);
          revealObserver.unobserve(entry.target);
        });
      },
      {
        threshold: 0.1,
        rootMargin: "0px 0px -20px 0px"
      }
    );

    $$("[data-reveal]").forEach((element) => {
      revealObserver.observe(element);
    });
  }

  function intro() {
    if (!animate || !motion) return;

    playAnimation("[data-heading]", {
      translateY: { from: "110%", to: "0%" },
      opacity: { from: 0, to: 1 },
      delay: stagger(110),
      duration: 1150,
      ease: "outExpo"
    });

    playAnimation("[data-intro]", {
      translateY: { from: 20, to: 0 },
      opacity: { from: 0, to: 1 },
      delay: stagger(100, { start: 180 }),
      duration: 800,
      ease: "outCubic"
    });
  }

  /*
   * DÉFILEMENT
   *
   * Une mise à jour par image demandée, pas de boucle
   * permanente quand la page est immobile.
   */

  let scrollFrame = 0;

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function paintScroll() {
    scrollFrame = 0;

    const available =
      document.documentElement.scrollHeight - window.innerHeight;

    const progress =
      available > 0 ? clamp(window.scrollY / available, 0, 1) : 0;

    const audioBounds = audio.getBoundingClientRect();
    const monitorBounds = monitorFigure.getBoundingClientRect();

    const activeIndex =
      audioBounds.top < window.innerHeight * 0.55 ? 1 : 0;

    $("#reading-progress").style.transform = `scaleX(${progress})`;
    $("#dock-marker").style.transform =
      `translateX(${activeIndex * 100}%)`;

    $$(".dock-link").forEach((link, index) => {
      const active = index === activeIndex;

      link.classList.toggle("is-active", active);

      if (active) {
        link.setAttribute("aria-current", "location");
      } else {
        link.removeAttribute("aria-current");
      }
    });

    if (!motion) {
      monitorScroll.style.setProperty("--lift", "0px");
      monitorScroll.style.setProperty("--lean", "0deg");
      audioPhoto.style.setProperty("--zoom", "1");
      return;
    }

    const monitorPosition = clamp(
      (
        window.innerHeight / 2 -
        (monitorBounds.top + monitorBounds.height / 2)
      ) / window.innerHeight,
      -1,
      1
    );

    monitorScroll.style.setProperty(
      "--lift",
      `${monitorPosition * -18}px`
    );

    monitorScroll.style.setProperty(
      "--lean",
      `${monitorPosition * 1.1}deg`
    );

    const audioPosition = clamp(
      audioBounds.top / window.innerHeight,
      -1,
      1
    );

    audioPhoto.style.setProperty(
      "--zoom",
      String(1.025 + Math.abs(audioPosition) * 0.02)
    );
  }

  function scheduleScroll() {
    if (!scrollFrame) {
      scrollFrame = requestAnimationFrame(paintScroll);
    }
  }

  window.addEventListener("scroll", scheduleScroll, { passive: true });
  window.addEventListener("resize", scheduleScroll);

  $$('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (event) => {
      const target = document.querySelector(link.getAttribute("href"));
      if (!target) return;

      event.preventDefault();

      target.scrollIntoView({
        behavior: motion ? "smooth" : "auto",
        block: "start"
      });
    });
  });

  /*
   * INCLINAISON SUR ORDINATEUR
   *
   * Sur téléphone, le mouvement vient du défilement :
   * aucun effet ne nécessite de survol.
   */

  let tiltFrame = 0;
  let x = 0;
  let y = 0;
  let targetX = 0;
  let targetY = 0;

  function paintTilt() {
    x += (targetX - x) * 0.12;
    y += (targetY - y) * 0.12;

    tilt.style.transform =
      `perspective(1200px) rotateX(${y}deg) rotateY(${x}deg)`;

    const moving =
      Math.abs(targetX - x) > 0.01 ||
      Math.abs(targetY - y) > 0.01;

    tiltFrame = moving ? requestAnimationFrame(paintTilt) : 0;
  }

  function requestTilt() {
    if (!tiltFrame) tiltFrame = requestAnimationFrame(paintTilt);
  }

  function resetTilt() {
    targetX = 0;
    targetY = 0;

    if (motion && !document.hidden) {
      requestTilt();
    } else {
      cancelAnimationFrame(tiltFrame);
      tiltFrame = 0;
      x = 0;
      y = 0;
      tilt.style.transform = "";
    }
  }

  monitorFigure.addEventListener("pointermove", (event) => {
    if (!motion || !finePointer.matches || dialog.open) return;

    const bounds = monitorFigure.getBoundingClientRect();

    targetX =
      ((event.clientX - bounds.left) / bounds.width - 0.5) * 9;

    targetY =
      (0.5 - (event.clientY - bounds.top) / bounds.height) * 6;

    requestTilt();
  });

  monitorFigure.addEventListener("pointerleave", resetTilt);

  /*
   * VIDÉO
   *
   * Le fichier n’est chargé que lorsqu’une lecture est demandée.
   * La vidéo se met en pause hors champ et derrière la liste.
   */

  video.muted = true;

  function updateVideoButton() {
    videoButton.textContent = videoFailed
      ? "Réessayer"
      : video.paused
        ? "Lire la vidéo"
        : "Mettre en pause";
  }

  function syncPlayback() {
    const asleep =
      document.hidden ||
      !monitorVisible ||
      dialog.open;

    document.body.classList.toggle("asleep", asleep);

    const shouldPlay =
      wantsPlayback &&
      !asleep &&
      !videoFailed;

    if (!shouldPlay) {
      video.pause();
      return;
    }

    if (!video.getAttribute("src")) {
      video.src = video.dataset.src;
    }

    const request = video.play();

    if (request) {
      request.catch(() => {
        updateVideoButton();
      });
    }
  }

  video.addEventListener("loadeddata", () => {
    screen.classList.add("ready");
    videoFailed = false;
    updateVideoButton();
  });

  video.addEventListener("play", updateVideoButton);
  video.addEventListener("pause", updateVideoButton);

  video.addEventListener("error", () => {
    videoFailed = true;
    screen.classList.remove("ready");

    videoStatus.textContent =
      "La vidéo est indisponible. Tu peux choisir ton propre fichier.";

    updateVideoButton();
  });

  videoButton.addEventListener("click", () => {
    if (videoFailed) {
      videoFailed = false;
      wantsPlayback = true;
      video.load();
    } else {
      wantsPlayback = video.paused;
    }

    syncPlayback();
  });

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(
      ([entry]) => {
        monitorVisible = entry.isIntersecting;
        syncPlayback();
      },
      { threshold: 0.15 }
    ).observe(monitorFigure);
  } else {
    monitorVisible = true;
  }

  document.addEventListener("visibilitychange", () => {
    resetTilt();
    syncPlayback();
  });

  window.addEventListener("pagehide", () => video.pause());
  window.addEventListener("pageshow", syncPlayback);

  /*
   * APERÇU D’UN GAMEPLAY PERSONNEL
   * Aucun fichier sélectionné n’est envoyé à un serveur.
   */

  $("#choose-video").addEventListener("click", () => {
    $("#video-file").click();
  });

  $("#video-file").addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type && !file.type.startsWith("video/")) {
      videoStatus.textContent = "Choisis un fichier vidéo.";
      event.target.value = "";
      return;
    }

    video.pause();
    screen.classList.remove("ready");

    if (localVideoURL) {
      URL.revokeObjectURL(localVideoURL);
    }

    localVideoURL = URL.createObjectURL(file);

    videoFailed = false;
    wantsPlayback = true;
    video.src = localVideoURL;
    video.load();

    videoStatus.textContent =
      `${file.name} — aperçu local uniquement, non enregistré dans le site.`;

    event.target.value = "";
    syncPlayback();
  });

  /*
   * IMAGES : PAS DE FAUX PRODUIT EN CAS D’ÉCHEC.
   */

  $$("[data-product-image]").forEach((image) => {
    const showError = () => {
      const visual = image.closest("[data-visual]");
      const fallback = visual?.querySelector(".image-fallback");

      if (fallback) fallback.hidden = false;
    };

    image.addEventListener("error", showError);

    if (image.complete && image.naturalWidth === 0) {
      showError();
    }
  });

  /*
   * ACTIVATION / DÉSACTIVATION DES MOUVEMENTS
   */

  function applyMotion() {
    document.body.classList.toggle("motion", motion);

    $("#motion-toggle").setAttribute("aria-pressed", String(motion));
    $("#motion-toggle").setAttribute(
      "aria-label",
      motion
        ? "Désactiver les animations"
        : "Activer les animations"
    );

    if (!motion) {
      [...runningAnimations].forEach((instance) => {
        instance.complete();
      });

      runningAnimations.clear();
      wantsPlayback = false;
    } else {
      wantsPlayback = !navigator.connection?.saveData;
    }

    resetTilt();
    scheduleScroll();
    syncPlayback();
  }

  $("#motion-toggle").addEventListener("click", () => {
    motion = !motion;
    applyMotion();
  });

  reducedMotion.addEventListener("change", (event) => {
    motion = !event.matches;
    applyMotion();
  });

  /*
   * LISTE POUR LES PARENTS
   */

  $$("[data-open-list]").forEach((button) => {
    button.addEventListener("click", () => {
      if (dialog.open) return;

      previousOverflow = document.body.style.overflow;
      dialog.showModal();
      document.body.style.overflow = "hidden";

      syncPlayback();

      playAnimation(dialog, {
        translateY: { from: 45, to: 0 },
        opacity: { from: 0, to: 1 },
        duration: 500,
        ease: "outExpo"
      });

      if (stagger) {
        playAnimation(".gift-list li", {
          translateY: { from: 18, to: 0 },
          opacity: { from: 0, to: 1 },
          delay: stagger(85, { start: 80 }),
          duration: 650,
          ease: "outCubic"
        });
      }
    });
  });

  dialog.addEventListener("close", () => {
    document.body.style.overflow = previousOverflow;
    scheduleScroll();
    syncPlayback();
  });

  const listText = [
    "MA LISTE DE NOËL",
    "",
    "01 — UN PC GAMER COMPLET",
    "La tour, l’écran, le clavier et la souris.",
    "",
    "Écran choisi : AOC 27G4XED.",
    "27 pouces, 180 Hz, Fast IPS, Full HD, 1 ms GtG.",
    "Budget visé pour l’écran : 99 €, prix à vérifier.",
    "La tour, le clavier et la souris sont à choisir ensemble.",
    "https://www.aoc.com/fr/gaming/monitors/27g4xed",
    "",
    "02 — DES NOTHING EAR (3)",
    "Le modèle exact est Ear (3).",
    "Coloris à choisir ensemble.",
    "https://fr.nothing.tech/products/ear-3",
    "",
    "Ce sont des idées, pas des obligations. Merci !"
  ].join("\n");

  $("#copy-list").addEventListener("click", async () => {
    try {
      if (!navigator.clipboard) {
        throw new Error("Copie automatique indisponible");
      }

      await navigator.clipboard.writeText(listText);

      $("#copy-fallback").hidden = true;
      $("#copy-status").textContent = "Liste copiée. Prête à envoyer.";
    } catch {
      const field = $("#copy-fallback");

      field.hidden = false;
      field.value = listText;
      field.focus();
      field.select();

      $("#copy-status").textContent =
        "Copie automatique indisponible : copie le texte sélectionné.";
    }
  });

  if (navigator.share) {
    $("#share-list").hidden = false;

    $("#share-list").addEventListener("click", async () => {
      try {
        await navigator.share({
          title: "Ma liste de Noël",
          text: listText
        });
      } catch (error) {
        if (error.name !== "AbortError") {
          $("#copy-status").textContent =
            "Le partage n’a pas abouti. Tu peux copier la liste.";
        }
      }
    });
  }

  /*
   * DÉMARRAGE
   */

  applyMotion();
  intro();
  scheduleScroll();
})();
