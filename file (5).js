(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);

  const $$ = (selector) => [
    ...document.querySelectorAll(selector)
  ];

  /*
   * Les animations viennent de ton fichier anime.js existant.
   *
   * Ce remplacement minimal permet de garder les boutons
   * fonctionnels même si ce fichier ne se charge pas.
   */
  const FX = window.GiftFX || {
    enabled: false,

    word(text) {
      $("#big-word").textContent = text;
    },

    setMotion(value) {
      document.body.classList.toggle("motion", value);
    },

    finish() {},
    resetTilt() {},

    enter() {
      return Promise.resolve();
    },

    cover() {
      return Promise.resolve();
    },

    uncover() {
      $("#gift-curtain").style.transform = "scaleX(0)";
      return Promise.resolve();
    },

    panel() {
      return Promise.resolve();
    }
  };

  const showroom = $("#showroom");
  const visual = $("#visual");

  const video = $("#screen-video");
  const screen = $("#monitor-screen");

  const dialog = $("#wishlist");
  const choices = $$(".scene-choice");

  const motionPreference = matchMedia(
    "(prefers-reduced-motion: reduce)"
  );

  /*
   * PRIX ET LIENS
   *
   * Les montants sont enregistrés en centimes.
   * Ce sont les prix que tu as repérés.
   */
  const offers = {
    screen: {
      cents: 9999,
      url: "https://www.aoc.com/fr/gaming/monitors/27g4xed"
    },

    combo: {
      cents: 7050,
      url: "https://www.amazon.fr/dp/B0CTQN69N1"
    },

    ears: {
      cents: 11900,
      url: "https://fr.nothing.tech/products/ear-3"
    }
  };

  const totalCents =
    offers.screen.cents +
    offers.combo.cents +
    offers.ears.cents;

  function euros(cents) {
    const hasCents = cents % 100 !== 0;

    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: hasCents ? 2 : 0,
      maximumFractionDigits: 2
    }).format(cents / 100);
  }

  /*
   * LES DEUX CADEAUX
   */
  const scenes = [
    {
      id: "setup",
      word: "PLAY.",

      category: "LE SETUP SOUS LE SAPIN",
      title: "Le setup complet.",

      description:
        "La tour, l’écran AOC et le pack clavier + souris Logitech. " +
        "Je paierai une partie du PC avec mon argent de poche.",

      tagLabel: "L’ÉCRAN AOC",
      tagValue: euros(offers.screen.cents),
      tagNote: "Prix repéré.",

      link: offers.screen.url,
      linkLabel: "Voir l’AOC 27G4XED",

      facts: [
        "27 pouces",
        "180 Hz",
        "Fast IPS",
        "Full HD"
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
        "Pour le coloris, on peut choisir ensemble.",

      tagLabel: "LES ÉCOUTEURS",
      tagValue: euros(offers.ears.cents),
      tagNote: "Prix repéré.",

      link: offers.ears.url,
      linkLabel: "Voir les Nothing Ear (3)",

      facts: [
        "Nothing Ear (3)",
        euros(offers.ears.cents),
        "Coloris à choisir"
      ],

      credit: "Photo officielle Nothing — coloris blanc présenté."
    }
  ];

  let activeScene = 0;
  let busy = false;

  let motion = !motionPreference.matches;

  let wantsVideo =
    motion && !navigator.connection?.saveData;

  let visualVisible = false;
  let videoFailed = false;
  let monitorImageValid = true;

  let localVideoURL = null;
  let previousOverflow = "";

  /*
   * PRIX DANS LES CARTES ET LE RÉCAPITULATIF
   */
  function updatePrices() {
    $$("[data-price]").forEach((element) => {
      const key = element.dataset.price;

      const cents = key === "total"
        ? totalCents
        : offers[key]?.cents;

      if (typeof cents === "number") {
        element.textContent = euros(cents);
      }
    });

    $$("[data-offer-link]").forEach((link) => {
      const offer = offers[link.dataset.offerLink];

      if (offer) {
        link.href = offer.url;
      }
    });
  }

  /*
   * AFFICHAGE DE LA SCÈNE ACTIVE
   *
   * Tous les éléments réservés à un cadeau utilisent :
   * data-scene-only="setup"
   * ou
   * data-scene-only="audio"
   */
  function renderScene(index) {
    const scene = scenes[index];

    if (!scene) return;

    activeScene = index;
    showroom.dataset.scene = scene.id;

    FX.word(scene.word);

    $("#scene-number").textContent =
      `CADEAU 0${index + 1} / ${String(scenes.length).padStart(2, "0")}`;

    $("#product-category").textContent = scene.category;
    $("#product-title").textContent = scene.title;
    $("#product-description").textContent = scene.description;

    $("#tag-label").textContent = scene.tagLabel;
    $("#tag-value").textContent = scene.tagValue;
    $("#tag-note").textContent = scene.tagNote;

    $("#product-link").href = scene.link;
    $("#product-link-label").textContent = scene.linkLabel;

    $("#photo-credit").textContent = scene.credit;

    /*
     * On remplace complètement les caractéristiques :
     * celles du Logitech ou de l’écran ne restent pas sur les Ear (3).
     */
    const facts = scene.facts.map((text) => {
      const item = document.createElement("li");
      item.textContent = text;
      return item;
    });

    $("#product-facts").replaceChildren(...facts);

    /*
     * Recherche limitée au showroom :
     * la liste des parents conserve volontairement tous les cadeaux.
     */
    showroom.querySelectorAll("[data-scene-only]").forEach((element) => {
      element.hidden =
        element.dataset.sceneOnly !== scene.id;
    });

    if (scene.id !== "setup") {
      video.pause();
      $("#specifications").open = false;
    }

    $("#switch-indicator").style.transform =
      `translateX(${index * 100}%)`;

    choices.forEach((button, buttonIndex) => {
      button.setAttribute(
        "aria-pressed",
        String(buttonIndex === index)
      );
    });
  }

  /*
   * TRANSITION ENTRE LES CADEAUX
   */
  async function changeScene(index, returnToProduct = false) {
    if (
      busy ||
      index === activeScene ||
      !scenes[index]
    ) {
      return;
    }

    const visualBounds = visual.getBoundingClientRect();

    const shouldReturn =
      returnToProduct &&
      (
        visualBounds.bottom < 100 ||
        visualBounds.top < -visualBounds.height * 0.4
      );

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

      /*
       * Si le changement est demandé depuis le bas de la page,
       * on revient au produit pendant que le rideau le couvre.
       */
      if (shouldReturn) {
        showroom.scrollIntoView({
          behavior: "instant",
          block: "start"
        });
      }

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
      changeScene(
        Number(button.dataset.scene),
        true
      );
    });
  });

  /*
   * NAVIGATION AU CLAVIER
   */
  $(".product-switch").addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight"].includes(event.key)) {
      return;
    }

    event.preventDefault();

    if (busy) return;

    const next = activeScene === 0 ? 1 : 0;

    choices[next].focus();
    changeScene(next, true);
  });

  /*
   * BALAYAGE SUR TÉLÉPHONE
   *
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

    const horizontalSwipe =
      Math.abs(dx) > 60 &&
      Math.abs(dx) > Math.abs(dy) * 1.5;

    if (horizontalSwipe) {
      changeScene(activeScene === 0 ? 1 : 0);
    }
  });

  /*
   * VIDÉO DANS LA DALLE
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
      monitorImageValid &&
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
    const visibilityObserver = new IntersectionObserver(
      ([entry]) => {
        visualVisible = entry.isIntersecting;
        syncPlayback();
      },
      { threshold: 0.12 }
    );

    visibilityObserver.observe(visual);
  } else {
    visualVisible = true;
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      FX.finish();
    }

    FX.resetTilt();
    syncPlayback();
  });

  window.addEventListener("pagehide", () => {
    video.pause();
  });

  window.addEventListener("pageshow", syncPlayback);

  /*
   * PRÉVISUALISATION D’UN GAMEPLAY PERSONNEL
   *
   * Le fichier reste sur l’appareil.
   * Pour l’inclure définitivement :
   * utiliser assets/gameplay.mp4 dans le HTML.
   */
  $("#choose-video").addEventListener("click", () => {
    $("#video-file").click();
  });

  $("#video-file").addEventListener("change", (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (file.type && !file.type.startsWith("video/")) {
      $("#video-status").textContent =
        "Choisis un fichier vidéo.";

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
   * IMAGES INDISPONIBLES
   */
  $$("[data-product-image]").forEach((image) => {
    const container = image.closest(
      "[data-image-container], .product"
    );

    const fallback = container?.querySelector(
      ".image-fallback"
    );

    function showImageError() {
      image.style.opacity = "0";

      if (fallback) {
        fallback.hidden = false;
      }

      if (image.id === "monitor-image") {
        monitorImageValid = false;
        screen.classList.remove("ready");
        syncPlayback();
      }
    }

    function showLoadedImage() {
      image.style.opacity = "";

      if (fallback) {
        fallback.hidden = true;
      }

      if (image.id === "monitor-image") {
        monitorImageValid = true;

        if (video.readyState >= 2) {
          screen.classList.add("ready");
        }

        syncPlayback();
      }
    }

    image.addEventListener("error", showImageError);
    image.addEventListener("load", showLoadedImage);

    if (image.complete) {
      if (image.naturalWidth === 0) {
        showImageError();
      } else {
        showLoadedImage();
      }
    }
  });

  /*
   * ACTIVATION / DÉSACTIVATION DES ANIMATIONS
   */
  function applyMotion() {
    FX.setMotion(motion);

    $("#motion-toggle").setAttribute(
      "aria-pressed",
      String(motion)
    );

    $("#motion-toggle").setAttribute(
      "aria-label",
      motion
        ? "Désactiver les animations"
        : "Activer les animations"
    );

    wantsVideo =
      motion && !navigator.connection?.saveData;

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
   * OUVERTURE DE LA LISTE POUR LES PARENTS
   */
  $$("[data-open-list]").forEach((button) => {
    button.addEventListener("click", () => {
      if (dialog.open) return;

      previousOverflow = document.body.style.overflow;

      dialog.showModal();
      document.body.style.overflow = "hidden";

      FX.resetTilt();
      syncPlayback();
      FX.panel(dialog);
    });
  });

  dialog.addEventListener("close", () => {
    document.body.style.overflow = previousOverflow;
    syncPlayback();
  });

  /*
   * TEXTE COMMUN AUX BOUTONS COPIER ET PARTAGER
   */
  const listText = [
    "🎄 MA LISTE DE NOËL",
    "",
    "01 — UN PC GAMER COMPLET",
    "Avec la tour, l’écran, le clavier et la souris.",
    "La tour reste à choisir ensemble.",
    "",
    "JE PARTICIPE AUSSI",
    "Je paierai une partie du PC avec mon argent de poche.",
    "Le montant reste à préciser ensemble.",
    "",
    "ÉCRAN — AOC 27G4XED",
    `Prix repéré : ${euros(offers.screen.cents)}.`,
    "27 pouces, 180 Hz, Fast IPS, Full HD, 1 ms GtG.",
    offers.screen.url,
    "",
    "CLAVIER + SOURIS — LOGITECH SIGNATURE SLIM COMBO MK950",
    `Sur Amazon : ${euros(offers.combo.cents)} avec coupons.`,
    "Le pack comprend le clavier et la souris.",
    "Coloris indifférent : choisir le moins cher.",
    offers.combo.url,
    "",
    "02 — DES NOTHING EAR (3)",
    `Prix repéré : ${euros(offers.ears.cents)}.`,
    "Le modèle exact : Nothing Ear (3).",
    "Coloris à choisir ensemble.",
    offers.ears.url,
    "",
    `SOUS-TOTAL HORS TOUR DU PC : ${euros(totalCents)}`,
    "Écran + pack Logitech + écouteurs.",
    "Hors éventuels frais de livraison.",
    "",
    "Ce n’est pas le montant demandé à mes parents :",
    "ma participation au PC reste à définir.",
    "",
    "Prix et coupons à vérifier avant commande.",
    "Ce sont des idées, pas des obligations. Merci !"
  ].join("\n");

  /*
   * COPIE
   */
  $("#copy-list").addEventListener("click", async () => {
    try {
      if (!navigator.clipboard) {
        throw new Error("Copie automatique indisponible");
      }

      await navigator.clipboard.writeText(listText);

      $("#copy-fallback").hidden = true;

      $("#copy-status").textContent =
        "Liste copiée. Prête à envoyer.";
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
   * PARTAGE NATIF SI DISPONIBLE
   */
  if (typeof navigator.share === "function") {
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
  updatePrices();
  renderScene(0);
  applyMotion();
  FX.enter();
})();
