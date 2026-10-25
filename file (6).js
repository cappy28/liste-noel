(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);

  const $$ = (selector) => [
    ...document.querySelectorAll(selector)
  ];

  /*
   * Les animations restent dans ton fichier anime.js.
   * Ce remplacement minimal évite de bloquer les boutons
   * si ce fichier est indisponible.
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

  const screenPreview = $("#screen-preview");
  const screen = $("#monitor-screen");
  const video = $("#screen-video");

  const dialog = $("#wishlist");
  const choices = $$(".scene-choice");

  const motionPreference = matchMedia(
    "(prefers-reduced-motion: reduce)"
  );

  /*
   * PRIX REPÉRÉS ET LIENS
   * Les montants sont stockés en centimes.
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
   * LE SETUP EST MAINTENANT LE CADEAU PRINCIPAL.
   * L’ÉCRAN EST UN ÉLÉMENT DÉTAILLÉ DANS SA PROPRE CARTE.
   */
  const scenes = [
    {
      id: "setup",
      word: "PLAY.",

      category: "LE SETUP SOUS LE SAPIN",
      title: "Mon setup complet.",

      description:
        "La tour, l’écran et le pack clavier + souris. " +
        "Je paierai une partie du PC avec mon argent de poche.",

      tagLabel: "LA TOUR DU PC",
      tagValue: "À choisir",
      tagNote: "Je participe au paiement.",

      link: "#setup-details",
      linkLabel: "Voir les éléments du setup",
      internalLink: true,

      facts: [
        "Tour à choisir",
        "Écran AOC",
        "Clavier + souris Logitech"
      ],

      credit:
        "Image d’ambiance fournie pour le setup. " +
        "Les références choisies sont détaillées dans leurs cartes."
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
      internalLink: false,

      facts: [
        "Nothing Ear (3)",
        euros(offers.ears.cents),
        "Coloris à choisir"
      ],

      credit:
        "Visuel produit Nothing — coloris blanc présenté."
    }
  ];

  let activeScene = 0;
  let busy = false;

  let motion = !motionPreference.matches;

  let wantsVideo =
    motion && !navigator.connection?.saveData;

  let visualVisible = false;
  let monitorVisible = false;

  let videoFailed = false;
  let monitorImageValid = true;

  let localVideoURL = null;
  let previousOverflow = "";

  /*
   * PRIX ET LIENS DES CARTES
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
   * AFFICHAGE D’UN CADEAU
   *
   * Le dialogue des parents n’est pas concerné :
   * il conserve le récapitulatif complet.
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

    $("#photo-credit").textContent = scene.credit;

    const productLink = $("#product-link");

    productLink.href = scene.link;
    $("#product-link-label").textContent = scene.linkLabel;

    productLink.lastElementChild.textContent =
      scene.internalLink ? "↓" : "↗";

    if (scene.internalLink) {
      productLink.removeAttribute("target");
      productLink.removeAttribute("rel");
    } else {
      productLink.target = "_blank";
      productLink.rel = "noopener noreferrer";
    }

    const facts = scene.facts.map((text) => {
      const item = document.createElement("li");
      item.textContent = text;
      return item;
    });

    $("#product-facts").replaceChildren(...facts);

    /*
     * Tout le bloc écran + Logitech + participation
     * est masqué sur la scène des écouteurs.
     */
    showroom.querySelectorAll("[data-scene-only]").forEach((element) => {
      element.hidden =
        element.dataset.sceneOnly !== scene.id;
    });

    if (scene.id !== "setup") {
      video.pause();

      $("#setup-details").querySelectorAll("details").forEach((details) => {
        details.open = false;
      });
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
   * TRANSITION PAPIER CADEAU
   */
  async function changeScene(index, returnToProduct = false) {
    if (
      busy ||
      index === activeScene ||
      !scenes[index]
    ) {
      return;
    }

    const bounds = visual.getBoundingClientRect();

    const shouldReturn =
      returnToProduct &&
      (
        bounds.bottom < 100 ||
        bounds.top < -bounds.height * 0.4
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

      if (shouldReturn) {
        showroom.scrollIntoView({
          behavior: "auto",
          block: "start"
        });
      }

      await Promise.all([
        FX.enter(),
        FX.uncover()
      ]);

      $("#scene-announcement").textContent =
        scenes[index].title;
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
   * LIEN VERS LES ÉLÉMENTS DU SETUP
   */
  $("#product-link").addEventListener("click", (event) => {
    const href = event.currentTarget.getAttribute("href");

    if (!href?.startsWith("#")) return;

    const target = document.querySelector(href);

    if (!target) return;

    event.preventDefault();

    target.scrollIntoView({
      behavior: motion ? "smooth" : "auto",
      block: "start"
    });
  });

  /*
   * CLAVIER
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

    if (
      Math.abs(dx) > 60 &&
      Math.abs(dx) > Math.abs(dy) * 1.5
    ) {
      changeScene(activeScene === 0 ? 1 : 0);
    }
  });

  /*
   * VIDÉO : DÉSORMAIS DANS LA CARTE AOC
   *
   * La visibilité du grand visuel et celle de l’écran
   * sont suivies séparément.
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
    const pageInactive =
      document.hidden ||
      dialog.open;

    /*
     * Les animations d’ambiance se mettent en pause
     * quand le grand visuel n’est plus visible.
     */
    document.body.classList.toggle(
      "asleep",
      pageInactive || !visualVisible
    );

    /*
     * La vidéo dépend de sa propre carte,
     * pas du grand visuel du setup.
     */
    const shouldPlay =
      activeScene === 0 &&
      wantsVideo &&
      monitorVisible &&
      monitorImageValid &&
      !videoFailed &&
      !pageInactive &&
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
    const visualObserver = new IntersectionObserver(
      ([entry]) => {
        visualVisible = entry.isIntersecting;
        syncPlayback();
      },
      { threshold: 0.1 }
    );

    const screenObserver = new IntersectionObserver(
      ([entry]) => {
        monitorVisible = entry.isIntersecting;
        syncPlayback();
      },
      { threshold: 0.15 }
    );

    visualObserver.observe(visual);
    screenObserver.observe(screenPreview);
  } else {
    visualVisible = true;
    monitorVisible = true;
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
   * APERÇU D’UN GAMEPLAY LOCAL
   *
   * Le fichier sélectionné n’est pas envoyé à un serveur.
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
      "[data-image-container], .setup-photo-frame, .product"
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
   * COMMANDE GLOBALE DES ANIMATIONS
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
   * LISTE POUR LES PARENTS
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
