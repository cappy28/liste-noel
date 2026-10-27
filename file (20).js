/* ===== RÉGLAGES ===== */
const PRIX = { setup: 250, ecran: 99.99, clavier: 70.50, ear: 69.25 };
const BUDGET_TOUR = 850, PARTICIPATION = 600;
const SIGNATURE = "Ton prénom";            // à recoller
const LEGENDE = "Mon futur bureau 🎄";       // texte sous le Polaroid
const MOT = "Merci pour tout. Pour la tour, je mets {part} de mon côté, il manque juste {reste}. En échange, je promets de ne plus avoir aucun avertissement et remplir avec le plus grand sérieux le tableau…"; // à recoller
const ETIQUETTES = { setup: "lourd 💪", ecran: "fragile 😅", clavier: "ne pas secouer", ear: "petit mais costaud" };
const LIENS = {
  setup: "https://www.bequiet.com/fr/case/5322",
  ecran: "https://www.aoc.com/fr/gaming/monitors/27g4xed",
  clavier: "https://www.amazon.fr/dp/B0CTQN69N1",
  ear: "https://fr.aliexpress.com/item/1005012784799880.html"
};
const IMAGES = {
  setup: "assets/pure-base-501-airflow-black.png", setupOuvert: "assets/boitier-ouvert.png",
  ecran: "assets/aoc-27g4xed.png", clavier: "assets/logitech-clavier.png",
  souris: "assets/logitech-souris.png", ear: "assets/nothing-ear.png", photo: "assets/setup-complet.jpg"
};
const VIDEO = "assets/video-ecran.mp4";
const VIDEO_SECOURS = "https://download.blender.org/durian/trailer/sintel_trailer-480p.mp4";
const PAPIER = "assets/papier.mp3";
const VOLUME = 0.7, VOLUME_PAPIER = 0.5;
const NOMS = { setup: "Tour (part manquante)", ecran: "Écran AOC 27G4XED", clavier: "Logitech MK950", ear: "Nothing Ear" };
const ORDRE = ["setup", "ecran", "clavier", "ear"];

/* ===== OUTILS ===== */
const $ = (s, p = document) => p.querySelector(s), $$ = (s, p = document) => [...p.querySelectorAll(s)];
const euro = n => n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
const Q = new URLSearchParams(location.search);
const PC = matchMedia("(hover:hover) and (pointer:fine)").matches;
const pause = ms => new Promise(r => setTimeout(r, ms));
const SETUP = PRIX.setup + PRIX.ecran + PRIX.clavier, TOTAL = SETUP + PRIX.ear;
let calme = localStorage.getItem("calme") ? localStorage.getItem("calme") === "1" : matchMedia("(prefers-reduced-motion: reduce)").matches;
let tt;
function toast(m) { const t = $("#toast"); t.textContent = m; t.classList.add("on"); clearTimeout(tt); tt = setTimeout(() => t.classList.remove("on"), 2200); }

/* ===== VIBRATION ===== */
const IOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
let haptique = null;
if (IOS) {
  haptique = document.createElement("label");
  haptique.innerHTML = '<input type="checkbox" switch>';
  haptique.style.cssText = "position:fixed;left:-99px;top:0;opacity:0;pointer-events:none";
  document.body.append(haptique);
}
function vibre(m) {
  if (haptique) { const n = Array.isArray(m) ? Math.ceil(m.length / 2) : 1;
    for (let i = 0; i < n; i++) setTimeout(() => haptique.click(), i * 90); return; }
  try { navigator.vibrate?.(m); } catch (e) {}
}

/* ===== SONS ===== */
let ac, sortie, mus = null, papierP = null;
function audio() {
  if (ac) return ac;
  ac = new (window.AudioContext || window.webkitAudioContext)();
  const lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 6500;
  const comp = ac.createDynamicsCompressor(), g = ac.createGain(); g.gain.value = VOLUME;
  lp.connect(comp).connect(g).connect(ac.destination); sortie = lp; return ac;
}
const ok = () => ac && ac.state === "running";
const debloque = () => { audio(); if (ac.state !== "running") ac.resume(); };
["pointerdown", "touchend", "keydown"].forEach(e => addEventListener(e, debloque));

function bip(f, d = .08, type = "sine", v = .2, t0 = 0) {
  if (!ok()) return; const t = ac.currentTime + t0, o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.value = f;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + .005); g.gain.exponentialRampToValueAtTime(.001, t + d);
  o.connect(g).connect(sortie); o.start(t); o.stop(t + d + .02);
}
function bruit(d = .05, v = .3, f = 3000, t0 = 0) {
  if (!ok()) return; const t = ac.currentTime + t0, b = ac.createBuffer(1, Math.ceil(ac.sampleRate * d), ac.sampleRate), c = b.getChannelData(0);
  for (let i = 0; i < c.length; i++) c[i] = (Math.random() * 2 - 1) * (1 - i / c.length);
  const s = ac.createBufferSource(), bp = ac.createBiquadFilter(), g = ac.createGain();
  s.buffer = b; bp.type = "bandpass"; bp.frequency.value = f; bp.Q.value = .8; g.gain.value = v;
  s.connect(bp).connect(g).connect(sortie); s.start(t);
}
async function papier() {
  if (!ok()) return;
  papierP ??= fetch(PAPIER).then(r => { if (!r.ok) throw 0; return r.arrayBuffer(); }).then(a => ac.decodeAudioData(a)).catch(() => null);
  const b = await papierP;
  if (b) { const s = ac.createBufferSource(), g = ac.createGain(); g.gain.value = VOLUME_PAPIER; s.buffer = b; s.connect(g).connect(sortie); s.start(); return; }
  for (let i = 0; i < 14; i++) bruit(.03 + Math.random() * .05, VOLUME_PAPIER * .6, 1500 + Math.random() * 4000, i * .06 + Math.random() * .04);
}
const N = { C: 1046.5, D: 1174.7, E: 1318.5, F: 1396.9, G: 1568 };
const AIR = "E1 E1 E2 E1 E1 E2 E1 G1 C1.5 D.5 E4 F1 F1 F1.5 F.5 F1 E1 E1 E.5 E.5 E1 D1 D1 E1 D2 G2".split(" ");
function cloche(f, t, dest) {
  for (const [m, v] of [[1, 1], [2.76, .22], [5.4, .07]]) {
    const o = ac.createOscillator(), e = ac.createGain(); o.frequency.value = f * m;
    e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(v, t + .004); e.gain.exponentialRampToValueAtTime(.0005, t + 1.4 / m);
    o.connect(e).connect(dest); o.start(t); o.stop(t + 1.5);
  }
}
function musiqueOn() {
  const g = ac.createGain(); g.gain.value = .12; g.connect(sortie); mus = { g, to: 0 };
  const tour = () => { let t = ac.currentTime + .05;
    for (const n of AIR) { cloche(N[n[0]], t, g); t += parseFloat(n.slice(1)) * .3; }
    mus && (mus.to = setTimeout(tour, (t - ac.currentTime) * 1000 + 700)); };
  tour();
}
function musiqueOff() { if (!mus) return; clearTimeout(mus.to); const g = mus.g; g.gain.setTargetAtTime(0, ac.currentTime, .1); setTimeout(() => g.disconnect(), 600); mus = null; }

/* ===== NEIGE ===== */
const cv = $("#neige"), cx = cv.getContext("2d"); let introFait = false, finVue = false, dore = false;
const taille = () => { cv.width = innerWidth * devicePixelRatio; cv.height = innerHeight * devicePixelRatio; };
taille(); addEventListener("resize", taille);
const flocons = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random(), r: Math.random() * 2 + 1, v: Math.random() * .4 + .2, o: Math.random() * 6 }));
(function neige() {
  cx.clearRect(0, 0, cv.width, cv.height);
  if (!calme && (dore || !introFait || finVue)) {
    const W = cv.width, H = cv.height, d = devicePixelRatio; cx.fillStyle = dore ? "#f3cf6b" : "#fff"; cx.globalAlpha = .8;
    for (const f of flocons) { f.y += f.v * .005; f.o += .01; if (f.y > 1.02) { f.y = -.02; f.x = Math.random(); }
      cx.beginPath(); cx.arc((f.x + Math.sin(f.o) * .01) * W, f.y * H, f.r * d, 0, 7); cx.fill(); }
  }
  requestAnimationFrame(neige);
})();

/* ===== INTRO ===== */
const boite = $("#boite"); let y0 = null;
function ouvrirIntro() {
  if (introFait) return; introFait = true;
  papier(); bip(1568, .4, "sine", .12, .2); vibre(80);
  $("#intro").classList.add("ouvre");
  setTimeout(() => { $("#intro").remove(); document.documentElement.classList.remove("bloque"); document.body.classList.add("pret"); maj(); }, calme ? 100 : 1300);
}
boite.addEventListener("pointerdown", e => { y0 = e.clientY; boite.setPointerCapture(e.pointerId); });
boite.addEventListener("pointermove", e => { if (y0 === null) return; const dy = Math.max(0, e.clientY - y0);
  boite.style.setProperty("--tire", Math.min(dy, 60) + "px"); if (dy > 50) ouvrirIntro(); });
boite.addEventListener("pointerup", () => { if (y0 !== null) ouvrirIntro(); y0 = null; });
setTimeout(ouvrirIntro, 4000);

/* ===== HORLOGE / NUIT ===== */
const now0 = new Date(), hr = now0.getHours();
if (Q.has("nuit") || (!Q.has("jour") && (hr >= 20 || hr < 6))) document.body.classList.add("nuit");
const cible = () => { const n = new Date(); let c = new Date(n.getFullYear(), 11, 25); if (n >= new Date(n.getFullYear(), 11, 26)) c = new Date(n.getFullYear() + 1, 11, 25); return c; };
$("#annee").textContent = cible().getFullYear();
const HO = $("#horloge");
if (Q.has("noel") || (now0.getMonth() === 11 && now0.getDate() === 25)) { HO.innerHTML = '<b class="jourj">C\'est Noël !</b>'; document.body.classList.add("noel"); }
else {
  HO.innerHTML = ["jours", "h", "min", "s"].map(l => `<span class="grp"><span class="chif"></span><small>${l}</small></span>`).join("");
  const tic = () => { let s = Math.max(0, Math.floor((cible() - new Date()) / 1000));
    [Math.floor(s / 86400), Math.floor(s / 3600) % 24, Math.floor(s / 60) % 60, s % 60].forEach((x, i) => {
      const str = String(x).padStart(2, "0"), box = HO.children[i].firstChild;
      while (box.children.length < str.length) box.append(document.createElement("i"));
      while (box.children.length > str.length) box.lastChild.remove();
      [...box.children].forEach((d, j) => { if (d.textContent !== str[j]) { d.textContent = str[j]; d.classList.remove("flip"); void d.offsetWidth; d.classList.add("flip"); } });
    }); };
  tic(); setInterval(tic, 1000);
}

/* ===== IMAGES / LIENS / DÉTOURAGE ===== */
function detoure(img) {
  img.addEventListener("load", function f() { img.removeEventListener("load", f); try {
    const c = document.createElement("canvas"), W = c.width = img.naturalWidth, H = c.height = img.naturalHeight, x = c.getContext("2d");
    x.drawImage(img, 0, 0); const d = x.getImageData(0, 0, W, H), p = d.data; if (p[3] < 255) return;
    const vu = new Uint8Array(W * H), st = [], blanc = k => Math.min(p[k * 4], p[k * 4 + 1], p[k * 4 + 2]) > 232;
    for (let X = 0; X < W; X++) st.push(X, (H - 1) * W + X); for (let Y = 0; Y < H; Y++) st.push(Y * W, Y * W + W - 1);
    while (st.length) { const k = st.pop(); if (vu[k] || !blanc(k)) continue; vu[k] = 1; p[k * 4 + 3] = 0; const X = k % W;
      if (X > 0) st.push(k - 1); if (X < W - 1) st.push(k + 1); if (k >= W) st.push(k - W); if (k < W * (H - 1)) st.push(k + W); }
    x.putImageData(d, 0, 0); img.src = c.toDataURL("image/png");
  } catch (e) {} });
}
$$("[data-img]").forEach(i => { if (i.classList.contains("ferme")) detoure(i); i.src = IMAGES[i.dataset.img]; });
$$("[data-lien]").forEach(a => a.href = LIENS[a.dataset.lien]);
$$(".compte").forEach(c => c.textContent = euro(0));
$$(".ch").forEach(s => $(".etiq", s).textContent = ETIQUETTES[s.id] || "");
$("#infoTour").innerHTML = `Budget ${euro(BUDGET_TOUR)} · je mets ${euro(PARTICIPATION)}`;
const video = $("#video"); video.src = VIDEO;
video.addEventListener("error", () => { if (!video.dataset.s) { video.dataset.s = 1; video.src = VIDEO_SECOURS; if ($("#ecran").classList.contains("ouvert")) video.play().catch(() => {}); } });

/* ===== ICÔNE D'ONGLET ===== */
const ico = $("link[rel=icon]"), icv = document.createElement("canvas"); icv.width = icv.height = 64;
function favicon(n) {
  const x = icv.getContext("2d"); x.clearRect(0, 0, 64, 64); x.textAlign = "center"; x.textBaseline = "middle";
  x.font = "50px serif"; x.fillText("🎁", 28, 38);
  if (n) { x.fillStyle = n === 4 ? "#1f9d55" : "#d62f3a"; x.beginPath(); x.arc(46, 17, 16, 0, 7); x.fill();
    x.fillStyle = "#fff"; x.font = "bold 24px sans-serif"; x.fillText(n === 4 ? "✓" : n, 46, 18); }
  ico.href = icv.toDataURL();
}

/* ===== ÉCRAN QUI S'ALLUME ===== */
const moni = $(".moniteur"); let bootT;
function allumer() {
  clearTimeout(bootT); moni.classList.remove("boot");
  if (calme) { video.play().catch(() => {}); return; }
  bootT = setTimeout(() => { void moni.offsetWidth; moni.classList.add("boot");
    bootT = setTimeout(() => video.play().catch(() => {}), 1700); }, 900);
}
function eteindre() { clearTimeout(bootT); moni.classList.remove("boot"); video.pause(); }

/* ===== DÉBALLAGE ===== */
const ouverts = new Set();
function guirlande() {
  $$("#guirlande i").forEach((b, i) => b.classList.toggle("on", ouverts.has(ORDRE[i])));
  $("#nb").textContent = ouverts.size + "/4";
  $("#guirlande").classList.toggle("fete", ouverts.size === 4);
  favicon(ouverts.size);
}
function compter(sec) {
  const el = $(".compte", sec), v = PRIX[sec.id];
  if (calme) { el.textContent = euro(v); return; }
  const t0 = performance.now(), D = 1300; let last = -1;
  const f = now => { if (!sec.classList.contains("ouvert")) return;
    const p = Math.min(1, (now - t0) / D); el.textContent = euro(v * (1 - Math.pow(1 - p, 4)));
    const s = Math.floor(p * 22); if (s !== last) { last = s; bip(1800 + s * 30, .025, "square", .04); }
    if (p < 1) requestAnimationFrame(f); else { el.textContent = euro(v); el.classList.add("pile"); vibre(50); bip(2093, .15, "sine", .15); bip(2637, .3, "sine", .12, .07); } };
  requestAnimationFrame(f);
}
function ouvrir(sec) {
  if (ouverts.has(sec.id)) return; ouverts.add(sec.id); sec.classList.add("ouvert");
  papier(); vibre([60, 40, 60, 40, 120]);
  setTimeout(() => compter(sec), calme ? 0 : 900);
  if (sec.id === "ecran") allumer();
  guirlande(); bip(2349, .2, "sine", .08, .3);
  if (ouverts.size === 4) [1568, 1976, 2349, 3136].forEach((f, i) => bip(f, .4, "sine", .1, .5 + i * .12));
}
function fermer(sec) {
  if (!ouverts.has(sec.id)) return; ouverts.delete(sec.id); sec.classList.remove("ouvert");
  const c = $(".compte", sec); c.textContent = euro(0); c.classList.remove("pile");
  if (sec.id === "ecran") eteindre(); guirlande();
}
function maj() {
  if (!introFait) return; const h = innerHeight;
  $$(".ch").forEach(s => { const r = s.getBoundingClientRect();
    if (r.top < h * .3 && r.bottom > h * .3) ouvrir(s); else if (r.top > h * .6) fermer(s); });
}
$$(".emb").forEach(e => e.addEventListener("click", () => ouvrir(e.closest(".ch"))));

/* ===== RUBAN QUI RELIE ===== */
const rSvg = $("#ruban"), rp = $("#ruban path"); let rLen = 0, rY0 = 0, rY1 = 1;
function ruban() {
  const m = $("main"), W = m.clientWidth, H = m.scrollHeight; if (!W) return;
  rSvg.setAttribute("viewBox", `0 0 ${W} ${H}`); rSvg.style.height = H + "px";
  const P = ORDRE.map(k => { const s = $("#" + k); return [W / 2, s.offsetTop + s.offsetHeight * .46]; });
  P.push([W / 2, $(".caisse").offsetTop + 10]);
  let d = `M${P[0][0]} ${P[0][1]}`;
  for (let i = 1; i < P.length; i++) { const [, a] = P[i - 1], [x, b] = P[i], s = i % 2 ? W * .08 : W * .92, k = (b - a) * .3;
    d += ` C${s} ${a + k} ${s} ${b - k} ${x} ${b}`; }
  rp.setAttribute("d", d); rLen = rp.getTotalLength(); rp.style.strokeDasharray = rLen;
  rY0 = P[0][1]; rY1 = P.at(-1)[1]; rubanProgres();
}
function rubanProgres() {
  if (!rLen) return; const y = innerHeight * .55 - $("main").getBoundingClientRect().top;
  const p = calme ? 1 : Math.min(1, Math.max(0, (y - rY0) / (rY1 - rY0)));
  rp.style.strokeDashoffset = rLen * (1 - p);
}
new ResizeObserver(ruban).observe($("main"));
addEventListener("scroll", () => { maj(); rubanProgres(); }, { passive: true });

/* ===== PRODUIT QUI PIVOTE ===== */
$$(".contenu figure").forEach(f => {
  let x0 = null, bouge = false;
  const pose = e => { const r = f.getBoundingClientRect(), px = (e.clientX - r.left) / r.width - .5, py = (e.clientY - r.top) / r.height - .5;
    f.classList.add("penche"); f.style.setProperty("--ry", px * 26 + "deg"); f.style.setProperty("--rx", -py * 18 + "deg");
    f.style.setProperty("--l", 1.08 - py * .25 + px * .1); f.style.setProperty("--sx", -px * 34 + "px"); };
  const repos = () => { f.classList.remove("penche"); ["--ry", "--rx", "--l", "--sx"].forEach(v => f.style.removeProperty(v)); x0 = null; };
  f.addEventListener("pointerdown", e => { x0 = e.clientX; bouge = false; pose(e); });
  f.addEventListener("pointermove", e => { if (e.pointerType !== "mouse" && x0 === null) return;
    if (x0 !== null && Math.abs(e.clientX - x0) > 8) bouge = true; pose(e); });
  f.addEventListener("pointerup", e => { if (e.pointerType !== "mouse") repos(); else x0 = null; });
  f.addEventListener("pointercancel", repos); f.addEventListener("pointerleave", repos);
  f.addEventListener("click", e => { if (bouge) { e.stopPropagation(); bouge = false; } }, true);
});

/* ===== FINALE : ENVELOPPE ===== */
$("#mot").innerHTML = MOT.replaceAll("{part}", euro(PARTICIPATION)).replaceAll("{reste}", euro(BUDGET_TOUR - PARTICIPATION))
  .split(" ").map((w, i) => `<span style="--i:${i}">${w}</span>`).join(" ");
$("#sig").textContent = SIGNATURE;
$("#legende").textContent = LEGENDE;
const env = $("#enveloppe"), lettre = $("#lettre");
function montrerLettre() {
  env.hidden = true; lettre.hidden = false;
  requestAnimationFrame(() => { $("#mot").classList.add("vu"); $(".signature").classList.add("vu"); });
}
env.onclick = () => {
  if (env.classList.contains("ouverte")) return; env.classList.add("ouverte");
  bruit(.05, .6, 1800); bruit(.1, .4, 600, .03); bip(110, .12, "triangle", .3); vibre([30, 30, 90]);
  setTimeout(papier, 700);
  setTimeout(() => env.classList.add("finie"), calme ? 0 : 1800);
  setTimeout(montrerLettre, calme ? 50 : 2200);
};

/* ===== FINALE : TICKET ===== */
function codeBarre() { let s = [], x = 0;
  while (x < 98) { const n = .4 + Math.random() * 1.4, b = .4 + Math.random() * 1.2; s.push(`#111 ${x}% ${x + n}%`, `#0000 ${x + n}% ${x + n + b}%`); x += n + b; }
  return `linear-gradient(90deg,${s.join(",")})`; }
const LIGNES = [
  ["c", "<b>✦ LISTE DE NOËL ✦</b>"], ["c", "Caisse 01 · la maison"],
  ["c", new Date().toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })], ["sep"],
  ...ORDRE.map(k => ["l", NOMS[k], euro(PRIX[k])]), ["sep"],
  ["l", "Sous-total setup", euro(SETUP)], ["l", "Articles", "4"], ["T", "TOTAL", euro(TOTAL)],
  ["code"], ["c", "Ni repris, ni échangé 😄"], ["c", "Merci et joyeux Noël 🎄"]
];
const tk = $("#ticket"), astuce = $("#astuce");
let imprime = false, pretTicket = false, arrache = false, tamponne = false;
async function imprimerTicket(vite) {
  if (imprime) return; imprime = true;
  for (const l of LIGNES) {
    const d = document.createElement("div"); d.className = "tl " + l[0];
    if (l[0] === "l" || l[0] === "T") d.innerHTML = `<span>${l[1]}</span><span>${l[2]}</span>`;
    else if (l[0] === "code") d.innerHTML = `<i style="background:${codeBarre()}"></i><small>0${Math.round(TOTAL * 100)}2512</small>`;
    else if (l[1]) d.innerHTML = l[1];
    tk.append(d);
    if (!calme && !vite) { bruit(.09, .12, 2500); bip(90, .08, "sawtooth", .03); vibre(25); await pause(240); }
  }
  if (!vite) { bip(1760, .12, "square", .05); vibre([40, 60, 80]); }
  $("#actions").classList.add("on"); pretTicket = true; tk.classList.add("pret-tire"); astuce.textContent = "↓ tire le ticket";
}
function arracher() {
  arrache = true; tk.style.transition = ""; tk.style.translate = ""; tk.classList.remove("pret-tire"); tk.classList.add("arrache");
  for (let i = 0; i < 12; i++) bruit(.025 + Math.random() * .03, .35, 2000 + Math.random() * 4000, i * .022);
  vibre([15, 10, 15, 10, 15, 10, 50]); astuce.textContent = tamponne ? "" : "appui long dessus 😉";
}
function tampon() {
  if (tamponne) return; tamponne = true; const s = document.createElement("div"); s.className = "tampon";
  s.style.cssText = `left:${16 + Math.random() * 22}%;top:${46 + Math.random() * 12}%;--r:${-18 + Math.random() * 10}deg`;
  s.innerHTML = `VALIDÉ<small>${cible().toLocaleDateString("fr-FR")}</small>`; tk.append(s);
  bip(55, .35, "sine", .7); bruit(.08, .5, 350); vibre(120); tk.animate([{ scale: 1 }, { scale: .96 }, { scale: 1 }], { duration: 260 });
  astuce.textContent = arrache ? "" : "↓ tire le ticket";
}
let tY = null, tBouge = false, tAppui;
tk.addEventListener("pointerdown", e => { if (!pretTicket) return; tY = e.clientY; tBouge = false; tk.classList.add("presse");
  tAppui = setTimeout(() => { if (!tBouge) { tk.classList.remove("presse"); tampon(); } }, 600); });
tk.addEventListener("pointermove", e => { if (tY === null) return; const dy = e.clientY - tY;
  if (Math.abs(dy) > 8 && !tBouge) { tBouge = true; clearTimeout(tAppui); tk.classList.remove("presse"); if (!arrache) tk.setPointerCapture(e.pointerId); }
  if (tBouge && !arrache) { tk.style.transition = "none"; tk.style.translate = `0 ${Math.max(0, Math.min(dy, 140)) * .45}px`; if (dy > 100) arracher(); } });
const lache = () => { clearTimeout(tAppui); tk.classList.remove("presse"); tk.style.transition = ""; if (!arrache) tk.style.translate = ""; tY = null; };
["pointerup", "pointercancel", "pointerleave"].forEach(ev => tk.addEventListener(ev, lache));
tk.addEventListener("contextmenu", e => e.preventDefault());

const io = new IntersectionObserver(es => es.forEach(e => { if (!e.isIntersecting) return; const el = e.target;
  el.classList.add("vu"); io.unobserve(el);
  if (el.classList.contains("caisse")) imprimerTicket();
  if (el.classList.contains("polaroid")) { bruit(.04, .4, 4000); bruit(.06, .25, 1200, .05); vibre(40); }
}), { threshold: .35 });
$$("[data-vu]").forEach(el => io.observe(el));
new IntersectionObserver(([e]) => finVue = e.isIntersecting).observe($("#liste"));

const texte = ["🎄 Ma liste de Noël", ...ORDRE.map(k => `• ${NOMS[k]} : ${euro(PRIX[k])} → ${LIENS[k]}`), `Total : ${euro(TOTAL)}`, location.origin + location.pathname].join("\n");
$("#wa").href = "https://wa.me/?text=" + encodeURIComponent(texte);
$("#sms").href = "sms:?&body=" + encodeURIComponent(texte);
const copier = () => navigator.clipboard.writeText(texte).then(() => toast("Copié ✓")).catch(() => toast("Copie impossible"));
$("#copier").onclick = copier;
$("#partager").onclick = () => navigator.share ? navigator.share({ title: "Ma liste de Noël", text: texte }).catch(() => {}) : copier();
$("#imprimer").onclick = () => print();
addEventListener("beforeprint", () => { $$(".compte").forEach(c => c.textContent = euro(PRIX[c.dataset.k])); montrerLettre(); imprimerTicket(true); });
$("#remonter").onclick = () => scrollTo({ top: 0, behavior: calme ? "auto" : "smooth" });

/* ===== PILULE / MENU / ZOOM ===== */
$("#platine").onclick = () => { debloque(); mus ? musiqueOff() : musiqueOn(); $("#platine").classList.toggle("tourne", !!mus); };
function setCalme(v) { calme = v; document.body.classList.toggle("calme", v); localStorage.setItem("calme", v ? "1" : "0"); $("#anim").classList.toggle("off", v); rubanProgres(); }
setCalme(calme);
$("#anim").onclick = () => { setCalme(!calme); toast(calme ? "Animations coupées" : "Animations activées"); };
$("#menuBtn").onclick = () => $("#menu").classList.toggle("on");
$$("#menu a").forEach(a => a.onclick = () => $("#menu").classList.remove("on"));
$$("figure img").forEach(i => i.addEventListener("click", () => { $("#zoomImg").src = i.src; $("#zoom").showModal(); }));
$("#zoom").onclick = () => $("#zoom").close();

/* ===== SECRET ===== */
function secret() { dore = !dore; document.body.classList.toggle("dore", dore); toast(dore ? "✦ Neige dorée" : "Neige normale");
  [1568, 1976, 2349, 3136].forEach((f, i) => bip(f, .5, "sine", .1, i * .09)); vibre([60, 60, 60, 60, 120]); }
const KON = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"]; let kp = 0;
addEventListener("keydown", e => { kp = e.key === KON[kp] ? kp + 1 : (e.key === KON[0] ? 1 : 0); if (kp === KON.length) { kp = 0; secret(); } });
let taps = [];
$("#boule").onclick = () => { const n = Date.now(), b = $("#boule"); taps = taps.filter(t => n - t < 2000); taps.push(n);
  bip(1400 + taps.length * 120, .3, "sine", .12); vibre(20); b.classList.remove("tinte"); void b.offsetWidth; b.classList.add("tinte");
  if (taps.length >= 5) { taps = []; secret(); } };

/* ===== BOUTONS AIMANTÉS (PC) ===== */
if (PC) $$(".aim").forEach(b => {
  b.addEventListener("pointermove", e => { const r = b.getBoundingClientRect();
    b.style.translate = `${(e.clientX - r.left - r.width / 2) * .25}px ${(e.clientY - r.top - r.height / 2) * .35}px`; });
  b.addEventListener("pointerleave", () => b.style.translate = "");
});
