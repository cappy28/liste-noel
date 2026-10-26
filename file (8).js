"use strict";
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const root = document.documentElement;

/* ===== À modifier ici ===== */
const PRIX = { aoc: 99.99, logi: 70.5, ear: 119 };
const PARTICIPATION = null; // ex : 150 pour « 150 € »

const LIENS = {
  tour: "https://www.bequiet.com/fr/case/5322",
  aoc: "https://www.aoc.com/fr/gaming/monitors/27g4xed",
  logi: "https://www.amazon.fr/dp/B0CTQN69N1",
  ear: "https://fr.nothing.tech/products/ear-3",
};

const eur = (n) => {
  const d = Math.round(n * 100) % 100 ? 2 : 0;
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: d, maximumFractionDigits: d }).format(n);
};
const totalSetup = PRIX.aoc + PRIX.logi;
const totalAll = totalSetup + PRIX.ear;
const part = PARTICIPATION ? eur(PARTICIPATION) : "à préciser ensemble";

$$("[data-price-of]").forEach((e) => (e.textContent = eur(PRIX[e.dataset.priceOf])));
$$('[data-total="setup"]').forEach((e) => (e.textContent = eur(totalSetup)));
$$('[data-total="all"]').forEach((e) => (e.textContent = eur(totalAll)));
$$("[data-participation]").forEach((e) => (e.textContent = part));

let motion = !root.classList.contains("no-motion");
const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;

/* ===== Neige (canvas léger) ===== */
const snow = (() => {
  const c = $(".snow"), x = c.getContext("2d");
  let flakes = [], raf = 0, w = 0, h = 0;
  function size() {
    const d = Math.min(devicePixelRatio || 1, 2);
    w = innerWidth; h = innerHeight;
    c.width = w * d; c.height = h * d;
    x.setTransform(d, 0, 0, d, 0, 0);
    flakes = Array.from({ length: w < 700 ? 26 : 50 }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      r: 1 + Math.random() * 2.2, s: 0.3 + Math.random() * 0.7, o: Math.random() * 6,
    }));
  }
  function tick(t) {
    x.clearRect(0, 0, w, h);
    x.fillStyle = "rgba(255,255,255,.85)";
    x.beginPath();
    for (const p of flakes) {
      p.y += p.s;
      p.x += Math.sin(t / 1600 + p.o) * 0.3;
      if (p.y > h + 4) { p.y = -4; p.x = Math.random() * w; }
      x.moveTo(p.x + p.r, p.y);
      x.arc(p.x, p.y, p.r, 0, 7);
    }
    x.fill();
    raf = requestAnimationFrame(tick);
  }
  let lastW = 0;
  addEventListener("resize", () => { if (raf && innerWidth !== lastW) { lastW = innerWidth; size(); } });
  return {
    start() { if (raf) return; lastW = innerWidth; size(); raf = requestAnimationFrame(tick); },
    stop() { cancelAnimationFrame(raf); raf = 0; x.clearRect(0, 0, w, h); },
  };
})();
document.addEventListener("visibilitychange", () => (document.hidden || !motion ? snow.stop() : snow.start()));

/* ===== Vidéo dans l'écran ===== */
const video = (() => {
  const v = $(".screen__video"), btn = $("[data-video-toggle]"), credit = $("[data-video-credit]");
  if (!v) return { pause() {} };
  v.muted = true;
  const list = v.dataset.sources.split(" ");
  let i = -1, want = false, userOff = false;

  function next() {
    i++;
    if (i >= list.length) { v.remove(); btn.hidden = true; return; }
    v.src = list[i];
    v.load();
  }
  v.addEventListener("error", next); // avec src direct, l'erreur arrive bien sur <video>
  v.addEventListener("loadeddata", () => {
    v.classList.add("is-ready");
    credit.hidden = !/sintel/i.test(v.currentSrc);
    if (want) v.play().catch(() => {});
  });
  const ui = (on) => { btn.textContent = on ? "Pause" : "Lire"; btn.setAttribute("aria-label", on ? "Mettre la vidéo en pause" : "Lire la vidéo"); };
  v.addEventListener("play", () => ui(true));
  v.addEventListener("pause", () => ui(false));

  function play() { want = true; if (i < 0) next(); else v.play().catch(() => {}); }
  function pause() { want = false; v.pause(); }

  btn.addEventListener("click", () => {
    if (v.paused) { userOff = false; play(); } else { userOff = true; pause(); }
  });
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting && motion && !userOff) play();
    else if (!e.isIntersecting) pause();
  }, { threshold: 0.35 }).observe(v.parentNode);
  return { pause };
})();

/* ===== Bouton animations ===== */
const mBtn = $("[data-motion]");
function setMotion(on, save) {
  motion = on;
  root.classList.toggle("no-motion", !on);
  mBtn.setAttribute("aria-pressed", String(on));
  if (save) try { localStorage.setItem("motion", on ? "on" : "off"); } catch (e) {}
  if (on) snow.start(); else { snow.stop(); video.pause(); }
}
mBtn.addEventListener("click", () => setMotion(!motion, true));

/* ===== Lettres PLAY. / SOUND. ===== */
function replayWords() {
  $$(".word").forEach((w) => { w.classList.remove("is-on"); void w.offsetWidth; w.classList.add("is-on"); });
}

/* ===== Changement de page + rideau ===== */
const curtain = $(".curtain");
let busy = false;
function show(scene, push = true) {
  if (busy || scene === root.dataset.scene) return;
  const swap = () => {
    root.dataset.scene = scene;
    $('meta[name="theme-color"]').content = scene === "ear" ? "#ed8269" : "#b7cef1";
    $$(".switch a").forEach((a) => (a.dataset.go === scene ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current")));
    window.scrollTo({ top: 0, behavior: "instant" });
    if (push) history.pushState(null, "", "#" + scene);
    replayWords();
    $("#" + scene + "-title").focus({ preventScroll: true });
  };
  if (!motion) return swap();
  busy = true;
  curtain.hidden = false;
  void curtain.offsetWidth;
  curtain.classList.add("is-closed");
  setTimeout(() => { swap(); curtain.classList.remove("is-closed"); }, 850);
  setTimeout(() => { curtain.hidden = true; busy = false; }, 1600);
}
document.addEventListener("click", (e) => {
  const a = e.target.closest("[data-go]");
  if (!a) return;
  e.preventDefault();
  show(a.dataset.go);
});
addEventListener("popstate", () => {
  const h = location.hash.slice(1);
  if (h === "ear" || h === "setup") show(h, false);
});

/* Balayage horizontal sur téléphone */
let sx = 0, sy = 0;
document.addEventListener("touchstart", (e) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
document.addEventListener("touchend", (e) => {
  if (e.target.closest("dialog, .logi, .screen")) return;
  const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
  if (Math.abs(dx) > 90 && Math.abs(dy) < 50) show(dx < 0 ? "ear" : "setup");
}, { passive: true });

/* ===== Inclinaison du produit (souris uniquement) ===== */
if (finePointer) {
  $$(".hero").forEach((hero) => {
    const t = $(".hero__tilt", hero);
    hero.addEventListener("pointermove", (e) => {
      if (!motion) return;
      const r = hero.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
      t.style.setProperty("--ry", (px * 14).toFixed(2) + "deg");
      t.style.setProperty("--rx", (-py * 10).toFixed(2) + "deg");
    });
    hero.addEventListener("pointerleave", () => { t.style.setProperty("--rx", "0deg"); t.style.setProperty("--ry", "0deg"); });
  });
}

/* ===== Apparitions au scroll + souris Logitech + boîtier ===== */
const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (e.target.matches(".reveal") && e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
    if (e.target.matches("[data-logi]")) e.target.classList.toggle("is-live", e.isIntersecting);
  });
}, { threshold: 0.2 });
$$(".reveal, [data-logi]").forEach((el) => io.observe(el));

const mouse = $(".logi__mouse");
mouse.addEventListener("pointerdown", () => {
  mouse.classList.remove("is-click"); void mouse.offsetWidth; mouse.classList.add("is-click");
});

const caseBox = $("[data-case]"), caseBtn = $("[data-case-toggle]"), caseImg = $(".case__inside");
function setCase(open) {
  caseBox.classList.toggle("is-open", open);
  caseBtn.textContent = open ? "Remettre le panneau" : "Retirer le panneau";
  caseBtn.setAttribute("aria-pressed", String(open));
}
caseBtn.addEventListener("click", () => setCase(!caseBox.classList.contains("is-open")));
const fitCase = () => { if (caseImg.naturalWidth) caseImg.parentNode.style.aspectRatio = caseImg.naturalWidth + "/" + caseImg.naturalHeight; };
caseImg.complete ? fitCase() : caseImg.addEventListener("load", fitCase);
new IntersectionObserver(([e], o) => {
  if (e.isIntersecting) { o.disconnect(); if (motion) setTimeout(() => setCase(true), 700); }
}, { threshold: 0.6 }).observe(caseBox);

/* ===== Ma liste : dialog, copier, partager ===== */
const dlg = $("#liste"), status = $(".sheet__status");
$$("[data-open-list]").forEach((b) => b.addEventListener("click", () => {
  status.textContent = "";
  dlg.showModal ? dlg.showModal() : dlg.setAttribute("open", "");
}));
dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });

const texte = () => [
  "🎄 Ma liste de Noël",
  "",
  `PC gamer (je participe avec mon argent de poche : ${part})`,
  `- Tour PC : be quiet! Pure Base 501 Airflow + composants, à choisir ensemble : ${LIENS.tour}`,
  `- Écran AOC Gaming 27G4XED : ${eur(PRIX.aoc)} : ${LIENS.aoc}`,
  `- Logitech MK950, coloris le moins cher (avec coupons, Amazon) : ${eur(PRIX.logi)} : ${LIENS.logi}`,
  "",
  `- Nothing Ear (3), coloris à choisir : ${eur(PRIX.ear)} : ${LIENS.ear}`,
  "",
  `Total des prix repérés : ${eur(totalAll)} (hors tour du PC et livraison, prix à vérifier).`,
  "Ce n'est pas le montant que je vous demande.",
  "Ce sont des idées, pas des obligations. Merci !",
].join("\n");

async function copy() {
  try { await navigator.clipboard.writeText(texte()); }
  catch {
    const t = document.createElement("textarea");
    t.value = texte(); t.setAttribute("readonly", ""); t.style.position = "fixed"; t.style.opacity = "0";
    dlg.append(t); t.select(); document.execCommand("copy"); t.remove();
  }
  status.textContent = "Liste copiée ✓";
}
$("[data-copy]").addEventListener("click", copy);
$("[data-share]").addEventListener("click", async () => {
  if (navigator.share) {
    try { await navigator.share({ title: "Ma liste de Noël", text: texte() }); status.textContent = "Partagé ✓"; }
    catch (e) { if (e.name !== "AbortError") copy(); }
  } else copy();
});

/* ===== Démarrage ===== */
mBtn.setAttribute("aria-pressed", String(motion));
if (root.dataset.scene === "ear") {
  $$(".switch a").forEach((a) => (a.dataset.go === "ear" ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current")));
  $('meta[name="theme-color"]').content = "#ed8269";
}
replayWords();
if (motion) snow.start();
