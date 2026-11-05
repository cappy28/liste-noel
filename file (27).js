"use strict";
/* Crée le dialogue #pcExplorer et le relie au bouton #pcLaunch.
   Adapte COMPOSANTS (x, y = position du point en % sur l'image). */
(() => {
  const IMAGE = "assets/boitier-ouvert.png";
  const COMPOSANTS = [
    { nom: "Boîtier",         detail: "be quiet! Pure Base 501 Airflow", prix: 95,  x: 50, y: 50 },
    { nom: "Processeur",      detail: "AMD Ryzen 5 7600",                 prix: 190, x: 44, y: 34 },
    { nom: "Carte graphique", detail: "NVIDIA RTX 4060",                  prix: 290, x: 48, y: 60 },
    { nom: "Mémoire",         detail: "16 Go DDR5 5600 MHz",              prix: 60,  x: 58, y: 32 },
    { nom: "Stockage",        detail: "SSD NVMe 1 To",                    prix: 70,  x: 60, y: 70 },
    { nom: "Alimentation",    detail: "650 W 80+ Gold",                   prix: 80,  x: 40, y: 84 },
    { nom: "Carte mère",      detail: "B650 micro-ATX",                   prix: 65,  x: 52, y: 44 }
  ];
  const euro = n => n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
  const total = COMPOSANTS.reduce((s, c) => s + c.prix, 0);

  const dlg = document.createElement("dialog");
  dlg.id = "pcExplorer"; dlg.setAttribute("aria-label", "Explorer les composants du PC");
  dlg.innerHTML = `
    <div class="pc-tete">
      <h3>Dans la tour</h3>
      <button class="pc-fermer" type="button" aria-label="Fermer">✕</button>
    </div>
    <div class="pc-corps">
      <div class="pc-scene">
        <img src="${IMAGE}" alt="Intérieur du boîtier">
        ${COMPOSANTS.map((c, i) => `<button class="pc-point" type="button" data-i="${i}" style="left:${c.x}%;top:${c.y}%" aria-label="${c.nom}">${i + 1}</button>`).join("")}
      </div>
      <div>
        <ul class="pc-liste">
          ${COMPOSANTS.map((c, i) => `<li data-i="${i}"><b>${i + 1} · ${c.nom}</b><p>${c.detail}</p><small>${euro(c.prix)}</small></li>`).join("")}
        </ul>
        <p class="pc-total"><span>Total estimé</span><span>${euro(total)}</span></p>
      </div>
    </div>`;
  document.body.append(dlg);

  const actif = i => {
    dlg.querySelectorAll("[data-i]").forEach(el => el.classList.toggle("actif", el.dataset.i == i));
    dlg.querySelector(`li[data-i="${i}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  };
  dlg.addEventListener("click", e => {
    const el = e.target.closest("[data-i]"); if (el) return actif(el.dataset.i);
    if (e.target.closest(".pc-fermer") || e.target === dlg) dlg.close();
  });

  const launch = document.getElementById("pcLaunch");
  launch?.setAttribute("aria-controls", "pcExplorer");
  launch?.addEventListener("click", e => { e.stopPropagation(); dlg.showModal(); actif(0); });
})();
