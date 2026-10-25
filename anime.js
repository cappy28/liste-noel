(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);

  const stage = $("#showroom");
  const video = $("#screen-video");
  const screen = $("#screen");
  const dialog = $("#wishlist");
  const wipe = $("#wipe");
  const tilt = $("#product-tilt");
  const videoButton = $("#video-toggle");
  const motionButton = $("#motion-toggle");

  const choices = [...document.querySelectorAll(".scene-choice")];

  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)");

  const animate = window.anime?.animate;
  const stagger = window.anime?.stagger;

  let current = 0;
  let busy = false;
  let motion = !reducedMotion.matches;
  let wantsVideo = motion;
  let stageVisible = true;
  let localVideoURL = null;

  const scenes = [
    {
      word: "PLAY.",
      color: "#b9cef5",
      label: "01 / LE SETUP",
      title: "Le setup complet.",
      description:
        "La tour, l’écran, le clavier et la souris. " +
        "Les modèles se choisissent ensemble.",
      ticketLabel: "BUDGET ÉCRAN",
      ticketValue: "99 €",
      ticketNote: "Objectif, pas prix confirmé.",
      link: "https://www.aoc.com/fr/gaming/monitors/24g4xe",
      linkLabel: "Voir l’écran de référence",
      note: "Photo : AOC 24G4XE. Modèle provisoire, prix à confirmer."
    },
    {
      word: "SOUND.",
      color: "#fa7955",
      label: "02 / LES ÉCOUTEURS",
      title: "Nothing Ear (3).",
      description:
        "Le modèle que j’aimerais pour ma musique au quotidien. " +
        "Le coloris, on le choisit ensemble.",
      ticketLabel: "LE MODÈLE EXACT",
      ticketValue: "(3)",
      ticketNote: "Nothing Ear (3).",
      link: "https://fr.nothing.tech/products/ear-3",
      linkLabel: "Voir les Nothing Ear (3)",
      note: "Photo officielle Nothing. Le blanc est présenté ici."
    }
  ];

  /*
   * CHANGEMENT DE SCÈNE
   */

  function buildWord(text) {
    const fragment = document.createDocumentFragment();

    for (const character of text) {
      const span = document.createElement("span");
      span.textContent = character;
      fragment.append(span);
    }

    $("#big-word").replaceChildren(fragment);
  }

  function renderScene(index) {
    current = index;
    const scene = scenes[index];

    stage.style.backgroundColor = scene.color;

    buildWord(scene.word);

    $("#scene-label").textContent = scene.label;
    $("#product-title").textContent = scene.title;
    $("#product-description").textContent = scene.description;

    $("#ticket-label").textContent = scene.ticketLabel;
    $("#ticket-value").textContent = scene.ticketValue;
    $("#ticket-note").textContent = scene.ticketNote;

    $("#product-link").href = scene.link;
    $("#product-link-label").textContent = scene.linkLabel;
    $("#scene-note").textContent = scene.note;

    $("#scene-counter").textContent = `0${index + 1} — 02`;

    $("#gaming-product").hidden = index !== 0;
    $("#audio-product").hidden = index !== 1;
    $("#video-tools").hidden = index !== 0;

    $("#video-status").hidden = index !== 0;

    $("#switch-indicator").style.transform =
      `translateX(${index * 100}%)`;

    choices.forEach((button, buttonIndex) => {
      button.setAttribute("aria-pressed", String(buttonIndex === index));
    });

    syncPlayback();
  }

  function enterScene() {
    if (!motion || !animate) return;

    animate("#big-word span", {
      translateY: { from: 150, to: 0 },
      opacity: { from: 0, to: 1 },
      delay: stagger(45),
      duration: 850,
      ease: "outExpo"
    });

    animate(".product-enter", {
      translateY: { from: 75, to: 0 },
      scale: { from: 0.83, to: 1 },
      opacity: { from: 0, to: 1 },
      duration: 1100,
      ease: "outExpo"
    });

    animate(".ticket-enter", {
      scale: { from: 0.5, to: 1 },
      opacity: { from: 0, to: 1 },
      delay: 160,
      duration: 750,
      ease: "outBack"
    });

    animate(".scene-copy, .scene-actions", {
      translateY: { from: 22, to: 0 },
      opacity: { from: 0, to: 1 },
      delay: stagger(80, { start: 180 }),
      duration: 650,
      ease: "outCubic"
    });
  }

  function changeScene(index) {
    if (index === current || busy) return;

    resetTilt();

    if (!motion || !animate) {
      renderScene(index);
      $("#scene-announcement").textContent = scenes[index].title;
      return;
    }

    busy = true;
    wipe.style.backgroundColor = scenes[index].color;

    animate(wipe, {
      translateX: { from: "-101%", to: "0%" },
      duration: 380,
      ease: "inOutQuart",

      onComplete: () => {
        renderScene(index);

        animate(wipe, {
          translateX: { from: "0%", to: "101%" },
          duration: 520,
          ease: "inOutQuart",

          onComplete: () => {
            busy = false;
            $("#scene-announcement").textContent = scenes[index].title;
          }
        });

        enterScene();
      }
    });
  }

  choices.forEach((button) => {
    button.addEventListener("click", () => {
      changeScene(Number(button.dataset.scene));
    });
  });

  /*
   * INCLINAISON AVEC INERTIE
   *
   * La boucle s’arrête quand le produit a rejoint sa position.
   */

  let frame = 0;
  let x = 0;
  let y = 0;
  let targetX = 0;
  let targetY = 0;

  function updateTilt() {
    x += (targetX - x) * 0.1;
    y += (targetY - y) * 0.1;

    tilt.style.transform =
      `perspective(1200px) rotateX(${y}deg) rotateY(${x}deg)`;

    stage.style.setProperty("--drift", `${-x * 1.8}px`);

    const moving =
      Math.abs(targetX - x) > 0.015 ||
      Math.abs(targetY - y) > 0.015;

    frame = moving ? requestAnimationFrame(updateTilt) : 0;
  }

  function startTilt() {
    if (!frame) frame = requestAnimationFrame(updateTilt);
  }

  function resetTilt() {
    targetX = 0;
    targetY = 0;

    if (motion) {
      startTilt();
    } else {
      cancelAnimationFrame(frame);
      frame = 0;
      x = 0;
      y = 0;
      tilt.style.transform = "";
      stage.style.setProperty("--drift", "0px");
    }
  }

  stage.addEventListener("pointermove", (event) => {
    if (!motion || !finePointer.matches || busy) return;

    const bounds = stage.getBoundingClientRect();

    targetX =
      ((event.clientX - bounds.left) / bounds.width - 0.5) * 12;

    targetY =
      (0.5 - (event.clientY - bounds.top) / bounds.height) * 8;

    startTilt();
  });

  stage.addEventListener("pointerleave", resetTilt);

  /*
   * VIDÉO : PAS DE SON IMPOSÉ, PAS DE LECTURE HORS CHAMP
   */

  video.muted = true;

  function updateVideoButton() {
    videoButton.textContent = video.paused
      ? "Lire la vidéo"
      : "Pause vidéo";
  }

  function syncPlayback() {
    const asleep = document.hidden || !stageVisible || dialog.open;
    document.body.classList.toggle("asleep", asleep);

    const shouldPlay =
      current === 0 &&
      wantsVideo &&
      !asleep;

    if (!shouldPlay) {
      video.pause();
      return;
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
    videoButton.disabled = false;
    syncPlayback();
  });

  video.addEventListener("play", updateVideoButton);
  video.addEventListener("pause", updateVideoButton);

  video.addEventListener("timeupdate", () => {
    const progress =
      Number.isFinite(video.duration) && video.duration > 0
        ? video.currentTime / video.duration
        : 0;

    $("#video-progress").style.transform = `scaleX(${progress})`;
  });

  video.addEventListener("error", () => {
    screen.classList.remove("ready");
    videoButton.disabled = true;

    $("#video-status").textContent =
      "Vidéo indisponible. Tu peux choisir ton propre fichier vidéo.";
  });

  videoButton.addEventListener("click", () => {
    wantsVideo = video.paused;
    syncPlayback();
  });

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => {
      stageVisible = entry.isIntersecting;
      syncPlayback();
    }, { threshold: 0.15 }).observe(stage);
  }

  document.addEventListener("visibilitychange", syncPlayback);

  window.addEventListener("pagehide", () => video.pause());
  window.addEventListener("pageshow", syncPlayback);

  /*
   * APERÇU D’UN GAMEPLAY PERSONNEL
   * Le fichier reste sur l’appareil.
   */

  $("#choose-video").addEventListener("click", () => {
    $("#video-file").click();
  });

  $("#video-file").addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type && !file.type.startsWith("video/")) {
      $("#video-status").textContent = "Choisis un fichier vidéo.";
      event.target.value = "";
      return;
    }

    video.pause();
    screen.classList.remove("ready");

    if (localVideoURL) URL.revokeObjectURL(localVideoURL);

    localVideoURL = URL.createObjectURL(file);
    video.src = localVideoURL;
    videoButton.disabled = false;

    wantsVideo = true;
    video.load();
    syncPlayback();

    $("#video-status").textContent =
      `${file.name} — aperçu local, non enregistré dans le site.`;

    event.target.value = "";
  });

  /*
   * COMMANDE GLOBALE DES ANIMATIONS
   */

  function applyMotion() {
    document.body.classList.toggle("motion", motion);

    motionButton.textContent =
      `Animations : ${motion ? "oui" : "non"}`;

    motionButton.setAttribute("aria-pressed", String(motion));

    wantsVideo = motion;
    resetTilt();
    syncPlayback();
  }

  motionButton.addEventListener("click", () => {
    motion = !motion;
    applyMotion();
  });

  reducedMotion.addEventListener("change", (event) => {
    motion = !event.matches;
    applyMotion();
  });

  /*
   * LA VERSION SIMPLE POUR LES PARENTS
   */

  $("#open-list").addEventListener("click", () => {
    if (dialog.open) return;

    dialog.showModal();
    syncPlayback();

    if (motion && animate) {
      animate(dialog, {
        translateY: { from: 25, to: 0 },
        opacity: { from: 0, to: 1 },
        duration: 450,
        ease: "outCubic"
      });

      animate(".gift-row", {
        translateY: { from: 20, to: 0 },
        opacity: { from: 0, to: 1 },
        delay: stagger(100, { start: 100 }),
        duration: 550,
        ease: "outCubic"
      });
    }
  });

  dialog.addEventListener("close", syncPlayback);

  const listText = [
    "MA LISTE DE NOËL",
    "",
    "01 — Un PC gamer complet",
    "La tour, un écran AOC, un clavier et une souris.",
    "Budget visé pour l’écran : 99 €. Prix et modèle à confirmer.",
    "Configuration à choisir ensemble selon le budget.",
    "",
    "02 — Des Nothing Ear (3)",
    "Coloris à choisir ensemble.",
    "Modèle exact : https://fr.nothing.tech/products/ear-3",
    "",
    "Ce sont des idées, pas des obligations. Merci !"
  ].join("\n");

  $("#copy-list").addEventListener("click", async () => {
    try {
      if (!navigator.clipboard) throw new Error("Copie indisponible");

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

  /*
   * DÉMARRAGE
   */

  renderScene(0);
  applyMotion();
  enterScene();
})();
