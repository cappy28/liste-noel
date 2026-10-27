// Fonction Vercel : se connecte à École Directe côté serveur et renvoie seulement un résumé.
const API = "https://api.ecoledirecte.com/v3";
const V = process.env.ED_VERSION || "4.101.4";
const DEPUIS = process.env.ED_DEPUIS || "2026-10-27";   // on compte à partir de ce jour
const POSITIF = /encourag|f[ée]licit|compliment|valoris|bravo/i;
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15";
let cache = null;

function session() {
  const s = { cookies: {}, token: "", fa2: "" };
  s.req = async (url, data, extra = {}) => {
    const h = { "User-Agent": UA, "Content-Type": "application/x-www-form-urlencoded",
      Cookie: Object.entries(s.cookies).map(([k, v]) => `${k}=${v}`).join("; "), ...extra };
    if (s.token) h["X-Token"] = s.token;
    if (s.fa2) h["2FA-Token"] = s.fa2;
    const r = await fetch(url, { method: data === undefined ? "GET" : "POST", headers: h,
      body: data === undefined ? undefined : "data=" + encodeURIComponent(JSON.stringify(data)) });
    for (const c of r.headers.getSetCookie?.() || []) { const kv = c.split(";")[0], i = kv.indexOf("="); s.cookies[kv.slice(0, i).trim()] = kv.slice(i + 1); }
    s.token = r.headers.get("x-token") || s.token; s.fa2 = r.headers.get("2fa-token") || s.fa2;
    try { const j = JSON.parse(await r.text()); if (j.token) s.token = j.token; return j; } catch { return { code: r.status }; }
  };
  return s;
}
async function login(s, extra = {}) {
  await s.req(`${API}/login.awp?gtk=1&v=${V}`);
  const cn = extra.cn || process.env.ED_CN, cv = extra.cv || process.env.ED_CV;
  return s.req(`${API}/login.awp?v=${V}`, { identifiant: process.env.ED_ID, motdepasse: process.env.ED_MDP,
    isReLogin: false, uuid: "", fa: cn && cv ? [{ cn, cv }] : [], ...extra }, { "X-Gtk": s.cookies.GTK || "" });
}
const num = x => { const n = parseFloat(String(x ?? "").replace(",", ".")); return isNaN(n) ? null : n; };
function calcule(notes, code) {
  const m = {};
  for (const n of notes) {
    if (n.codePeriode !== code || n.nonSignificatif) continue;
    const v = num(n.valeur), sur = num(n.noteSur) || 20, c = num(n.coef) || 1; if (v == null) continue;
    const t = (m[n.codeMatiere] ??= [0, 0]); t[0] += v / sur * 20 * c; t[1] += c;
  }
  const l = Object.values(m).map(([a, c]) => a / c);
  return l.length ? l.reduce((a, b) => a + b) / l.length : null;
}
function moyennes(d) {
  return (d?.periodes || []).filter(p => !/Z$/.test(p.codePeriode || "") && !/ann[ée]e|relev/i.test(p.periode || ""))
    .map((p, i) => { const v = num(p.ensembleMatieres?.moyenneGenerale) ?? calcule(d.notes || [], p.codePeriode);
      return { nom: (/semestre/i.test(p.periode) ? "S" : "T") + (i + 1), v: v == null ? null : Math.round(v * 100) / 100 }; })
    .filter(p => p.v != null);
}
function negatifs(vs, carnet) {
  return [...(vs?.sanctionsEncouragements || []), ...(carnet?.correspondances || [])]
    .map(x => ({ d: String(x.date || x.dateDeb || "").slice(0, 10), t: [x.typeElement, x.type, x.libelle, x.motif].join(" ") }))
    .filter(x => x.d >= DEPUIS && !POSITIF.test(x.t)).map(x => x.d).sort();
}
const eleveId = j => { const a = j.data?.accounts?.[0]; return a?.typeCompte === "E" ? a.id : a?.profile?.eleves?.[0]?.id; };

module.exports = async (req, res) => {
  const q = req.query || {};
  if (q.setup !== undefined) return setup(res, q);
  if (cache && Date.now() - cache.t < 36e5) { res.setHeader("Cache-Control", "s-maxage=3600"); return res.json(cache.d); }
  try {
    if (!process.env.ED_ID || !process.env.ED_MDP) throw "identifiants manquants";
    const s = session(), j = await login(s);
    if (j.code === 250) throw "QCM à faire (voir ?setup=)";
    if (j.code !== 200) throw "connexion refusée " + j.code;
    const id = eleveId(j); if (!id) throw "élève introuvable";
    const u = a => `${API}/eleves/${id}/${a}.awp?verbe=get&v=${V}`;
    const n = await s.req(u("notes"), { anneeScolaire: "" });
    const vs = await s.req(u("viescolaire"), {});
    const ca = await s.req(u("eleveCarnetCorrespondance"), {}).catch(() => null);
    const courbe = moyennes(n.data), neg = negatifs(vs.data, ca?.data);
    const ref = neg.at(-1) || DEPUIS;
    const d = { maj: new Date().toISOString(), depuis: DEPUIS, moyenne: courbe.at(-1)?.v ?? null, courbe,
      negatifs: neg.length, jours: Math.max(0, Math.floor((Date.now() - new Date(ref + "T00:00:00+01:00")) / 864e5)) };
    if (d.moyenne == null) throw "aucune moyenne trouvée";
    cache = { t: Date.now(), d };
    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400"); res.json(d);
  } catch (e) { res.setHeader("Cache-Control", "no-store"); res.status(200).json({ erreur: String(e) }); }
};

async function setup(res, q) {
  res.setHeader("Cache-Control", "no-store"); res.setHeader("Content-Type", "text/html; charset=utf-8");
  const esc = t => String(t).replace(/[&<>"]/g, c => `&#${c.charCodeAt(0)};`);
  const page = h => res.send(`<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width"><body style="font:18px/1.5 system-ui;max-width:560px;margin:30px auto;padding:0 16px">${h}</body>`);
  if (!process.env.ED_CLE || q.setup !== process.env.ED_CLE) return res.status(403).send("Clé incorrecte");
  try {
    const s = session(), j = await login(s);
    if (j.code === 200) return page("✅ Connexion OK, pas besoin de QCM.");
    if (j.code !== 250) return page(`❌ Erreur ${j.code} : ${esc(j.message || "")}`);
    const qd = await s.req(`${API}/connexion/doubleauth.awp?verbe=get&v=${V}`, {});
    const props = qd.data?.propositions || [], dec = b => Buffer.from(b, "base64").toString("utf8");
    if (q.rep && props.includes(q.rep)) {
      const r = await s.req(`${API}/connexion/doubleauth.awp?verbe=post&v=${V}`, { choix: q.rep });
      if (r.code !== 200 || !r.data?.cn) return page(`❌ Réponse refusée (${r.code}). Attends un peu avant de réessayer.`);
      const { cn, cv } = r.data, f = await login(s, { cn, cv });
      const box = (k, v) => `<p><b>${k}</b><br><textarea readonly rows=3 style="width:100%" onclick="this.select()">${esc(v)}</textarea>`;
      return page((f.code === 200 ? "✅ Réussi !" : `⚠️ QCM OK mais login ${f.code}.`) + " Ajoute ces 2 variables dans Vercel puis redéploie :" + box("ED_CN", cn) + box("ED_CV", cv));
    }
    return page(`<p>${q.rep ? "La question a changé, réponds à la nouvelle :" : "Question de sécurité :"}</p><h3>${esc(dec(qd.data?.question || ""))}</h3>` +
      props.map(p => `<p><a style="display:block;padding:12px;border:1px solid #999;border-radius:10px;text-decoration:none" href="?setup=${encodeURIComponent(q.setup)}&rep=${encodeURIComponent(p)}">${esc(dec(p))}</a>`).join("") +
      "<p><small>Touche une seule fois. Ne rafraîchis pas en boucle, sinon le compte peut être bloqué.</small>");
  } catch (e) { return page("❌ " + esc(e)); }
}
