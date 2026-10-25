(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];

  const FX = window.GiftFX;

  const showroom = $("#showroom");
  const visual = $("#visual");
  const video = $("#screen-video");
  const screen = $("#monitor-screen");
  const dialog = $("#wishlist");

  const choices = $$(".scene-choice");

  const motionPreference = matchMedia(
    "(prefers-reduced-motion: reduce)"
  );

  const scenes = [
  {
    id: "setup",
    word: "PLAY.",
    category: "LE SETUP SOUS LE SAPIN",
    title: "Prêt pour la prochaine partie.",

    description:
  "La tour, l’écran AOC et le pack clavier + souris Logitech. " +
  "Je paierai une partie du PC avec mon argent de poche.",

    tagLabel: "L’ÉCRAN AOC",
    tagValue: "99,99 €",
    tagNote: "Prix repéré.",

    link: "https://www.aoc.com/fr/gaming/monitors/27g4xed",
    linkLabel: "Voir l’AOC 27G4XED",

    facts: [
      "27 pouces",
      "180 Hz",
      "Fast IPS",
      "Full HD",
      "Clavier + souris MK950 : 70,50 € avec coupons"
    ],

    credit: "Photo officielle AOC — modèle 27G4XED."
  },

  {
    id: "audio",
    word: "SOUND.",
    category: "LA MUSIQUE SOUS LE SAPIN",
    title: "Nothing Ear (3).",

    description:
      "Les écouteurs que j’aimerais pour ma musique au quotidien. " +
      "Le modèle exact : Nothing Ear (3).",

    tagLabel: "LES ÉCOUTEURS",
    tagValue: "119 €",
    tagNote: "Prix repéré.",

    link: "https://fr.nothing.tech/products/ear-3",
    linkLabel: "Voir les Nothing Ear (3)",

    facts: [
      "Nothing",
      "Ear (3)",
      "119 €",
      "Coloris à choisir"
    ],

    credit: "Photo officielle Nothing — coloris blanc présenté."
  }
];

  let activeScene = 0;
  let busy = false;

  let motion = !motionPreference.matches;
  let wantsVideo = motion && !navigator.connection?.saveData;

  let visualVisible = false;
  let videoFailed = false;
  let monitorImageValid = true;
  let localVideoURL = null;
  let previousOverflow = "";

  /*
   * AFFICHAGE DES PRODUITS
   */
  function renderScene(index) {
    activeScene = index;
    const scene = scenes[index];

    showroom.dataset.scene = scene.id;

    FX.word(scene.word);

    $("#scene-number").textContent = `CADEAU 0${index + 1} / 02`;
    $("#product-category").textContent = scene.category;
    $("#product-title").textContent = scene.title;
    $("#product-description").textContent = scene.description;

    $("#tag-label").textContent = scene.tagLabel;
    $("#tag-value").textContent = scene.tagValue;
    $("#tag-note").textContent = scene.tagNote;

    $("#product-link").href = scene.link;
    $("#product-link-label").textContent = scene.linkLabel;
    $("#photo-credit").textContent = scene.credit;

    const facts = scene.facts.map((text) => {
      const item = document.createElement("li");
      item.textContent = text;
      return item;
    });

    $("#product-facts").replaceChildren(...facts);

    $("#setup-product").hidden = index !== 0;
    $("#audio-product").hidden = index !== 1;

    $("#video-tools").hidden = index !== 0;
    $("#video-status").hidden = index !== 0;
    $("#specifications").hidden = index !== 0;

    $("#switch-indicator").style.transform =
      `translateX(${index * 100}%)`;

    choices.forEach((button, buttonIndex) => {
      button.setAttribute(
        "aria-pressed",
        String(buttonIndex === index)
      );
    });
  }

  async function changeScene(index) {
    if (busy || index === activeScene) return;

    busy = true;
    showroom.setAttribute("aria-busy", "true");

    FX.finish();
    FX.resetTilt();
    video.pause();

    try {
      if (FX.enabled) {
        await FX.cover();
      }

      renderScene(index);

      const entrance = FX.enter();
      const opening = FX.uncover();

      await Promise.all([entrance, opening]);

      $("#scene-announcement").textContent = scenes[index].title;
    } finally {
      $("#gift-curtain").style.transform = "scaleX(0)";

      busy = false;
      showroom.setAttribute("aria-busy", "false");

      syncPlayback();
    }
  }

  choices.forEach((button) => {
    button.addEventListener("click", () => {
      changeScene(Number(button.dataset.scene));
    });
  });

  /*
   * CLAVIER : LES FLÈCHES FONCTIONNENT DANS LE SÉLECTEUR.
   */
  $(".product-switch").addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;

    event.preventDefault();

    if (busy) return;

    const next = activeScene === 0 ? 1 : 0;
    choices[next].focus();

    changeScene(next);
  });

  /*
   * TÉLÉPHONE : BALAYAGE HORIZONTAL.
   * Le défilement vertical reste natif.
   */
  let touchStart = null;

  visual.addEventListener("pointerdown", (event) => {
    if (event.pointerType !== "touch") return;

    touchStart = {
      x: event.clientX,
      y: event.clientY
    };
  });

  visual.addEventListener("pointercancel", () => {
    touchStart = null;
  });

  visual.addEventListener("pointerup", (event) => {
    if (!touchStart) return;

    const dx = event.clientX - touchStart.x;
    const dy = event.clientY - touchStart.y;

    touchStart = null;

    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      changeScene(activeScene === 0 ? 1 : 0);
    }
  });

  /*
   * VIDÉO DANS L’ÉCRAN
   */
  video.muted = true;

  function updateVideoButton() {
    $("#video-toggle").textContent = videoFailed
      ? "Réessayer"
      : video.paused
        ? "Lire la vidéo"
        : "Pause vidéo";
  }

  function syncPlayback() {
    const asleep =
      document.hidden ||
      !visualVisible ||
      dialog.open;

    document.body.classList.toggle("asleep", asleep);

    const shouldPlay =
      activeScene === 0 &&
      wantsVideo &&
      !videoFailed &&
      !asleep &&
      !busy;

    if (!shouldPlay) {
      video.pause();
      return;
    }

    if (!video.getAttribute("src")) {
      video.src = video.dataset.src;
    }

    const request = video.play();

    if (request) {
      request.catch((error) => {
        if (error.name === "AbortError") return;

        updateVideoButton();

        if (error.name === "NotAllowedError") {
          $("#video-status").textContent =
            "Appuie sur « Lire la vidéo » pour lancer l’aperçu.";
        }
      });
    }
  }

  video.addEventListener("loadeddata", () => {
    videoFailed = false;

    if (monitorImageValid) {
      screen.classList.add("ready");
    }

    updateVideoButton();
  });

  video.addEventListener("play", updateVideoButton);
  video.addEventListener("pause", updateVideoButton);

  video.addEventListener("error", () => {
    videoFailed = true;
    screen.classList.remove("ready");

    $("#video-status").textContent =
      "Vidéo indisponible. Tu peux choisir ton propre fichier.";

    updateVideoButton();
  });

  $("#video-toggle").addEventListener("click", () => {
    if (videoFailed) {
      videoFailed = false;
      wantsVideo = true;
      video.load();
    } else {
      wantsVideo = video.paused;
    }

    syncPlayback();
  });

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(
      ([entry]) => {
        visualVisible = entry.isIntersecting;
        syncPlayback();
      },
      { threshold: 0.12 }
    ).observe(visual);
  } else {
    visualVisible = true;
  }

  document.addEventListener("visibilitychange", () => {
    FX.resetTilt();
    syncPlayback();
  });

  window.addEventListener("pagehide", () => video.pause());
  window.addEventListener("pageshow", syncPlayback);

  /*
   * APERÇU D’UN GAMEPLAY LOCAL
   * Le fichier sélectionné n’est envoyé nulle part.
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

    if (localVideoURL) {
      URL.revokeObjectURL(localVideoURL);
    }

    localVideoURL = URL.createObjectURL(file);

    videoFailed = false;
    wantsVideo = true;

    video.src = localVideoURL;
    video.load();

    $("#video-status").textContent =
      `${file.name} — aperçu local, non enregistré dans le site.`;

    event.target.value = "";
    syncPlayback();
  });

  /*
   * SI UNE PHOTO DISTANTE NE CHARGE PAS :
   * un message, pas un faux produit de remplacement.
   */
  $$("[data-product-image]").forEach((image) => {
    function showImageError() {
      image.style.opacity = "0";

      const fallback = image
        .closest(".product")
        .querySelector(".image-fallback");

      fallback.hidden = false;

      if (image.id === "monitor-image") {
        monitorImageValid = false;
        screen.classList.remove("ready");
      }
    }

    image.addEventListener("error", showImageError);

    if (image.complete && image.naturalWidth === 0) {
      showImageError();
    }
  });

  /*
   * COMMANDE GLOBALE DES ANIMATIONS
   */
  function applyMotion() {
    FX.setMotion(motion);

    $("#motion-toggle").setAttribute("aria-pressed", String(motion));

    $("#motion-toggle").setAttribute(
      "aria-label",
      motion
        ? "Désactiver les animations"
        : "Activer les animations"
    );

    wantsVideo = motion && !navigator.connection?.saveData;
    syncPlayback();
  }

  $("#motion-toggle").addEventListener("click", () => {
    motion = !motion;
    applyMotion();
  });

  motionPreference.addEventListener("change", (event) => {
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
      FX.panel(dialog);
    });
  });

  dialog.addEventListener("close", () => {
    document.body.style.overflow = previousOverflow;
    syncPlayback();
  });

  const listText = [
  "🎄 MA LISTE DE NOËL",
  "",
  "01 — UN PC GAMER COMPLET",
  "Avec la tour, l’écran, le clavier et la souris.",
  "La tour reste à choisir ensemble.",
  "",
  "ÉCRAN — AOC 27G4XED",
  "99,99 €",
  "27 pouces, 180 Hz, Fast IPS, Full HD.",
  "https://www.aoc.com/fr/gaming/monitors/27g4xed",
  "",
  "CLAVIER + SOURIS — LOGITECH SIGNATURE SLIM COMBO MK950",
  "70,50 € avec coupons.",
  "Le pack comprend le clavier et la souris.",
  "Blanc si possible, sinon le coloris le moins cher.",
  "https://www.logi.com/fr-fr/shop/p/signature-slim-mk950",
  "",
  "02 — DES NOTHING EAR (3)",
  "119 €",
  "Le modèle exact : Nothing Ear (3).",
  "Coloris à choisir ensemble.",
  "https://fr.nothing.tech/products/ear-3",
  "",
  "TOTAL DES PRODUITS CHIFFRÉS : 289,49 €",
  "Hors tour du PC et éventuels frais de livraison.",
  "Prix repérés, susceptibles de changer.",
  "Le tarif du MK950 dépend de l’application des coupons.",
  "",
  "Ce sont des idées, pas des obligations. Merci !"
].join("\n");

  $("#copy-list").addEventListener("click", async () => {
    try {
      if (!navigator.clipboard) {
        throw new Error("Copie indisponible");
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
  renderScene(0);
  applyMotion();
  FX.enter();
})();
