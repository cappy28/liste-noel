(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];

  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  );

  const finePointer = window.matchMedia(
    "(hover: hover) and (pointer: fine)"
  );

  const panels = {
    setup: $("#panel-setup"),
    ears: $("#panel-ears")
  };

  const buttons = $$("[data-panel]");
  const curtain = $("#transition");

  let activePanel = "setup";
  let changing = false;

  /*
   * CHANGEMENT DE CADEAU
   *
   * Le rideau couvre la page, on change de contenu,
   * puis il se retire. Pas de bibliothèque nécessaire.
   */

  async function changePanel(next) {
    if (!panels[next] || next === activePanel || changing) return;

    changing = true;
    pauseVideo();

    try {
      if (!reducedMotion.matches) {
        await curtain.animate(
          [
            { transform: "translateX(-101%)" },
            { transform: "translateX(0)" }
          ],
          {
            duration: 360,
            easing: "cubic-bezier(.76, 0, .24, 1)",
            fill: "forwards"
          }
        ).finished;
      }

      panels[activePanel].hidden = true;
      panels[next].hidden = false;
      activePanel = next;

      buttons.forEach((button) => {
        button.setAttribute(
          "aria-pressed",
          String(button.dataset.panel === next)
        );
      });

      window.scrollTo({ top: 0, behavior: "instant" });

      if (!reducedMotion.matches) {
        panels[next].querySelectorAll(
          ".hero-heading, .hero figure, .ears-picture, " +
          ".product-card, .ears-information"
        ).forEach((element, index) => {
          element.animate(
            [
              { opacity: 0, transform: "translateY(22px)" },
              { opacity: 1, transform: "translateY(0)" }
            ],
            {
              duration: 620,
              delay: Math.min(index * 85, 300),
              easing: "cubic-bezier(.22, 1, .36, 1)"
            }
          );
        });

        await curtain.animate(
          [
            { transform: "translateX(0)" },
            { transform: "translateX(101%)" }
          ],
          {
            duration: 480,
            easing: "cubic-bezier(.76, 0, .24, 1)",
            fill: "forwards"
          }
        ).finished;
      }
    } finally {
      curtain.style.transform = "translateX(-101%)";
      changing = false;
    }
  }

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      changePanel(button.dataset.panel);
    });
  });

  /*
   * DÉCOR DE NOËL : quelques lumières et flocons.
   */

  $$(".lights").forEach((garland) => {
    for (let i = 0; i < 12; i++) {
      const bulb = document.createElement("i");
      bulb.style.setProperty("--delay", `${i * -0.22}s`);
      garland.append(bulb);
    }
  });

  $$(".snow").forEach((snow) => {
    for (let i = 0; i < 16; i++) {
      const flake = document.createElement("i");

      flake.style.setProperty("--x", `${(i * 37) % 100}%`);
      flake.style.setProperty("--delay", `${-i * 0.8}s`);
      flake.style.setProperty("--duration", `${8 + (i % 6)}s`);
      flake.style.setProperty("--size", `${2 + (i % 3)}px`);

      snow.append(flake);
    }
  });

  /*
   * SOURIS LOGITECH
   *
   * Seul #mouse-move reçoit une transformation.
   * L’image .keyboard-image ne bouge jamais.
   */

  const comboVisual = $("#combo-visual");
  const mouse = $("#mouse-move");
  const mouseButton = $("#move-mouse");

  comboVisual.addEventListener("pointermove", (event) => {
    if (reducedMotion.matches || !finePointer.matches) return;

    const bounds = comboVisual.getBoundingClientRect();

    const x =
      (event.clientX - bounds.left) / bounds.width - 0.5;

    const y =
      (event.clientY - bounds.top) / bounds.height - 0.5;

    mouse.style.setProperty("--mouse-x", `${x * 24}px`);
    mouse.style.setProperty("--mouse-y", `${y * 16}px`);
    mouse.style.setProperty("--mouse-rotation", `${x * 8}deg`);
  });

  comboVisual.addEventListener("pointerleave", () => {
    mouse.style.setProperty("--mouse-x", "0px");
    mouse.style.setProperty("--mouse-y", "0px");
    mouse.style.setProperty("--mouse-rotation", "0deg");
  });

  mouseButton.addEventListener("click", () => {
    if (reducedMotion.matches) return;

    mouse.classList.remove("mouse-click");
    void mouse.offsetWidth;
    mouse.classList.add("mouse-click");
  });

  mouse.addEventListener("animationend", () => {
    mouse.classList.remove("mouse-click");
  });

  /*
   * VIDÉO DANS LA CARTE AOC
   */

  const video = $("#screen-video");
  const screen = $("#aoc-screen");
  const videoButton = $("#video-button");

  video.muted = true;

  function pauseVideo() {
    video.pause();
    videoButton.textContent = "Voir la vidéo ▶";
  }

  videoButton.addEventListener("click", async () => {
    if (!video.paused) {
      pauseVideo();
      return;
    }

    if (!video.getAttribute("src")) {
      video.src = video.dataset.src;
    }

    try {
      await video.play();

      screen.classList.add("is-playing");
      videoButton.textContent = "Mettre en pause Ⅱ";
    } catch {
      $("#video-note").textContent =
        "La vidéo ne démarre pas sur cet appareil.";
    }
  });

  video.addEventListener("error", () => {
    screen.classList.remove("is-playing");

    $("#video-note").textContent =
      "Vidéo indisponible pour le moment.";
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) pauseVideo();
  });

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) pauseVideo();
      },
      { threshold: 0.1 }
    ).observe($("#panel-setup"));
  }

  /*
   * SI UNE IMAGE MANQUE, ON LE DIT :
   * on ne la remplace pas par un faux produit.
   */

  $$("[data-image-stage] img").forEach((image) => {
    const stage = image.closest("[data-image-stage]");

    function showError() {
      stage.classList.add("missing");

      const message = stage.querySelector(".asset-error");
      if (message) message.hidden = false;
    }

    image.addEventListener("error", showError);

    if (image.complete && image.naturalWidth === 0) {
      showError();
    }
  });
})();
