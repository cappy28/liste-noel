"use strict";

/* =====================================================================
   0. OUTILS
   ===================================================================== */
const $  = (s, p = document) => p.querySelector(s);
const $$ = (s, p = document) => [...p.querySelectorAll(s)];
const euro  = n => n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
const nf    = (v, d = 2) => v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });
const pause = ms => new Promise(r => setTimeout(r, ms));
const Q  = new URLSearchParams(location.search);
const PC = matchMedia("(hover:hover) and (pointer:fine)").matches;

/* =====================================================================
   1. CONFIGURATION — tout ce qui se personnalise est ici
   ===================================================================== */
const CONFIG = {
  signature: "Ton prénom",
  legende: "Mon futur bureau 🎄",
  mot: "Merci pour tout. Pour la tour, je mets {part} de mon côté, il manque juste {reste}. En échange, je promets de ne plus avoir aucun avertissement et de remplir avec le plus grand sérieux le tableau…",
  budgetTour: 850,
  participation: 600,
  seuil: 15,                         // moyenne minimum promise
  notes: [13.4, 14.2, 14.9, 15.3],   // moyennes relevées, dans l'ordre
  majEd: new Date().toLocaleDateString("fr-FR"),
  video: "assets/video-ecran.mp4",
  videoSecours: "https://download.blender.org/durian/trailer/sintel_trailer-480p.mp4",
  papier: "assets/papier.mp3",
  photo: "assets/setup-complet.jpg",
  volume: .7,
  volumePapier: .5
};

const CADEAUX = [
  {
    id: "setup", titre: "La tour", nom: "Tour (part manquante)",
    prix: CONFIG.budgetTour - CONFIG.participation, setup: true,
    couleur: "#b3262e", taille: ["min(56vw,300px)", "min(54svh,440px)"], etiquette: "lourd 💪",
    type: "pc",
    images: [{ src: "assets/pure-base-501-airflow-black.png", alt: "Boîtier be quiet! Pure Base 501 Airflow Black" }],
    desc: `Budget ${euro(CONFIG.budgetTour)} · je mets ${euro(CONFIG.participation)}`,
    lien: "https://www.bequiet.com/fr/case/5322", lienTxt: "Voir le boîtier ↗"
  },
  {
    id: "ecran", titre: "L’écran", nom: "Écran AOC 27G4XED", prix: 99.99, setup: true,
    couleur: "#1f6b4a", taille: ["min(86vw,520px)", "min(36svh,300px)"], etiquette: "fragile 😅",
    type: "moniteur",
    images: [{ src: "assets/aoc-27g4xed.png", alt: "Écran AOC 27G4XED" }],
    desc: "AOC 27G4XED · 27 pouces · 180 Hz",
    lien: "https://www.aoc.com/fr/gaming/monitors/27g4xed", lienTxt: "Voir l’écran ↗"
  },
  {
    id: "clavier", titre: "Clavier + souris", nom: "Logitech MK950", prix: 70.5, setup: true,
    couleur: "#23356b", taille: ["min(90vw,560px)", "min(20svh,150px)"], etiquette: "ne pas secouer",
    type: "duo",
    images: [{ src: "assets/logitech-clavier.png", alt: "Clavier Logitech" },
             { src: "assets/logitech-souris.png", alt: "Souris Logitech", petit: true }],
    desc: "Logitech MK950 · sans fil",
    lien: "https://www.amazon.fr/dp/B0CTQN69N1", lienTxt: "Voir le pack ↗"
  },
  {
    id: "ear", titre: "Les écouteurs", nom: "Nothing Ear", prix: 69.25,
    couleur: "#c08a2b", ruban: "#f4efe6", taille: ["min(44vw,220px)", "min(28svh,220px)"], etiquette: "petit mais costaud",
    type: "simple",
    images: [{ src: "assets/nothing-ear.png", alt: "Écouteurs Nothing Ear" }],
    desc: "Nothing Ear · sans fil",
    lien: "https://fr.aliexpress.com/item/1005012784799880.html", lienTxt: "Voir les écouteurs ↗"
  }
];

const TOTAL = CADEAUX.reduce((s, c) => s + c.prix, 0);
const SOUS_TOTAL = CADEAUX.filter(c => c.setup).reduce((s, c) => s + c.prix, 0);
const N_CADEAUX = CADEAUX.length;

/* =====================================================================
   2. ÉTAT GLOBAL
   ===================================================================== */
let calme = localStorage.getItem("calme") !== null
  ? localStorage.getItem("calme") === "1"
  : matchMedia("(prefers-reduced-motion: reduce)").matches;
let introFait = false, finVue = false, dore = false;
const ouverts = new Set();
document.body.classList.toggle("calme", calme);

function noel() {
  const n = new Date();
  let c = new Date(n.getFullYear(), 11, 25);
  if (n >= new Date(n.getFullYear(), 11, 26)) c = new Date(n.getFullYear() + 1, 11, 25);
  return c;
}

let toastT;
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg; t.classList.add("on");
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("on"), 2200);
}

/* =====================================================================
   3. VIBRATION (Android natif, iOS via l'astuce du switch)
   ===================================================================== */
const IOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
let haptique = null;
if (IOS) {
  haptique = document.createElement("label");
  haptique.innerHTML = '<input type="checkbox" switch>';
  haptique.style.cssText = "position:fixed;left:-99px;top:0;opacity:0;pointer-events:none";
  document.body.append(haptique);
}
function vibre(motif) {
  if (haptique) {
    const n = Array.isArray(motif) ? Math.ceil(motif.length / 2) : 1;
    for (let i = 0; i < n; i++) setTimeout(() => haptique.click(), i * 90);
    return;
  }
  try { navigator.vibrate?.(motif); } catch {}
}

/* =====================================================================
   4. SONS (Web Audio, tout est synthétisé sauf le papier)
   ===================================================================== */
let ac, sortie, musique = null, papierBuf = null;

function audio() {
  if (ac) return ac;
  ac = new (window.AudioContext || window.webkitAudioContext)();
  const lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 6500;
  const comp = ac.createDynamicsCompressor();
  const gain = ac.createGain(); gain.gain.value = CONFIG.volume;
  lp.connect(comp).connect(gain).connect(ac.destination);
  sortie = lp;
  return ac;
}
const sonOk = () => ac && ac.state === "running";
const debloque = () => { audio(); if (ac.state !== "running") ac.resume(); };
["pointerdown", "touchend", "keydown"].forEach(e => addEventListener(e, debloque));

function bip(f, d = .08, type = "sine", v = .2, t0 = 0) {
  if (!sonOk()) return;
  const t = ac.currentTime + t0, o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.value = f;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(v, t + .005);
  g.gain.exponentialRampToValueAtTime(.001, t + d);
  o.connect(g).connect(sortie); o.start(t); o.stop(t + d + .02);
}
function bruit(d = .05, v = .3, f = 3000, t0 = 0) {
  if (!sonOk()) return;
  const t = ac.currentTime + t0;
  const b = ac.createBuffer(1, Math.ceil(ac.sampleRate * d), ac.sampleRate), c = b.getChannelData(0);
  for (let i = 0; i < c.length; i++) c[i] = (Math.random() * 2 - 1) * (1 - i / c.length);
  const s = ac.createBufferSource(), bp = ac.createBiquadFilter(), g = ac.createGain();
  s.buffer = b; bp.type = "bandpass"; bp.frequency.value = f; bp.Q.value = .8; g.gain.value = v;
  s.connect(bp).connect(g).connect(sortie); s.start(t);
}
async function papier() {
  if (!sonOk()) return;
  papierBuf ??= fetch(CONFIG.papier)
    .then(r => { if (!r.ok) throw 0; return r.arrayBuffer(); })
    .then(a => ac.decodeAudioData(a)).catch(() => null);
  const b = await papierBuf;
  if (b) {
    const s = ac.createBufferSource(), g = ac.createGain();
    g.gain.value = CONFIG.volumePapier; s.buffer = b; s.connect(g).connect(sortie); s.start();
  } else {
    for (let i = 0; i < 14; i++) bruit(.03 + Math.random() * .05, CONFIG.volumePapier * .6, 1500 + Math.random() * 4000, i * .06);
  }
}

/* Cloches et « Vive le vent » */
const NOTE = { C: 1046.5, D: 1174.7, E: 1318.5, F: 1396.9, G: 1568 };
const AIR = "E1 E1 E2 E1 E1 E2 E1 G1 C1.5 D.5 E4 F1 F1 F1.5 F.5 F1 E1 E1 E.5 E.5 E1 D1 D1 E1 D2 G2".split(" ");
function cloche(f, t, dest) {
  for (const [m, v] of [[1, 1], [2.76, .22], [5.4, .07]]) {
    const o = ac.createOscillator(), e = ac.createGain();
    o.frequency.value = f * m;
    e.gain.setValueAtTime(0, t);
    e.gain.linearRampToValueAtTime(v, t + .004);
    e.gain.exponentialRampToValueAtTime(.0005, t + 1.4 / m);
    o.connect(e).connect(dest); o.start(t); o.stop(t + 1.5);
  }
}
function musiqueOn() {
  const g = ac.createGain(); g.gain.value = .12; g.connect(sortie);
  musique = { g, to: 0 };
  const tour = () => {
    let t = ac.currentTime + .05;
    for (const n of AIR) { cloche(NOTE[n[0]], t, g); t += parseFloat(n.slice(1)) * .3; }
    if (musique) musique.to = setTimeout(tour, (t - ac.currentTime) * 1000 + 700);
  };
  tour();
}
function musiqueOff() {
  if (!musique) return;
  clearTimeout(musique.to);
  const g = musique.g;
  g.gain.setTargetAtTime(0, ac.currentTime, .1);
  setTimeout(() => g.disconnect(), 600);
  musique = null;
}

/* =====================================================================
   5. GÉNÉRATION DES SECTIONS CADEAU, SOMMAIRE, MENU, GUIRLANDE
   ===================================================================== */
function rendreCadeaux() {
  const main = $("main"), fin = $("#liste");
  CADEAUX.forEach((c, i) => {
    const sec = document.createElement("section");
    sec.className = "ch"; sec.id = c.id;
    sec.style.cssText = `--c:${c.couleur};--w:${c.taille[0]};--h:${c.taille[1]}${c.ruban ? `;--r:${c.ruban}` : ""}`;

    const imgs = c.images.map(im => `<img class="ferme${im.petit ? " petit" : ""}" src="${im.src}" alt="${im.alt}">`).join("");
    const visuel = {
      pc: `<button class="pc-launch" id="pcLaunch" type="button" aria-haspopup="dialog">${imgs}<span>Ouvrir le PC et explorer les composants ↗</span></button>`,
      moniteur: `<figure class="moniteur">${imgs}<video id="video" muted playsinline loop preload="none"></video><span class="ecr"><b>AOC</b></span><span class="led"></span></figure>`,
      duo: `<figure class="duo">${imgs}</figure>`,
      simple: `<figure>${imgs}</figure>`
    }[c.type];

    sec.innerHTML = `
      <div class="emb">
        <span class="g"></span><span class="d"></span><span class="rv"></span>
        <span class="noeud"></span><span class="etiq">${c.etiquette}</span>
        <em>Touche le cadeau 🎁</em>
      </div>
      <div class="contenu">
        <p class="num">0${i + 1} / 0${N_CADEAUX}</p>
        <h2>${c.titre}</h2>
        ${visuel}
        <p class="prix"><span class="compte">${euro(0)}</span></p>
        <p class="desc">${c.desc}</p>
        <a class="lien aim" href="${c.lien}" target="_blank" rel="noopener">${c.lienTxt}</a>
      </div>`;
    main.insertBefore(sec, fin);
  });

  $("#sommaire").innerHTML = CADEAUX.map((c, i) => `<a href="#${c.id}"><b>0${i + 1}</b>${c.titre}</a>`).join("");
  $("#menu").innerHTML = CADEAUX.map((c, i) => `<a href="#${c.id}">0${i + 1} ${c.titre}</a>`).join("") + '<a href="#liste">✦ Ma liste</a>';
  $("#guirlande").innerHTML = "<i></i>".repeat(N_CADEAUX);
  $("#nb").textContent = `0/${N_CADEAUX}`;
  $("#photo").src = CONFIG.photo;
}
rendreCadeaux();

/* Détourage : rend transparent le fond blanc qui touche les bords */
function detoure(img) {
  img.addEventListener("load", function une() {
    img.removeEventListener("load", une);
    try {
      const c = document.createElement("canvas"), W = c.width = img.naturalWidth, H = c.height = img.naturalHeight, x = c.getContext("2d");
      x.drawImage(img, 0, 0);
      const d = x.getImageData(0, 0, W, H), p = d.data;
      if (p[3] < 255) return;                                  // déjà transparent
      const vu = new Uint8Array(W * H), pile = [];
      const blanc = k => Math.min(p[k * 4], p[k * 4 + 1], p[k * 4 + 2]) > 232;
      for (let X = 0; X < W; X++) pile.push(X, (H - 1) * W + X);
      for (let Y = 0; Y < H; Y++) pile.push(Y * W, Y * W + W - 1);
      while (pile.length) {
        const k = pile.pop();
        if (vu[k] || !blanc(k)) continue;
        vu[k] = 1; p[k * 4 + 3] = 0;
        const X = k % W;
        if (X > 0) pile.push(k - 1); if (X < W - 1) pile.push(k + 1);
        if (k >= W) pile.push(k - W); if (k < W * (H - 1)) pile.push(k + W);
      }
      x.putImageData(d, 0, 0); img.src = c.toDataURL("image/png");
    } catch {}
  });
}
$$("img.ferme").forEach(detoure);

/* =====================================================================
   6. NEIGE
   ===================================================================== */
const cv = $("#neige"), cx = cv.getContext("2d");
const taille = () => { cv.width = innerWidth * devicePixelRatio; cv.height = innerHeight * devicePixelRatio; };
taille(); addEventListener("resize", taille);
const flocons = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random(), r: Math.random() * 2 + 1, v: Math.random() * .4 + .2, o: Math.random() * 6 }));
(function neige() {
  cx.clearRect(0, 0, cv.width, cv.height);
  if (!calme && (dore || !introFait || finVue)) {
    const W = cv.width, H = cv.height, d = devicePixelRatio;
    cx.fillStyle = dore ? "#f3cf6b" : "#fff"; cx.globalAlpha = .8;
    for (const f of flocons) {
      f.y += f.v * .005; f.o += .01;
      if (f.y > 1.02) { f.y = -.02; f.x = Math.random(); }
      cx.beginPath(); cx.arc((f.x + Math.sin(f.o) * .01) * W, f.y * H, f.r * d, 0, 7); cx.fill();
    }
  }
  requestAnimationFrame(neige);
})();

/* =====================================================================
   7. INTRO
   ===================================================================== */
const boite = $("#boite"); let y0 = null;
function ouvrirIntro() {
  if (introFait) return; introFait = true;
  papier(); bip(1568, .4, "sine", .12, .2); vibre(80);
  $("#intro").classList.add("ouvre");
  setTimeout(() => {
    $("#intro").remove();
    document.documentElement.classList.remove("bloque");
    document.body.classList.add("pret");
    maj();
  }, calme ? 100 : 1300);
}
boite.addEventListener("pointerdown", e => { y0 = e.clientY; boite.setPointerCapture(e.pointerId); });
boite.addEventListener("pointermove", e => {
  if (y0 === null) return;
  const dy = Math.max(0, e.clientY - y0);
  boite.style.setProperty("--tire", Math.min(dy, 60) + "px");
  if (dy > 50) ouvrirIntro();
});
boite.addEventListener("pointerup", () => { if (y0 !== null) ouvrirIntro(); y0 = null; });
setTimeout(ouvrirIntro, 4000);

/* =====================================================================
   8. HORLOGE, NUIT, ANNÉE
   ===================================================================== */
const now0 = new Date(), heure = now0.getHours();
if (Q.has("nuit") || (!Q.has("jour") && (heure >= 20 || heure < 6))) document.body.classList.add("nuit");
$("#annee").textContent = noel().getFullYear();

const HO = $("#horloge");
if (Q.has("noel") || (now0.getMonth() === 11 && now0.getDate() === 25)) {
  HO.innerHTML = '<b class="jourj">C’est Noël !</b>';
  document.body.classList.add("noel");
} else {
  HO.innerHTML = ["jours", "h", "min", "s"].map(l => `<span class="grp"><span class="chif"></span><small>${l}</small></span>`).join("");
  const tic = () => {
    const s = Math.max(0, Math.floor((noel() - new Date()) / 1000));
    [Math.floor(s / 86400), Math.floor(s / 3600) % 24, Math.floor(s / 60) % 60, s % 60].forEach((x, i) => {
      const str = String(x).padStart(2, "0"), box = HO.children[i].firstChild;
      while (box.children.length < str.length) box.append(document.createElement("i"));
      while (box.children.length > str.length) box.lastChild.remove();
      [...box.children].forEach((d, j) => {
        if (d.textContent === str[j]) return;
        d.textContent = str[j]; d.classList.remove("flip"); void d.offsetWidth; d.classList.add("flip");
      });
    });
  };
  tic(); setInterval(tic, 1000);
}

/* =====================================================================
   9. FAVICON DYNAMIQUE
   ===================================================================== */
const ico = $("link[rel=icon]"), icv = document.createElement("canvas"); icv.width = icv.height = 64;
function favicon(n) {
  const x = icv.getContext("2d");
  x.clearRect(0, 0, 64, 64); x.textAlign = "center"; x.textBaseline = "middle";
  x.font = "50px serif"; x.fillText("🎁", 28, 38);
  if (n) {
    const fini = n === N_CADEAUX;
    x.fillStyle = fini ? "#1f9d55" : "#d62f3a"; x.beginPath(); x.arc(46, 17, 16, 0, 7); x.fill();
    x.fillStyle = "#fff"; x.font = "bold 24px sans-serif"; x.fillText(fini ? "✓" : n, 46, 18);
  }
  ico.href = icv.toDataURL();
}

/* =====================================================================
   10. ÉCRAN QUI S'ALLUME
   ===================================================================== */
const moni = $(".moniteur"), video = $("#video"); let bootT;
video.addEventListener("error", () => {
  if (video.dataset.secours) return;
  video.dataset.secours = 1; video.src = CONFIG.videoSecours;
  if (ouverts.has("ecran")) video.play().catch(() => {});
});
function allumer() {
  if (!video.src) video.src = CONFIG.video;               // chargement différé
  clearTimeout(bootT); moni.classList.remove("boot");
  if (calme) { video.play().catch(() => {}); return; }
  bootT = setTimeout(() => {
    void moni.offsetWidth; moni.classList.add("boot");
    bootT = setTimeout(() => video.play().catch(() => {}), 1700);
  }, 900);
}
function eteindre() { clearTimeout(bootT); moni.classList.remove("boot"); video.pause(); }

/* =====================================================================
   11. COMPTEUR ANIMÉ (prix, moyenne, jours)
   ===================================================================== */
function compteAnime(el, cible, fmt, { son = false, duree = 1300, fin } = {}) {
  if (calme) { el.textContent = fmt(cible); fin?.(); return; }
  const t0 = performance.now(); let dernier = -1;
  const f = now => {
    if (!el.isConnected) return;
    const p = Math.min(1, (now - t0) / duree), e = 1 - Math.pow(1 - p, 4);
    el.textContent = fmt(cible * e);
    if (son) { const s = Math.floor(p * 22); if (s !== dernier) { dernier = s; bip(1800 + s * 30, .025, "square", .04); } }
    if (p < 1) requestAnimationFrame(f);
    else { el.textContent = fmt(cible); el.classList.remove("pile"); void el.offsetWidth; el.classList.add("pile"); fin?.(); }
  };
  requestAnimationFrame(f);
}

/* =====================================================================
   12. DÉBALLAGE
   ===================================================================== */
function guirlande() {
  $$("#guirlande i").forEach((b, i) => b.classList.toggle("on", ouverts.has(CADEAUX[i].id)));
  $("#nb").textContent = `${ouverts.size}/${N_CADEAUX}`;
  $("#guirlande").classList.toggle("fete", ouverts.size === N_CADEAUX);
  favicon(ouverts.size);
}
function ouvrir(sec) {
  if (ouverts.has(sec.id)) return;
  ouverts.add(sec.id); sec.classList.add("ouvert");
  papier(); vibre([60, 40, 60, 40, 120]); bip(2349, .2, "sine", .08, .3);
  const prix = CADEAUX.find(c => c.id === sec.id).prix;
  setTimeout(() => {
    if (!sec.classList.contains("ouvert")) return;
    compteAnime($(".compte", sec), prix, euro, { son: true, fin: () => { vibre(50); bip(2093, .15, "sine", .15); bip(2637, .3, "sine", .12, .07); } });
  }, calme ? 0 : 900);
  if (sec.id === "ecran") allumer();
  guirlande();
  if (ouverts.size === N_CADEAUX) [1568, 1976, 2349, 3136].forEach((f, i) => bip(f, .4, "sine", .1, .5 + i * .12));
}
function fermer(sec) {
  if (!ouverts.has(sec.id)) return;
  ouverts.delete(sec.id); sec.classList.remove("ouvert");
  const c = $(".compte", sec); c.textContent = euro(0); c.classList.remove("pile");
  if (sec.id === "ecran") eteindre();
  guirlande();
}
/* Ouvre / referme selon la position au scroll */
function maj() {
  if (!introFait) return;
  const h = innerHeight;
  $$(".ch").forEach(s => {
    const r = s.getBoundingClientRect();
    if (r.top < h * .3 && r.bottom > h * .3) ouvrir(s);
    else if (r.top > h * .6) fermer(s);
  });
}
$$(".emb").forEach(e => e.addEventListener("click", () => ouvrir(e.closest(".ch"))));

/* =====================================================================
   13. RUBAN QUI RELIE LES CADEAUX
   ===================================================================== */
const rSvg = $("#ruban"), rPath = $("#ruban path"); let rLen = 0, rY0 = 0, rY1 = 1;
function ruban() {
  const m = $("main"), W = m.clientWidth, H = m.scrollHeight; if (!W) return;
  rSvg.setAttribute("viewBox", `0 0 ${W} ${H}`); rSvg.style.height = H + "px";
  const P = CADEAUX.map(c => { const s = $("#" + c.id); return [W / 2, s.offsetTop + s.offsetHeight * .46]; });
  P.push([W / 2, $(".caisse").offsetTop + 10]);
  let d = `M${P[0][0]} ${P[0][1]}`;
  for (let i = 1; i < P.length; i++) {
    const a = P[i - 1][1], [x, b] = P[i], s = i % 2 ? W * .08 : W * .92, k = (b - a) * .3;
    d += ` C${s} ${a + k} ${s} ${b - k} ${x} ${b}`;
  }
  rPath.setAttribute("d", d);
  rLen = rPath.getTotalLength(); rPath.style.strokeDasharray = rLen;
  rY0 = P[0][1]; rY1 = P.at(-1)[1]; rubanProgres();
}
function rubanProgres() {
  if (!rLen) return;
  const y = innerHeight * .55 - $("main").getBoundingClientRect().top;
  const p = calme ? 1 : Math.min(1, Math.max(0, (y - rY0) / (rY1 - rY0)));
  rPath.style.strokeDashoffset = rLen * (1 - p);
}
new ResizeObserver(ruban).observe($("main"));
addEventListener("scroll", () => { maj(); rubanProgres(); }, { passive: true });

/* =====================================================================
   14. FIGURE QUI PIVOTE + ZOOM
   ===================================================================== */
$$(".contenu figure").forEach(f => {
  let x0 = null, bouge = false;
  const pose = e => {
    const r = f.getBoundingClientRect(), px = (e.clientX - r.left) / r.width - .5, py = (e.clientY - r.top) / r.height - .5;
    f.classList.add("penche");
    f.style.setProperty("--ry", px * 26 + "deg"); f.style.setProperty("--rx", -py * 18 + "deg");
    f.style.setProperty("--l", 1.08 - py * .25 + px * .1); f.style.setProperty("--sx", -px * 34 + "px");
  };
  const repos = () => { f.classList.remove("penche"); ["--ry", "--rx", "--l", "--sx"].forEach(v => f.style.removeProperty(v)); x0 = null; };
  f.addEventListener("pointerdown", e => { x0 = e.clientX; bouge = false; pose(e); });
  f.addEventListener("pointermove", e => {
    if (e.pointerType !== "mouse" && x0 === null) return;
    if (x0 !== null && Math.abs(e.clientX - x0) > 8) bouge = true;
    pose(e);
  });
  f.addEventListener("pointerup", e => { if (e.pointerType !== "mouse") repos(); else x0 = null; });
  f.addEventListener("pointercancel", repos); f.addEventListener("pointerleave", repos);
  f.addEventListener("click", e => { if (bouge) { e.stopPropagation(); bouge = false; } }, true);
});

const zoom = $("#zoom");
document.addEventListener("click", e => {
  const img = e.target.closest("figure img");
  if (!img || !img.src) return;
  $("#zoomImg").src = img.src; zoom.showModal(); bip(1200, .06, "sine", .05);
});
zoom.addEventListener("click", () => zoom.close());

/* =====================================================================
   15. FINALE : ENVELOPPE ET LETTRE
   ===================================================================== */
$("#mot").innerHTML = CONFIG.mot
  .replaceAll("{part}", euro(CONFIG.participation))
  .replaceAll("{reste}", euro(CONFIG.budgetTour - CONFIG.participation))
  .split(" ").map((w, i) => `<span style="--i:${i}">${w}</span>`).join(" ");
$("#sig").textContent = CONFIG.signature;
$("#legende").textContent = CONFIG.legende;

const env = $("#enveloppe"), lettre = $("#lettre");
function montrerLettre() {
  env.hidden = true; lettre.hidden = false;
  requestAnimationFrame(() => { $("#mot").classList.add("vu"); $(".signature").classList.add("vu"); });
  setTimeout(suivi, calme ? 100 : 1500);
}
env.addEventListener("click", () => {
  if (env.classList.contains("ouverte")) return;
  env.classList.add("ouverte");
  bruit(.05, .6, 1800); bruit(.1, .4, 600, .03); bip(110, .12, "triangle", .3); vibre([30, 30, 90]);
  setTimeout(papier, 700);
  setTimeout(() => env.classList.add("finie"), calme ? 0 : 1800);
  setTimeout(montrerLettre, calme ? 50 : 2200);
});

/* =====================================================================
   16. FINALE : SUIVI ÉCOLE DIRECTE
   ===================================================================== */
function suivi() {
  const el = $("#suivi"), notes = CONFIG.notes, seuil = CONFIG.seuil, moy = notes.at(-1), bas = moy < seuil;
  $("#majEd").textContent = CONFIG.majEd;
  el.classList.toggle("bas", bas);
  $("#obj").textContent = bas
    ? `Objectif ${nf(seuil, 0)}/20 · il manque ${nf(seuil - moy)} pt`
    : `Objectif ${nf(seuil, 0)}/20 · promesse tenue ✅`;

  // Courbe
  const W = 300, H = 110, pad = 18;
  const min = Math.min(...notes, seuil) - 1, max = Math.max(...notes, seuil) + 1;
  const X = i => pad + i * (W - 2 * pad) / Math.max(1, notes.length - 1);
  const Y = v => H - pad - (v - min) / (max - min) * (H - 2 * pad);
  let svg = `<line class="seuil" x1="0" x2="${W}" y1="${Y(seuil)}" y2="${Y(seuil)}"/>
             <text x="${W}" y="${Y(seuil) - 4}" text-anchor="end">${nf(seuil, 0)}</text>
             <path pathLength="1" d="${notes.map((v, i) => (i ? "L" : "M") + X(i) + " " + Y(v)).join(" ")}"/>`;
  notes.forEach((v, i) => {
    svg += `<circle class="${v < seuil ? "bas" : ""}" style="--i:${i}" cx="${X(i)}" cy="${Y(v)}" r="5"/>
            <text class="val" style="--i:${i}" x="${X(i)}" y="${Y(v) - 10}" text-anchor="middle">${nf(v, 1)}</text>`;
  });
  $("#courbe").innerHTML = svg;

  // Jours restants
  const j = Math.max(0, Math.ceil((noel() - new Date()) / 864e5));
  $("#joursTxt").textContent = `${j > 1 ? "jours" : "jour"} pour tenir\nla promesse`;
  el.classList.toggle("alerte", j <= 7);

  el.hidden = false;
  requestAnimationFrame(() => el.classList.add("vu"));
  compteAnime($("#moy"), moy, v => nf(v), { duree: 1600 });
  compteAnime($("#jours"), j, v => Math.round(v), { duree: 1200 });
}

/* =====================================================================
   17. FINALE : TICKET DE CAISSE
   ===================================================================== */
function codeBarre() {
  const s = []; let x = 0;
  while (x < 98) {
    const n = .4 + Math.random() * 1.4, b = .4 + Math.random() * 1.2;
    s.push(`#111 ${x}% ${x + n}%`, `#0000 ${x + n}% ${x + n + b}%`); x += n + b;
  }
  return `linear-gradient(90deg,${s.join(",")})`;
}
const LIGNES = [
  ["c", "<b>✦ LISTE DE NOËL ✦</b>"], ["c", "Caisse 01 · la maison"],
  ["c", new Date().toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })], ["sep"],
  ...CADEAUX.map(c => ["l", c.nom, euro(c.prix)]), ["sep"],
  ["l", "Sous-total setup", euro(SOUS_TOTAL)], ["l", "Articles", String(N_CADEAUX)], ["T", "TOTAL", euro(TOTAL)],
  ["code"], ["c", "Ni repris, ni échangé 😄"], ["c", "Merci et joyeux Noël 🎄"]
];
const tk = $("#ticket"), astuce = $("#astuce");
let imprime = false, pretTicket = false, arrache = false, tamponne = false;

async function imprimerTicket() {
  if (imprime) return; imprime = true;
  for (const l of LIGNES) {
    const d = document.createElement("div"); d.className = "tl " + l[0];
    if (l[0] === "l" || l[0] === "T") d.innerHTML = `<span>${l[1]}</span><span>${l[2]}</span>`;
    else if (l[0] === "code") d.innerHTML = `<i style="background:${codeBarre()}"></i><small>0${Math.round(TOTAL * 100)}2512</small>`;
    else if (l[1]) d.innerHTML = l[1];
    tk.append(d);
    if (!calme) { bruit(.09, .12, 2500); bip(90, .08, "sawtooth", .03); vibre(25); await pause(240); }
  }
  bip(1760, .12, "square", .05); vibre([40, 60, 80]);
  $("#actions").classList.add("on");
  pretTicket = true; tk.classList.add("pret-tire"); astuce.textContent = "↓ tire le ticket";
}
function arracher() {
  arrache = true; tk.style.translate = "";
  tk.classList.remove("pret-tire"); tk.classList.add("arrache");
  for (let i = 0; i < 12; i++) bruit(.025 + Math.random() * .03, .35, 2000 + Math.random() * 4000, i * .022);
  vibre([15, 10, 15, 10, 15, 10, 50]);
  astuce.textContent = tamponne ? "" : "appui long dessus 😉";
}
function tampon() {
  if (tamponne) return; tamponne = true;
  const s = document.createElement("div"); s.className = "tampon";
  s.style.cssText = `left:${16 + Math.random() * 22}%;top:${46 + Math.random() * 12}%;--r:${-18 + Math.random() * 10}deg`;
  s.innerHTML = `VALIDÉ<small>${noel().toLocaleDateString("fr-FR")}</small>`;
  tk.append(s);
  bip(55, .35, "sine", .7); bruit(.08, .5, 350); vibre(120);
  tk.animate([{ scale: 1 }, { scale: .96 }, { scale: 1 }], { duration: 260 });
  astuce.textContent = arrache ? "" : "↓ tire le ticket";
}

/* Tirer = arracher · appui long = tamponner */
let tY = null, tBouge = false, tAppui;
tk.addEventListener("contextmenu", e => e.preventDefault());
tk.addEventListener("pointerdown", e => {
  if (!pretTicket) return;
  tY = e.clientY; tBouge = false; tk.classList.add("presse"); tk.setPointerCapture(e.pointerId);
  tAppui = setTimeout(() => { if (!tBouge) { tampon(); tY = null; tk.classList.remove("presse"); } }, 550);
});
tk.addEventListener("pointermove", e => {
  if (tY === null || arrache) return;
  const dy = e.clientY - tY;
  if (Math.abs(dy) > 6) { tBouge = true; clearTimeout(tAppui); }
  if (dy > 0) { tk.style.translate = `0 ${Math.min(dy, 70)}px`; if (dy > 70) { arracher(); tY = null; } }
});
const lacher = () => { clearTimeout(tAppui); tk.classList.remove("presse"); if (!arrache) tk.style.translate = ""; tY = null; };
tk.addEventListener("pointerup", lacher); tk.addEventListener("pointercancel", lacher);

/* =====================================================================
   18. PARTAGE, COPIE, IMPRESSION, REMONTER
   ===================================================================== */
const texteListe = () => ["🎄 Ma liste de Noël", ...CADEAUX.map(c => `• ${c.nom} — ${euro(c.prix)}`), `Total : ${euro(TOTAL)}`].join("\n");
$("#wa").href = "https://wa.me/?text=" + encodeURIComponent(texteListe());
$("#sms").href = "sms:?&body=" + encodeURIComponent(texteListe());
$("#copier").addEventListener("click", async () => {
  try { await navigator.clipboard.writeText(texteListe()); toast("Liste copiée ✓"); vibre(30); }
  catch { toast("Copie impossible ici"); }
});
$("#partager").addEventListener("click", async () => {
  if (!navigator.share) return toast("Partage non disponible, utilise Copier");
  try { await navigator.share({ title: "Ma liste de Noël", text: texteListe(), url: location.href }); } catch {}
});
$("#imprimer").addEventListener("click", () => print());
$("#remonter").addEventListener("click", () => scrollTo({ top: 0, behavior: calme ? "auto" : "smooth" }));

/* =====================================================================
   19. OBSERVATEUR D'APPARITION (data-vu)
   ===================================================================== */
const obs = new IntersectionObserver(entries => entries.forEach(en => {
  if (!en.isIntersecting) return;
  en.target.classList.add("vu"); obs.unobserve(en.target);
  if (en.target.matches(".fin h2")) finVue = true;
  if (en.target.matches(".caisse")) setTimeout(imprimerTicket, 400);
}), { threshold: .35 });
$$("[data-vu]").forEach(el => obs.observe(el));

/* =====================================================================
   20. PILULE : MUSIQUE, ANIMATIONS, MENU · BOULE · BOUTONS AIMANTÉS
   ===================================================================== */
$("#platine").addEventListener("click", function () {
  debloque();
  if (musique) { musiqueOff(); this.classList.remove("tourne"); toast("Musique coupée"); }
  else { musiqueOn(); this.classList.add("tourne"); toast("🎵 Vive le vent"); }
});

const animBtn = $("#anim"); animBtn.classList.toggle("off", calme);
animBtn.addEventListener("click", () => {
  calme = !calme; localStorage.setItem("calme", calme ? "1" : "0");
  document.body.classList.toggle("calme", calme); animBtn.classList.toggle("off", calme);
  rubanProgres(); toast(calme ? "Animations réduites" : "Animations activées ✦");
});

const menu = $("#menu"), menuBtn = $("#menuBtn");
const menuToggle = on => { menu.classList.toggle("on", on); menuBtn.setAttribute("aria-expanded", on); };
menuBtn.addEventListener("click", () => menuToggle(!menu.classList.contains("on")));
menu.addEventListener("click", () => menuToggle(false));
document.addEventListener("click", e => { if (!e.target.closest("#menu,#menuBtn")) menuToggle(false); });

$("#boule").addEventListener("click", function () {
  this.classList.remove("tinte"); void this.offsetWidth; this.classList.add("tinte");
  dore = !dore; document.body.classList.toggle("dore", dore);
  if (sonOk()) { const g = ac.createGain(); g.gain.value = .3; g.connect(sortie); cloche(1568, ac.currentTime, g); }
  vibre(30); toast(dore ? "Neige dorée ✨" : "Neige blanche ❄");
});
$("#boule").addEventListener("animationend", function (e) { if (e.animationName === "tinte") this.classList.remove("tinte"); });

/* Effet aimant sur les boutons .aim (souris uniquement) */
if (PC) document.addEventListener("pointermove", e => {
  const a = e.target.closest?.(".aim");
  $$(".aim.magnet").forEach(x => { if (x !== a) { x.style.translate = ""; x.classList.remove("magnet"); } });
  if (!a) return;
  const r = a.getBoundingClientRect();
  a.classList.add("magnet");
  a.style.translate = `${(e.clientX - r.left - r.width / 2) * .2}px ${(e.clientY - r.top - r.height / 2) * .2}px`;
});
