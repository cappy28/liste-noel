"use strict";
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const root = document.documentElement;
const qs = new URLSearchParams(location.search);

/* ===== À modifier ici ===== */
const PRIX = { aoc: 99.99, logi: 70.5, ear: 119 };
const BUDGET_TOUR = 850;   // tour seule
const PARTICIPATION = 600; // mon argent de poche
const SIGNATURE = "Moi";   // ton prénom pour signer le petit mot
const SON = true;          // clochettes (false = muet)

const LIENS = {
  tour: "https://www.bequiet.com/fr/case/5322",
  aoc: "https://www.aoc.com/fr/gaming/monitors/27g4xed",
  logi: "https://www.amazon.fr/dp/B0CTQN69N1",
  ear: "https://fr.nothing.tech/products/ear-3",
};

const AVENT = [
  ["🎄", "C'est parti ! Plus que 24 jours avant Noël."],
  ["🦌", "Avec Rudolph, le Père Noël a 9 rennes pour tirer son traîneau."],
  ["✉️", "En France, les lettres au Père Noël reçoivent une réponse depuis 1962, depuis Libourne."],
  ["🎮", "Le Père Noël joue en 180 Hz. Sinon, impossible de livrer toute la planète en une nuit."],
  ["🌲", "Le sapin décoré viendrait d'Alsace : on en parle à Sélestat dès 1521."],
  ["🍫", "Le 6 décembre, c'est la Saint-Nicolas, très fêtée dans l'Est de la France."],
  ["🔔", "Jingle Bells est l'une des premières chansons jouées dans l'espace, en 1965."],
  ["🕯️", "Le 8 décembre, Lyon fête la Fête des Lumières."],
  ["⛄", "Rappel : zéro avertissement. Promis."],
  ["🎶", "Douce nuit a été chantée pour la première fois en 1818, en Autriche."],
  ["🍗", "Au Japon, beaucoup de familles mangent du poulet frit à Noël."],
  ["🧝", "En Islande, 13 lutins farceurs passent pendant les 13 nuits avant Noël."],
  ["🧦", "Aux États-Unis, on suspend des chaussettes à la cheminée pour les cadeaux."],
  ["⛵", "Aux Pays-Bas, Sinterklaas arrive en bateau, venu d'Espagne."],
  ["🖥️", "Un écran 180 Hz affiche 3 fois plus d'images par seconde qu'un écran 60 Hz."],
  ["🌟", "L'étoile en haut du sapin rappelle celle qui guidait les Rois mages."],
  ["🍯", "En Provence, on sert 13 desserts à Noël."],
  ["🎅", "Le Père Noël était déjà habillé en rouge avant les pubs Coca-Cola des années 1930."],
  ["🕯️", "La couronne de l'Avent a 4 bougies : une pour chaque dimanche avant Noël."],
  ["🦃", "La dinde vient d'Amérique : elle est arrivée en Europe au XVIᵉ siècle."],
  ["❄️", "Vers le 21 décembre, c'est le solstice d'hiver : la nuit la plus longue de l'année."],
  ["🪵", "La bûche de Noël vient d'une vraie bûche qu'on faisait brûler dans la cheminée."],
  ["🎧", "Avant-veille de Noël : plus que 2 dodos !"],
  ["✨", "C'est le réveillon ! Bonne soirée à tous."],
  ["🎁", "Joyeux Noël ! Merci pour tout ♥"],
];

/* ===== Prix ===== */
const eur = (n) => {
  const d = Math.round(n * 100) % 100 ? 2 : 0;
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: d, maximumFractionDigits: d }).format(n);
};
const reste = Math.max(BUDGET_TOUR - PARTICIPATION, 0);
const VAL = { ...PRIX, tour: BUDGET_TOUR, part: PARTICIPATION, reste, setup: reste + PRIX.aoc + PRIX.logi };
VAL.all = VAL.setup + PRIX.ear;
$$("[data-eur]").forEach((e) => (e.textContent = eur(VAL[e.dataset.eur])));
$$("[data-sign]").forEach((e) => (e.textContent = SIGNATURE));

let motion = !root.classList.contains("no-motion");
const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
const meta = $('meta[name="theme-color"]');
const setTheme = () => (meta.content = getComputedStyle(root).getPropertyValue("--bg").trim() || "#b7cef1");

/* ===== Compte à rebours + mode nuit (vérifiés chaque minute) ===== */
function countdown() {
  const n = new Date(), today = new Date(n.getFullYear(), n.getMonth(), n.getDate());
  let xmas = new Date(n.getFullYear(), 11, 25);
  if (today > xmas) xmas = new Date(n.getFullYear() + 1, 11, 25);
  const d = Math.round((xmas - today) / 864e5);
  const txt = d === 0 ? "Aujourd'hui · " : d === 1 ? "Demain · " : `J-${d} · `;
  $$("[data-countdown]").forEach((e) => { e.textContent = txt; e.parentNode.title = d ? `Plus que ${d} jour${d > 1 ? "s" : ""} avant Noël` : "C'est Noël !"; });
}
function nightCheck() {
  if (qs.has("nuit") || qs.has("jour")) return;
  const h = new Date().getHours();
  root.classList.toggle("night", h >= 20 || h < 6);
}
setInterval(() => { countdown(); nightCheck(); setTheme(); }, 60000);

/* ===== Son (clochette + musique) ===== */
let ac;
function audio() {
  try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === "suspended") ac.resume(); return ac; }
  catch (e) { return null; }
}
function bell(m = 1) {
  const c = SON && audio(); if (!c) return;
  const t = c.currentTime;
  [[1568, 0.09], [3136, 0.04], [4700, 0.02]].forEach(([f, vol], k) => {
    const o = c.createOscillator(), g = c.createGain();
    o.frequency.value = f * m;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6 / (k + 1));
    o.connect(g).connect(c.destination);
    o.start(t); o.stop(t + 1.7);
  });
}

const music = (() => {
  const btn = $("[data-music]");
  const N = { C: 523.25, D: 587.33, E: 659.25, F: 698.46, G: 783.99 };
  const SONG = ("E1 E1 E2 E1 E1 E2 E1 G1 C1.5 D.5 E4 F1 F1 F1.5 F.5 F1 E1 E1 E.5 E.5 E1 D1 D1 E1 D2 G2 " +
    "E1 E1 E2 E1 E1 E2 E1 G1 C1.5 D.5 E4 F1 F1 F1 F1 F1 E1 E1 E.5 E.5 G1 G1 F1 D1 C4")
    .split(" ").map((s) => [N[s[0]], parseFloat(s.slice(1))]);
  const BEAT = 0.42;
  let on = false, master = null, timer = 0, wasOn = false;

  function note(c, out, f, t, len) {
    [[f, 0.08], [f * 2, 0.02], [f / 2, 0.025]].forEach(([fr, v]) => {
      const o = c.createOscillator(), g = c.createGain();
      o.type = "sine"; o.frequency.value = fr;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(v, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(len, 0.3) + 0.5);
      o.connect(g).connect(out);
      o.start(t); o.stop(t + len + 0.6);
    });
  }
  function loop() {
    const c = ac, m = master; if (!on || !m) return;
    let t = c.currentTime + 0.1;
    SONG.forEach(([f, b]) => { note(c, m, f, t, b * BEAT); t += b * BEAT; });
    timer = setTimeout(loop, (t - c.currentTime + BEAT * 2) * 1000);
  }
  const ui = () => { btn.setAttribute("aria-pressed", String(on)); root.classList.toggle("music-on", on); };
  function start() {
    const c = audio(); if (!c) return;
    on = true; master = c.createGain(); master.gain.value = 0.6; master.connect(c.destination);
    loop(); ui();
  }
  function stop() {
    on = false; clearTimeout(timer);
    if (master) { const m = master; m.gain.setTargetAtTime(0, ac.currentTime, 0.08); setTimeout(() => m.disconnect(), 500); master = null; }
    ui();
  }
  btn.addEventListener("click", () => (on ? stop() : start()));
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { wasOn = on; if (on) stop(); }
    else if (wasOn) { wasOn = false; start(); }
  });
})();

/* ===== Neige (+ tempête dorée) ===== */
const snow = (() => {
  const c = $(".snow"), x = c.getContext("2d");
  let flakes = [], extra = [], raf = 0, w = 0, h = 0, lastW = 0, stormEnd = 0;
  const mk = () => ({ x: Math.random() * w, y: Math.random() * h, r: 1 + Math.random() * 2.2, s: 0.3 + Math.random() * 0.7, o: Math.random() * 6 });
  function size() {
    const d = Math.min(devicePixelRatio || 1, 2);
    w = innerWidth; h = innerHeight; c.width = w * d; c.height = h * d;
    x.setTransform(d, 0, 0, d, 0, 0);
    flakes = Array.from({ length: w < 700 ? 26 : 50 }, mk);
  }
  function draw(list, t, k) {
    for (const p of list) {
      p.y += p.s * k; p.x += Math.sin(t / 1600 + p.o) * 0.3 * k;
      if (p.y > h + 4) { p.y = -4; p.x = Math.random() * w; }
      x.moveTo(p.x + p.r, p.y); x.arc(p.x, p.y, p.r, 0, 7);
    }
  }
  function tick(t) {
    const storm = t < stormEnd;
    if (!storm && extra.length) extra = [];
    x.clearRect(0, 0, w, h);
    x.fillStyle = storm ? "rgba(231,184,74,.95)" : "rgba(255,255,255,.85)";
    x.beginPath(); draw(flakes, t, storm ? 3 : 1); draw(extra, t, 3); x.fill();
    raf = requestAnimationFrame(tick);
  }
  addEventListener("resize", () => { if (raf && innerWidth !== lastW) { lastW = innerWidth; size(); } });
  return {
    start() { if (raf) return; lastW = innerWidth; size(); raf = requestAnimationFrame(tick); },
    stop() { cancelAnimationFrame(raf); raf = 0; x.clearRect(0, 0, w, h); },
    storm(ms) { if (!raf) return; extra = Array.from({ length: w < 700 ? 60 : 120 }, mk); stormEnd = performance.now() + ms; },
  };
})();

/* ===== Confettis ===== */
const confetti = (() => {
  const c = $(".fx"), x = c.getContext("2d"), COLORS = ["#e7b84a", "#b63830", "#4fb37a", "#f3efe5"];
  let parts = [], raf = 0;
  function size() { const d = Math.min(devicePixelRatio || 1, 2); c.width = innerWidth * d; c.height = innerHeight * d; x.setTransform(d, 0, 0, d, 0, 0); }
  function tick() {
    x.clearRect(0, 0, innerWidth, innerHeight);
    parts = parts.filter((p) => p.y < innerHeight + 20);
    for (const p of parts) {
      p.vy += 0.25; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.a += p.va;
      x.save(); x.translate(p.x, p.y); x.rotate(p.a); x.fillStyle = p.c; x.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); x.restore();
    }
    raf = parts.length ? requestAnimationFrame(tick) : 0;
  }
  return (el) => {
    if (!motion) return;
    const r = el.getBoundingClientRect(), ox = r.left + r.width / 2, oy = r.top + r.height / 2;
    if (!raf) size();
    for (let i = 0; i < 140; i++) {
      const a = Math.random() * Math.PI * 2, v = 4 + Math.random() * 9;
      parts.push({ x: ox, y: oy, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 6, a: Math.random() * 6, va: (Math.random() - 0.5) * 0.4, s: 6 + Math.random() * 8, c: COLORS[i % 4] });
    }
    if (!raf) raf = requestAnimationFrame(tick);
  };
})();

/* ===== Souris Logitech + curseur dans l'écran ===== */
const sync = (() => {
  const m = $(".logi__mouse"), c = $(".cursor"), vis = { logi: false, screen: false };
  let raf = 0, last = 0;
  const path = (s) => ({ x: Math.sin(s * 0.8) * 0.65 + Math.sin(s * 1.9) * 0.35, y: Math.sin(s * 1.1 + 1) * 0.6 + Math.cos(s * 0.6) * 0.4 });
  function click() { [m, c].forEach((e) => { e.classList.remove("is-click"); void e.offsetWidth; e.classList.add("is-click"); }); }
  function tick(t) {
    const p = path(t / 1000);
    m.style.transform = `translate(${(p.x * 40).toFixed(1)}%,${(p.y * 22).toFixed(1)}%) rotate(${(p.x * -6).toFixed(1)}deg)`;
    c.style.left = (50 + p.x * 38).toFixed(2) + "%";
    c.style.top = (48 + p.y * 36).toFixed(2) + "%";
    if (t - last > 3600) { last = t; click(); }
    raf = requestAnimationFrame(tick);
  }
  function update() {
    const run = motion && !document.hidden && (vis.logi || vis.screen);
    if (run && !raf) raf = requestAnimationFrame(tick);
    else if (!run && raf) { cancelAnimationFrame(raf); raf = 0; }
    if (!motion) m.style.transform = "";
  }
  m.addEventListener("pointerdown", click);
  return { vis, update };
})();

/* ===== Vidéo dans l'écran ===== */
const video = (() => {
  const v = $(".screen__video"), screen = $(".screen"), btn = $("[data-video-toggle]"), credit = $("[data-video-credit]");
  if (!v) return { pause() {} };
  v.muted = true;
  const list = v.dataset.sources.split(" ");
  let i = -1, want = false, userOff = false;
  function next() {
    i++;
    if (i >= list.length) { v.remove(); $(".screen__on")?.remove(); btn.hidden = true; return; }
    v.src = list[i]; v.load();
  }
  v.addEventListener("error", next);
  v.addEventListener("loadeddata", () => {
    v.classList.add("is-ready");
    credit.hidden = !/sintel/i.test(v.currentSrc);
    if (want) v.play().catch(() => {});
  });
  v.addEventListener("playing", () => screen.classList.add("is-on"));
  const ui = (on) => { btn.textContent = on ? "Pause" : "Lire"; btn.setAttribute("aria-label", on ? "Mettre la vidéo en pause" : "Lire la vidéo"); };
  v.addEventListener("play", () => ui(true));
  v.addEventListener("pause", () => ui(false));
  function play() { want = true; if (i < 0) next(); else v.play().catch(() => {}); }
  function pause() { want = false; v.pause(); }
  btn.addEventListener("click", () => { if (v.paused) { userOff = false; play(); } else { userOff = true; pause(); } });
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting && motion && !userOff) play();
    else if (!e.isIntersecting) pause();
  }, { threshold: 0.35 }).observe(screen);
  return { pause };
})();

/* ===== Bouton animations ===== */
const mBtn = $("[data-motion]");
function setMotion(on, save) {
  motion = on;
  root.classList.toggle("no-motion", !on);
  mBtn.setAttribute("aria-pressed", String(on));
  if (save) try { localStorage.setItem("motion", on ? "on" : "off"); } catch (e) {}
  if (on) snow.start(); else { snow.stop(); video.pause(); openIntro(); }
  sync.update();
}
mBtn.addEventListener("click", () => setMotion(!motion, true));
document.addEventListener("visibilitychange", () => {
  document.hidden || !motion ? snow.stop() : snow.start();
  sync.update();
});

/* ===== Lettres PLAY. / SOUND. ===== */
function replayWords() {
  $$(".word").forEach((w) => { w.classList.remove("is-on"); void w.offsetWidth; w.classList.add("is-on"); });
}

/* ===== Ouverture cadeau ===== */
const intro = $(".curtain--intro");
let busy = false;
function openIntro() {
  if (!intro || !intro.isConnected || intro.classList.contains("is-opening")) return;
  intro.classList.add("is-opening");
  intro.classList.remove("is-closed");
  replayWords();
  setTimeout(() => { intro.remove(); busy = false; }, 1300);
}

/* ===== Changement de page ===== */
const curtain = $(".curtain--page");
function show(scene, push = true) {
  if (busy || scene === root.dataset.scene) return;
  const swap = () => {
    root.dataset.scene = scene;
    setTheme();
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

let sx = 0, sy = 0;
document.addEventListener("touchstart", (e) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
document.addEventListener("touchend", (e) => {
  if (e.target.closest("dialog, .logi, .screen, .bauble, .advent")) return;
  const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
  if (Math.abs(dx) > 90 && Math.abs(dy) < 50) show(dx < 0 ? "ear" : "setup");
}, { passive: true });

/* ===== Inclinaison (souris d'ordi) ===== */
if (finePointer) {
  $$(".hero").forEach((hero) => {
    const t = $(".hero__tilt", hero);
    hero.addEventListener("pointermove", (e) => {
      if (!motion) return;
      const r = hero.getBoundingClientRect();
      t.style.setProperty("--ry", (((e.clientX - r.left) / r.width - 0.5) * 14).toFixed(2) + "deg");
      t.style.setProperty("--rx", (-((e.clientY - r.top) / r.height - 0.5) * 10).toFixed(2) + "deg");
    });
    hero.addEventListener("pointerleave", () => { t.style.setProperty("--rx", "0deg"); t.style.setProperty("--ry", "0deg"); });
  });
}

/* ===== Apparitions au scroll ===== */
const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (e.target.matches(".reveal") && e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
    if (e.target.matches("[data-logi]")) { sync.vis.logi = e.isIntersecting; sync.update(); }
    if (e.target.matches(".screen")) { sync.vis.screen = e.isIntersecting; sync.update(); }
  });
}, { threshold: 0.2 });
$$(".reveal, [data-logi], .screen").forEach((el) => io.observe(el));

/* ===== Boîtier ===== */
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

/* ===== Code secret (Konami sur PC, 5 touches sur la boule) ===== */
const toast = $(".toast");
let toastT;
function secret() {
  toast.hidden = false;
  toast.classList.remove("is-in"); void toast.offsetWidth; toast.classList.add("is-in");
  clearTimeout(toastT);
  toastT = setTimeout(() => { toast.classList.remove("is-in"); toastT = setTimeout(() => (toast.hidden = true), 500); }, 5500);
  snow.storm(6000);
  confetti(toast);
  [1, 1.26, 1.5].forEach((m, k) => setTimeout(() => bell(m), k * 130));
}
const KONAMI = "ArrowUp ArrowUp ArrowDown ArrowDown ArrowLeft ArrowRight ArrowLeft ArrowRight b a".split(" ");
let kPos = 0;
addEventListener("keydown", (e) => {
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  kPos = k === KONAMI[kPos] ? kPos + 1 : k === KONAMI[0] ? 1 : 0;
  if (kPos === KONAMI.length) { kPos = 0; secret(); }
});

/* ===== Boule de Noël ===== */
let taps = [];
$$(".bauble").forEach((b) => {
  b.addEventListener("click", () => {
    b.classList.remove("is-ring"); void b.offsetWidth; b.classList.add("is-ring"); bell();
    const now = Date.now();
    taps = [...taps.filter((t) => now - t < 2500), now];
    if (taps.length >= 5) { taps = []; secret(); }
  });
  b.addEventListener("animationend", (e) => { if (e.animationName === "ring") b.classList.remove("is-ring"); });
});

/* ===== Merci ! ===== */
$("[data-thanks]").addEventListener("click", (e) => { confetti(e.currentTarget); bell(1.26); });

/* ===== Calendrier de l'Avent ===== */
(() => {
  const grid = $(".advent__grid"), msg = $(".advent__msg");
  const n = new Date(), f = +qs.get("avent");
  const today = f >= 1 && f <= 25 ? f : n.getMonth() === 11 ? Math.min(n.getDate(), 25) : 0;
  const key = f ? "avent-test" : "avent-" + n.getFullYear();
  let opened = [];
  try { opened = JSON.parse(localStorage.getItem(key)) || []; } catch (e) {}
  const save = () => { try { localStorage.setItem(key, JSON.stringify(opened)); } catch (e) {} };
  const jour = (d) => (d === 1 ? "1er" : d) + " décembre";

  grid.innerHTML = AVENT.map(([em], i) =>
    `<button class="door" type="button" data-day="${i + 1}" aria-label="Case du ${jour(i + 1)}"><span class="door__back" aria-hidden="true">${em}</span><span class="door__front" aria-hidden="true">${i + 1}</span></button>`).join("");
  $$(".door", grid).forEach((d) => {
    const day = +d.dataset.day;
    d.classList.toggle("is-open", opened.includes(day));
    d.classList.toggle("is-today", day === today);
    d.classList.toggle("is-locked", day > today);
  });

  if (!today) {
    const t0 = new Date(n.getFullYear(), n.getMonth(), n.getDate());
    const left = Math.round((new Date(n.getFullYear(), 11, 1) - t0) / 864e5);
    msg.textContent = `Première case dans ${left} jour${left > 1 ? "s" : ""}, le 1er décembre.`;
  } else msg.textContent = opened.includes(today) ? "Reviens demain pour la case suivante !" : `Ouvre la case du ${jour(today)} !`;

  grid.addEventListener("click", (e) => {
    const d = e.target.closest(".door"); if (!d) return;
    const day = +d.dataset.day;
    if (day > today) {
      msg.textContent = `Patience : cette case s'ouvre le ${jour(day)}.`;
      d.classList.remove("is-shake"); void d.offsetWidth; d.classList.add("is-shake");
      return;
    }
    if (!opened.includes(day)) { opened.push(day); save(); d.classList.add("is-open"); bell(1.5); }
    msg.textContent = `${jour(day)} · ${AVENT[day - 1][1]}`;
  });
})();

/* ===== Ma liste ===== */
const dlg = $("#liste"), status = $(".sheet__status");
$$("[data-open-list]").forEach((b) => b.addEventListener("click", () => {
  status.textContent = "";
  dlg.showModal ? dlg.showModal() : dlg.setAttribute("open", "");
}));
dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });

const texte = () => [
  "🎄 Ma liste de Noël",
  "",
  `PC gamer : tour à ${eur(VAL.tour)} de budget (pièces neuves et d'occasion)`,
  `- Je mets ${eur(VAL.part)} de mon argent de poche, il reste ${eur(VAL.reste)} pour la tour : ${LIENS.tour}`,
  `- Écran AOC Gaming 27G4XED : ${eur(PRIX.aoc)} : ${LIENS.aoc}`,
  `- Logitech MK950, coloris le moins cher (avec coupons, Amazon) : ${eur(PRIX.logi)} : ${LIENS.logi}`,
  "",
  `- Nothing Ear (3), blanc : ${eur(PRIX.ear)} : ${LIENS.ear}`,
  "",
  `Ce que je vous demande : ${eur(VAL.all)} (hors livraison, prix à vérifier).`,
  "",
  "Ma promesse : plus aucun avertissement, et le tableau rempli avec le plus grand sérieux.",
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
if (root.dataset.scene === "ear")
  $$(".switch a").forEach((a) => (a.dataset.go === "ear" ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current")));
setTheme();
countdown();
if (intro && motion) {
  busy = true;
  intro.addEventListener("click", openIntro);
  setTimeout(openIntro, 1700);
} else {
  intro && intro.remove();
  replayWords();
}
if (motion) snow.start();
