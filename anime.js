(() => {
  "use strict";

  const motionPreference = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  );

  const finePointer = window.matchMedia(
    "(hover: hover) and (pointer: fine)"
  );

  const monitor = document.querySelector("#monitor");
  const tilt = document.querySelector("#monitor-tilt");
  const video = document.querySelector("#screen-video");

  const playButton = document.querySelector("#play-button");
  const chooseButton = document.querySelector("#choose-button");
  const fileInput = document.querySelector("#video-file");
  const videoNote = document.querySelector("#video-note");

  /*
   * ANIMATIONS
   *
   * Le contenu reste visible si la bibliothèque ne charge pas.
   */

  if (window.anime && !motionPreference.matches) {
    const { animate, stagger } = window.anime;

    animate("[data-intro]", {
      opacity: { from: 0, to: 1 },
      translateY: { from: 28, to: 0 },
      delay: stagger(110),
      duration: 1000,
      ease: "outCubic"
    });

    if ("IntersectionObserver" in window) {
      const revealObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;

            if (!motionPreference.matches) {
              animate(entry.target, {
                opacity: { from: 0, to: 1 },
                translateY: { from: 36, to: 0 },
                duration: 1100,
                ease: "outCubic"
              });
            }

            revealObserver.unobserve(entry.target);
          });
        },
        { threshold: 0.12 }
      );

      document.querySelectorAll(".reveal").forEach((element) => {
        revealObserver.observe(element);
      });
    }
  }

  /*
   * INCLINAISON DU VRAI VISUEL
   *
   * La vidéo est dans le même conteneur :
   * elle ne se décale pas par rapport à la dalle.
   */

  let tiltFrame;

  tilt.addEventListener("pointermove", (event) => {
    if (motionPreference.matches || !finePointer.matches) return;

    const bounds = tilt.getBoundingClientRect();

    const horizontal =
      (event.clientX - bounds.left) / bounds.width - 0.5;

    const vertical =
      (event.clientY - bounds.top) / bounds.height - 0.5;

    cancelAnimationFrame(tiltFrame);

    tiltFrame = requestAnimationFrame(() => {
      tilt.style.transform = `
        perspective(1400px)
        rotateX(${-vertical * 5}deg)
        rotateY(${horizontal * 8}deg)
      `;
    });
  });

  function resetTilt() {
    cancelAnimationFrame(tiltFrame);

    tilt.style.transform = `
      perspective(1400px)
      rotateX(0deg)
      rotateY(0deg)
    `;
  }

  tilt.addEventListener("pointerleave", resetTilt);

  /*
   * VIDÉO
   *
   * Lecture automatique seulement si :
   * - l’écran est visible ;
   * - la page est active ;
   * - les mouvements réduits ne sont pas demandés.
   *
   * Une action explicite permet toujours de lancer la lecture.
   */

  let wantsPlayback = !motionPreference.matches;
  let monitorVisible = false;
  let localVideoUrl = null;

  video.muted = true;

  function updatePlayButton() {
    playButton.textContent = video.paused
      ? "Lire la vidéo"
      : "Mettre en pause";
  }

  function syncPlayback() {
    const shouldPlay =
      wantsPlayback &&
      monitorVisible &&
      !document.hidden;

    if (!shouldPlay) {
      video.pause();
      return;
    }

    const playRequest = video.play();

    if (playRequest) {
      playRequest.catch((error) => {
        // Une pause pendant le chargement peut interrompre play().
        if (error.name === "AbortError") return;

        updatePlayButton();
      });
    }
  }

  video.addEventListener("loadeddata", () => {
    monitor.classList.add("is-ready");
    playButton.disabled = false;
    syncPlayback();
  });

  video.addEventListener("play", updatePlayButton);
  video.addEventListener("pause", updatePlayButton);

  video.addEventListener("error", () => {
    monitor.classList.remove("is-ready");
    playButton.disabled = true;

    videoNote.textContent =
      "Vidéo indisponible. Tu peux choisir un fichier MP4 compatible.";
  });

  if ("IntersectionObserver" in window) {
    const videoObserver = new IntersectionObserver(
      (entries) => {
        monitorVisible = entries[0].isIntersecting;
        syncPlayback();
      },
      { threshold: 0.15 }
    );

    videoObserver.observe(monitor);
  } else {
    monitorVisible = true;
    syncPlayback();
  }

  document.addEventListener("visibilitychange", syncPlayback);

  playButton.addEventListener("click", () => {
    wantsPlayback = video.paused;
    syncPlayback();
  });

  motionPreference.addEventListener("change", () => {
    resetTilt();

    // On arrête la lecture si cette préférence vient d’être activée.
    if (motionPreference.matches) {
      wantsPlayback = false;
    }

    syncPlayback();
  });

  /*
   * APERÇU D’UNE VIDÉO PERSONNELLE
   *
   * Le fichier sélectionné reste sur l’appareil :
   * aucun envoi vers un serveur.
   */

  chooseButton.addEventListener("click", () => {
    fileInput.click();
  });

  fileInput.addEventListener("change", () => {
    const file = fileInput.files?.[0];

    if (!file) return;

    if (file.type && !file.type.startsWith("video/")) {
      videoNote.textContent = "Choisis un fichier vidéo.";
      fileInput.value = "";
      return;
    }

    video.pause();
    monitor.classList.remove("is-ready");
    playButton.disabled = false;

    if (localVideoUrl) {
      URL.revokeObjectURL(localVideoUrl);
    }

    localVideoUrl = URL.createObjectURL(file);

    video.src = localVideoUrl;
    video.load();

    // Le choix du fichier constitue une action volontaire.
    wantsPlayback = true;

    videoNote.textContent =
      `Vidéo personnelle : ${file.name}. ` +
      "Aperçu local, non enregistré dans le site.";

    syncPlayback();
    fileInput.value = "";
  });

  window.addEventListener("pagehide", () => {
    video.pause();
  });

  window.addEventListener("pageshow", syncPlayback);
})();
