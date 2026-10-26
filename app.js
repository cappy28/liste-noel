/* ===== RÉGLAGES ===== */
const PRIX = { aoc: 99.99, logi: 70.50, ear: 119 };
const BUDGET_TOUR = 850;
const PARTICIPATION = 600;
const SIGNATURE = 'Moi';
const LIENS = {
  boitier: 'https://www.bequiet.com/fr/case/5322',
  aoc: 'https://www.aoc.com/fr/gaming/monitors/27g4xed',
  logi: 'https://www.amazon.fr/dp/B0CTQN69N1',
  ear: 'https://fr.nothing.tech/products/ear-3'
};
// Colle ici les adresses de ton ancien app.js (photo AOC officielle, PNG blanc des Ear)
const IMAGES = { aoc: '', ear: '' };
const VIDEO = 'assets/video-ecran.mp4';
const VIDEO_SECOURS = 'https://download.blender.org/durian/trailer/sintel_trailer-480p.mp4';
const MOT = `Papa, Maman,
voici ma liste de Noël. Pour le PC, je mets 600 € de ma poche : il ne reste que 250 € pour la tour.
En échange, je promets de ne plus avoir aucun avertissement et de remplir avec le plus grand sérieux le tableau qui va être mis en place.
Merci pour tout ♥`;

(() => {
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const root = document.documentElement, q = new URLSearchParams(location.search);
const fine = matchMedia('(pointer:fine)').matches, reduit = matchMedia('(prefers-reduced-motion: reduce)');
const calme = () => reduit.matches || localStorage.getItem('motion') === 'off';
const vibre = p => navigator.vibrate?.(p);

/* Prix */
const reste = BUDGET_TOUR - PARTICIPATION, setup = reste + PRIX.aoc + PRIX.logi, all = setup + PRIX.ear;
const V = { ...PRIX, tour: BUDGET_TOUR, part: PARTICIPATION, reste, setup, all };
const eur = n => n.toLocaleString('fr-FR', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }) + ' €';
$$('[data-eur]').forEach(e => e.textContent = eur(V[e.dataset.eur]));
$$('[data-lien]').forEach(a => a.href = LIENS[a.dataset.lien]);
function compte(e) {
  if (e.dataset.fait || calme()) return; e.dataset.fait = 1;
  const v = V[e.dataset.eur], t0 = performance.now();
  (function f(t) { const k = Math.min(1, (t - t0) / 900); e.textContent = eur(k < 1 ? Math.round(v * (1 - (1 - k) ** 3) * 100) / 100 : v); if (k < 1) requestAnimationFrame(f); })(t0);
}

/* Nuit */
const hr = new Date().getHours();
root.classList.toggle('night', q.has('nuit') || (!q.has('jour') && (hr >= 20 || hr < 6)));
$('meta[name=theme-color]').content = root.classList.contains('night') ? '#14211a' : '#f3efe5';

/* Images */
if (IMAGES.aoc) { const i = $('#img-aoc'); i.dataset.fallback = i.getAttribute('src'); i.src = IMAGES.aoc; }
if (IMAGES.ear) $('#img-ear').dataset.fallback = IMAGES.ear;
$$('img').forEach(img => {
  const ko = () => { const f = img.dataset.fallback; if (f) { delete img.dataset.fallback; img.src = f; } else img.closest('[data-slot]')?.classList.add('manque'); };
  img.addEventListener('error', ko);
  if (img.loading !== 'lazy' && img.complete && !img.naturalWidth && img.getAttribute('src')) ko();
});
const ou = $('#img-ouvert'), ar = () => ou.naturalWidth && ou.parentNode.style.setProperty('--ar', ou.naturalWidth + '/' + ou.naturalHeight);
ou.complete ? ar() : ou.addEventListener('load', ar);

/* Son */
let ac, son = false, musique = null;
const actx = () => { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); ac.resume?.(); return ac; };
function note(f, t, d, v, type, out) {
  const a = actx(), o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.value = f;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + .01); g.gain.exponentialRampToValueAtTime(.001, t + d);
  o.connect(g).connect(out || a.destination); o.start(t); o.stop(t + d + .05);
}
const cloche = () => { const t = actx().currentTime; [1568, 2093, 2637, 3136].forEach((f, i) => note(f, t + i * .06, 1.4, .06, 'sine')); };
const tick = (f = 1400) => son && note(f, actx().currentTime, .05, .03, 'square');
const NF = { C: 523.25, D: 587.33, E: 659.25, F: 698.46, G: 783.99 };
const AIR = 'E1 E1 E2 E1 E1 E2 E1 G1 C1.5 D.5 E4 F1 F1 F1.5 F.5 F1 E1 E1 E.5 E.5 E1 D1 D1 E1 D2 G2 E1 E1 E2 E1 E1 E2 E1 G1 C1.5 D.5 E4 F1 F1 F1.5 F.5 F1 E1 E1 E.5 E.5 G1 G1 F1 D1 C4'.split(' ');
function joue() {
  const a = actx(), g = a.createGain(); g.connect(a.destination);
  let t = a.currentTime + .1;
  AIR.forEach(n => { const d = parseFloat(n.slice(1)) * .26; note(NF[n[0]], t, Math.max(.2, d * .9), .07, 'triangle', g); note(NF[n[0]] / 2, t, d * .9, .03, 'sine', g); t += d; });
  musique = { g, t: setTimeout(joue, (t - a.currentTime) * 1000) };
}
function stopMusique() { if (!musique) return; clearTimeout(musique.t); const g = musique.g; g.gain.setTargetAtTime(0, actx().currentTime, .05); setTimeout(() => g.disconnect(), 400); musique = null; }
const bs = $('#son');
bs.onclick = () => { son = !son; bs.classList.toggle('joue', son); bs.setAttribute('aria-pressed', son); son ? joue() : stopMusique(); };
document.addEventListener('click', e => { if (e.target.closest('button,a') && !e.target.closest('#son')) tick(); });

/* Toast */
const T = $('#toast'); let tt;
function toast(m) { T.textContent = m; T.classList.add('on'); clearTimeout(tt); tt = setTimeout(() => T.classList.remove('on'), 2600); }

/* Intro ruban */
const intro = $('#intro'); let ouvert = false;
function ouvre() {
  if (ouvert) return; ouvert = true; intro.classList.add('ouvre'); vibre(20);
  setTimeout(() => { intro.remove(); root.classList.add('pret'); }, calme() ? 0 : 1900);
}
$('#tirer').onclick = () => { cloche(); ouvre(); };
setTimeout(ouvre, calme() ? 0 : 4000);

/* Compte à rebours */
const HO = $('#horloge');
function horloge() {
  const n = q.has('noel') ? new Date(new Date().getFullYear(), 11, 25, 10) : new Date(), y = n.getFullYear(), m = n.getMonth(), d = n.getDate();
  if (m === 11 && (d === 25 || (d === 24 && n.getHours() >= 18))) {
    if (!HO.dataset.sp) { HO.dataset.sp = 1; HO.innerHTML = `<p class="special">${d === 25 ? 'Joyeux Noël ! 🎄' : 'C’est ce soir… 🎁'}</p>`; }
    return;
  }
  let c = new Date(y, 11, 25); if (n >= c) c = new Date(y + 1, 11, 25);
  const ms = c - n;
  [['j', Math.floor(ms / 864e5)], ['h', Math.floor(ms / 36e5) % 24], ['m', Math.floor(ms / 6e4) % 60]].forEach(([k, v]) => {
    const b = $(`[data-k="${k}"]`, HO), t = String(v).padStart(2, '0');
    if (b.dataset.v === t) return; const premier = !b.dataset.v; b.dataset.v = t;
    if (premier || calme()) return void (b.textContent = t);
    b.classList.remove('bascule'); void b.offsetWidth; b.classList.add('bascule'); setTimeout(() => b.textContent = t, 250);
  });
}
horloge(); setInterval(horloge, 1000);

/* Chapitres au scroll */
const chs = $$('.ch'), pts = $('#points');
chs.forEach((s, i) => {
  $('.scene', s).insertAdjacentHTML('beforeend', '<div class="emballage" aria-hidden="true"><i class="pg"></i><i class="pd"></i><i class="rv"></i><i class="rh"></i><i class="nd"></i></div>');
  const b = document.createElement('button'); b.className = 'pt'; b.setAttribute('aria-label', 'Cadeau ' + (i + 1));
  b.onclick = () => s.scrollIntoView({ behavior: calme() ? 'auto' : 'smooth' }); pts.append(b);
});
const vid = $('#video'); let vidPrete = false, tapeT;
function video() {
  if (!vidPrete) {
    vidPrete = true;
    vid.addEventListener('error', () => { if (vid.src === VIDEO_SECOURS) return; vid.src = VIDEO_SECOURS; $('#credit').hidden = false; vid.play().catch(() => {}); });
    vid.src = VIDEO;
  }
  vid.play().catch(() => {});
}
new IntersectionObserver(([e]) => { if (!e.isIntersecting) vid.pause(); else if (vidPrete) vid.play().catch(() => {}); }).observe($('#ecran'));
function tape() {
  const el = $('#tape'), ch = [...'Joyeux Noël ! 🎄']; let i = 0; clearInterval(tapeT); el.textContent = '';
  tapeT = setInterval(() => { el.textContent = ch.slice(0, ++i).join(''); tick(1800); if (i >= ch.length) clearInterval(tapeT); }, calme() ? 0 : 110);
}
function ouvreCh(s) {
  if (!s.classList.contains('vu')) { s.classList.add('vu'); vibre(15); }
  setTimeout(() => $$('[data-compte]', s).forEach(compte), 300);
  if (s.id === 'ecran') video();
  if (s.id === 'clavier') tape();
}
let tic = false;
function maj() {
  tic = false; const h = innerHeight, c = calme(); let cur = 0;
  chs.forEach((s, i) => {
    const r = s.getBoundingClientRect(), p = c ? 1 : Math.min(1, Math.max(0, -r.top / (r.height - h)));
    s.style.setProperty('--p', p.toFixed(4)); s.classList.toggle('zero', p < .02);
    const o = p > .42;
    if (o !== s.classList.contains('open')) { s.classList.toggle('open', o); if (o) ouvreCh(s); }
    if (r.top < h * .5) cur = i + 1;
  });
  $('#pasN').textContent = cur;
  $$('.pt').forEach((b, i) => b.classList.toggle('on', i === cur - 1));
}
addEventListener('scroll', () => { if (!tic) { tic = true; requestAnimationFrame(maj); } }, { passive: true });
addEventListener('resize', maj);

/* Neige (début et fin seulement) */
const cv = $('#neige'), cx = cv.getContext('2d'), zones = new Set();
let fl = [], neigeOn = false, dore = 0, tn = 0, W, Hh, dpr;
function tailleNeige() { dpr = Math.min(devicePixelRatio || 1, 2); W = innerWidth; Hh = innerHeight; cv.width = W * dpr; cv.height = Hh * dpr; }
tailleNeige(); addEventListener('resize', tailleNeige);
const flocon = haut => ({ x: Math.random() * W, y: haut ? -10 : Math.random() * Hh, r: .8 + Math.random() * 2.4, v: .3 + Math.random() * .9, o: Math.random() * 6.28 });
function neigeCheck() {
  const veut = !calme() && (zones.size > 0 || dore > performance.now());
  cv.classList.toggle('on', veut);
  if (veut && !neigeOn) { neigeOn = true; if (!fl.length) fl = Array.from({ length: W < 600 ? 60 : 110 }, () => flocon()); requestAnimationFrame(neige); }
}
function neige(t) {
  const k = tn ? Math.min(3, (t - tn) / 16.7) : 1, or = dore > performance.now(); tn = t;
  if ((!or && !zones.size) || calme()) { neigeOn = false; tn = 0; cv.classList.remove('on'); return; }
  cx.setTransform(dpr, 0, 0, dpr, 0, 0); cx.clearRect(0, 0, W, Hh);
  cx.fillStyle = or ? '#e7b84a' : root.classList.contains('night') ? '#fff' : 'rgba(110,140,170,.5)';
  for (const f of fl) {
    f.o += .02 * k; f.y += f.v * k * (or ? 1.7 : 1); f.x += Math.sin(f.o) * .4 * k;
    if (f.y > Hh + 5) Object.assign(f, flocon(true));
    cx.beginPath(); cx.arc(f.x, f.y, f.r * (or ? 1.4 : 1), 0, 7); cx.fill();
  }
  requestAnimationFrame(neige);
}
const ion = new IntersectionObserver(es => { es.forEach(e => e.isIntersecting ? zones.add(e.target) : zones.delete(e.target)); neigeCheck(); });
ion.observe($('#haut')); ion.observe($('#liste'));

/* Finale */
let wi = 0;
$('#mot').innerHTML = MOT.split('\n').map(l => l.split(' ').map(w => `<span style="--i:${wi++}">${w}</span>`).join(' ')).join('<br>');
$('#sig').textContent = SIGNATURE;
$('.signature').style.setProperty('--d', wi * 55 + 600 + 'ms');
const io = new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting) return; e.target.classList.add('lu'); $$('[data-compte]', e.target).forEach(compte); io.unobserve(e.target);
}), { rootMargin: '0px 0px -20% 0px' });
$$('[data-io]').forEach(e => io.observe(e));

const ITEMS = [
  ['Tour PC', `budget ${eur(BUDGET_TOUR)}, je paie ${eur(PARTICIPATION)}`, reste, LIENS.boitier],
  ['Écran AOC 27G4XED', '27 pouces, 180 Hz', PRIX.aoc, LIENS.aoc],
  ['Clavier + souris Logitech MK950', 'avec coupons Amazon', PRIX.logi, LIENS.logi],
  ['Nothing Ear (3)', 'blancs', PRIX.ear, LIENS.ear]
];
$('#recap').innerHTML = ITEMS.map(([n, s, v, l]) => `<li><span><a class="lien" href="${l}" target="_blank" rel="noopener">${n}</a><small>${s}</small></span><b>${eur(v)}</b></li>`).join('');
const TEXTE = ['Ma liste de Noël 🎄', ...ITEMS.map(([n, s, v, l]) => `• ${n} (${s}) : ${eur(v)}\n  ${l}`), `Total : ${eur(all)} (hors livraison)`, location.href.split(/[?#]/)[0]].join('\n');
async function copie() {
  try { await navigator.clipboard.writeText(TEXTE); }
  catch { const t = document.createElement('textarea'); t.value = TEXTE; t.style.cssText = 'position:fixed;opacity:0'; document.body.append(t); t.select(); document.execCommand('copy'); t.remove(); }
}
const bc = $('#copier');
bc.onclick = async () => { await copie(); bc.classList.add('ok'); vibre([10, 40, 10]); toast('Liste copiée ✓'); setTimeout(() => bc.classList.remove('ok'), 2200); };
$('#partager').onclick = () => navigator.share ? navigator.share({ title: 'Ma liste de Noël', text: TEXTE }).catch(() => {}) : bc.click();
$('#wa').href = 'https://wa.me/?text=' + encodeURIComponent(TEXTE);
$('#sms').href = 'sms:?&body=' + encodeURIComponent(TEXTE);
$('#imprimer').onclick = () => print();
$('#remonter').onclick = e => { const b = e.currentTarget; b.classList.add('part'); vibre(15); scrollTo({ top: 0, behavior: calme() ? 'auto' : 'smooth' }); setTimeout(() => b.classList.remove('part'), 1200); };

/* Zoom par appui long */
const zoom = $('#zoom'), zi = $('img', zoom);
zoom.onclick = () => zoom.close();
$$('.produit img, .photo img').forEach(img => {
  let t; const stop = () => clearTimeout(t);
  img.addEventListener('pointerdown', () => { t = setTimeout(() => { zi.src = img.currentSrc || img.src; zoom.showModal(); vibre(20); }, 450); });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => img.addEventListener(ev, stop));
  img.addEventListener('contextmenu', e => e.preventDefault());
});

/* Code secret */
function lutin() { toast('🧝 Succès débloqué : Lutin secret'); dore = performance.now() + 7000; neigeCheck(); cloche(); setTimeout(cloche, 400); vibre([30, 60, 30, 60, 80]); }
const KO = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a']; let ki = 0;
addEventListener('keydown', e => { const k = e.key.toLowerCase(); ki = k === KO[ki] ? ki + 1 : k === KO[0] ? 1 : 0; if (ki === KO.length) { ki = 0; lutin(); } });
const boule = $('#boule'); let taps = [];
boule.onclick = () => {
  cloche(); boule.classList.remove('ding'); void boule.offsetWidth; boule.classList.add('ding');
  const n = Date.now(); taps = taps.filter(t => n - t < 2500); taps.push(n);
  if (taps.length >= 5) { taps = []; lutin(); }
};

/* PC : boutons aimantés + curseur flocon */
if (fine) {
  $$('.mag, .btn').forEach(el => {
    el.addEventListener('pointermove', e => { if (calme()) return; const r = el.getBoundingClientRect(); el.style.translate = `${(e.clientX - r.left - r.width / 2) * .25}px ${(e.clientY - r.top - r.height / 2) * .25}px`; });
    el.addEventListener('pointerleave', () => el.style.translate = '');
  });
  const fc = $('#flocon'); let mx = -50, my = -50, px = -50, py = -50;
  addEventListener('pointermove', e => { if (e.pointerType !== 'mouse') return; mx = e.clientX; my = e.clientY; fc.classList.add('on'); }, { passive: true });
  document.addEventListener('mouseleave', () => fc.classList.remove('on'));
  (function suit() { px += (mx - px) * .2; py += (my - py) * .2; fc.style.transform = `translate(${px + 12}px,${py + 12}px)`; requestAnimationFrame(suit); })();
}

/* Animations on/off */
function appliqueCalme() { root.classList.toggle('calme', calme()); $('#anim').setAttribute('aria-pressed', !calme()); maj(); neigeCheck(); }
$('#anim').onclick = () => { localStorage.setItem('motion', calme() ? 'on' : 'off'); appliqueCalme(); toast(calme() ? 'Animations coupées' : 'Animations activées'); };
reduit.addEventListener?.('change', appliqueCalme);
appliqueCalme();
})();
