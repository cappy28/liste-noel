// Fonction Vercel : se connecte à École Directe côté serveur et renvoie seulement un résumé.
const crypto = require("crypto");
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
  if (q.setup !== undefined) return setup(req, res, q);
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

function sealState(value) {
  const key = crypto.createHash("sha256").update(process.env.ED_CLE).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), data]).toString("base64url");
}
function openState(value) {
  const raw = Buffer.from(String(value || ""), "base64url");
  if (raw.length < 29) throw new Error("Session du QCM invalide. Recommence avec ?setup=...");
  const key = crypto.createHash("sha256").update(process.env.ED_CLE).digest();
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, raw.subarray(0, 12));
  decipher.setAuthTag(raw.subarray(12, 28));
  return JSON.parse(Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString("utf8"));
}

async function setup(req, res, q) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  const esc = t => String(t ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const page = h => res.send(`<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width"><body style="font:18px/1.5 system-ui;max-width:560px;margin:30px auto;padding:0 16px">${h}</body>`);
  if (!process.env.ED_CLE || q.setup !== process.env.ED_CLE) return res.status(403).send("Clé incorrecte");
  try {
    const body = req.method === "POST" ? (req.body || {}) : {};
    const dec = b => Buffer.from(String(b || ""), "base64").toString("utf8");
    const box = (k, v) => `<p><b>${esc(k)}</b><br><textarea readonly rows=3 style="width:100%" onclick="this.select()">${esc(v)}</textarea></p>`;

    // Le clic sur une réponse réutilise la session exacte qui a affiché la question.
    // L'état est chiffré côté serveur afin de ne pas exposer les cookies/tokens dans l'URL.
    if (req.method === "POST" && body.state && body.rep) {
      const state = openState(body.state);
      const s = session();
      s.cookies = state.cookies || {};
      s.token = state.token || "";
      s.fa2 = state.fa2 || "";
      if (!(state.props || []).includes(body.rep)) return page("❌ Réponse invalide. Recommence le QCM depuis le lien setup.");
      const r = await s.req(`${API}/connexion/doubleauth.awp?verbe=post&v=${V}`, { choix: body.rep });
      if (r.code !== 200 || !r.data?.cn || !r.data?.cv) {
        return page(`❌ ÉcoleDirecte n'a pas accepté cette réponse (${esc(r.code)}). Recommence une seule fois depuis le lien setup, puis vérifie la réponse demandée.`);
      }
      const { cn, cv } = r.data;
      const f = await login(s, { cn, cv });
      if (f.code !== 200) return page(`⚠️ Réponse au QCM acceptée, mais la vérification de connexion a renvoyé le code ${esc(f.code)}. Les jetons ne sont pas affichés car leur validation n'est pas confirmée. Recommence plus tard ou vérifie la version de l'API.`);
      return page("✅ QCM terminé et connexion vérifiée. Ajoute les deux variables suivantes dans Vercel, puis redéploie :" + box("ED_CN", cn) + box("ED_CV", cv));
    }

    const s = session();
    const j = await login(s);
    if (j.code === 200) return page("✅ Connexion OK, pas besoin de QCM.");
    if (j.code !== 250) return page(`❌ Erreur ${esc(j.code)} : ${esc(j.message || "")}`);
    const qd = await s.req(`${API}/connexion/doubleauth.awp?verbe=get&v=${V}`, {});
    const props = qd.data?.propositions || [];
    if (!qd.data?.question || !props.length) return page(`❌ ÉcoleDirecte n'a pas renvoyé la question de sécurité correctement (code ${esc(qd.code)}). Réessaie plus tard.`);
    const state = sealState({ cookies: s.cookies, token: s.token, fa2: s.fa2, props });
    return page(`<p>Question de sécurité :</p><h3>${esc(dec(qd.data.question))}</h3>` +
      props.map(p => `<form method="post" action="?setup=${encodeURIComponent(q.setup)}" style="margin:10px 0"><input type="hidden" name="state" value="${esc(state)}"><input type="hidden" name="rep" value="${esc(p)}"><button type="submit" style="display:block;width:100%;padding:12px;border:1px solid #999;border-radius:10px;background:white;text-align:left;font:inherit">${esc(dec(p))}</button></form>`).join("") +
      "<p><small>Choisis une réponse une seule fois. Si elle est refusée, ne clique pas en boucle : repars du lien setup après avoir vérifié la réponse.</small></p>");
  } catch (e) {
    return page("❌ Erreur pendant le QCM : " + esc(e.message || e) + "<p>Reviens au lien setup et réessaie une seule fois. Si le problème persiste, copie le message d'erreur sans partager ton mot de passe.</p>");
  }
}
