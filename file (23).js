(() => {
  "use strict";

  const launcher = document.getElementById("pcLaunch");
  if (!launcher) return;

  const money = value =>
    value.toLocaleString("fr-FR", {
      style: "currency",
      currency: "EUR"
    });

  /*
    Prix fournis dans ta liste :
    ce ne sont pas des annonces vérifiées en ligne.

    point : position du repère, en pourcentage de l’image.
    focus : centre du zoom.
    zoom  : grossissement.
  */

  const components = [
    {
      id: "cpu",
      short: "1 · Processeur",
      name: "AMD Ryzen 5 7500F",
      price: 85,
      condition: "Occasion",
      point: [39, 32],
      focus: [39, 32],
      zoom: 2.5,
      note:
        "Le processeur se trouve sous le ventirad. " +
        "Le zoom montre sa zone ; le schéma ci-dessous " +
        "représente le CPU, qui n’est pas directement visible.",
      schema: "cpu",
      symbol: "AMD\nRYZEN 5\n7500F"
    },
    {
      id: "motherboard",
      short: "2 · Carte mère",
      name: "ASRock B650M-HDV/M.2",
      price: 98,
      condition: "Neuf",
      point: [53, 45],
      focus: [42, 43],
      zoom: 1.65,
      note:
        "Vue de la zone de la carte mère. " +
        "La photo est illustrative : elle ne garantit pas " +
        "que le modèle photographié soit celui de ta liste."
    },
    {
      id: "ram",
      short: "3 · RAM",
      name: "Mémoire RAM — modèle à trouver",
      price: null,
      condition: "Occasion · à surveiller",
      point: [57, 32],
      focus: [57, 32],
      zoom: 2.7,
      note:
        "Zoom sur la zone des emplacements mémoire. " +
        "Le modèle et le prix restent à définir."
    },
    {
      id: "gpu",
      short: "4 · Carte graphique",
      name: "AMD Radeon RX 6800 XT 16 Go",
      price: 300,
      condition: "Occasion",
      point: [43, 57],
      focus: [43, 57],
      zoom: 1.85,
      note:
        "Vue de la zone de la carte graphique. " +
        "Prix cible de ta liste : 300 €. " +
        "Tu indiques que les occasions à ce prix sont rares."
    },
    {
      id: "ssd",
      short: "5 · SSD SATA",
      name: "SSD SATA — modèle à préciser",
      price: 80,
      condition: "Occasion",
      point: null,
      focus: null,
      zoom: 1,
      note:
        "Le SSD n’est pas identifiable sur cette photo. " +
        "Aucun emplacement précis n’est donc inventé : " +
        "cette fiche reste accessible depuis la liste.",
      schema: "ssd",
      symbol: "SSD\nSATA"
    },
    {
      id: "psu",
      short: "6 · Alimentation",
      name: "be quiet! System Power 11 650W ATX",
      price: 70,
      condition: "Neuf",
      point: [39, 81],
      focus: [39, 81],
      zoom: 1.9,
      note:
        "Le repère désigne le cache inférieur du boîtier. " +
        "L’alimentation elle-même n’est pas directement " +
        "visible sur cette vue.",
      schema: "psu",
      symbol: "be quiet!\n650 W"
    },
    {
      id: "case",
      short: "7 · Boîtier",
      name: "be quiet! Pure Base 501 Airflow Black",
      price: 80,
      condition: "Neuf",
      point: null,
      focus: [50, 50],
      zoom: 1,
      note:
        "Vue d’ensemble du boîtier. " +
        "Utilise le bouton « Refermer le panneau » " +
        "pour rejouer l’ouverture."
    }
  ];

  const subtotal = components.reduce(
    (sum, component) => sum + (component.price ?? 0),
    0
  );

  const dialog = document.createElement("dialog");
  dialog.id = "pcExplorer";
  dialog.setAttribute("aria-labelledby", "pcTitle");
  dialog.setAttribute("aria-describedby", "pcIntro");

  dialog.innerHTML = `
    <header class="pc-header">
      <div>
        <h2 id="pcTitle">À l’intérieur de mon futur PC</h2>
        <p class="pc-intro" id="pcIntro">
          Ouvre le panneau, puis sélectionne une pièce.
        </p>
      </div>

      <button
        class="pc-close"
        id="pcClose"
        type="button"
        aria-label="Fermer l’exploration"
        autofocus
      >×</button>
    </header>

    <div class="pc-layout">
      <div class="pc-visual">
        <div class="pc-stage" id="pcStage">
          <div class="pc-camera" id="pcCamera">
            <img
              class="pc-inside"
              id="pcInside"
              alt="Photo illustrative de l’intérieur du boîtier"
              draggable="false"
            >
            <div class="pc-points" id="pcPoints"></div>
          </div>

          <div class="pc-door" aria-hidden="true"></div>
        </div>

        <div class="pc-controls">
          <button
            class="pc-control"
            id="pcToggle"
            type="button"
            aria-expanded="false"
            aria-controls="pcPoints"
          >Ouvrir le panneau</button>

          <button
            class="pc-control"
            id="pcReset"
            type="button"
          >↺ Vue d’ensemble</button>
        </div>

        <p class="pc-disclaimer">
          Photo d’illustration : les pièces visibles ne
          correspondent pas nécessairement aux modèles choisis.
          Les repères des composants cachés désignent leur zone.
        </p>
      </div>

      <aside class="pc-sidebar" aria-label="Composants du PC">
        <p class="pc-subtotal" id="pcSubtotal"></p>

        <div class="pc-list" id="pcList"></div>

        <section
          class="pc-detail"
          aria-live="polite"
          aria-atomic="true"
        >
          <h3 id="pcName">La configuration</h3>
          <p class="pc-price" id="pcPrice"></p>
          <p class="pc-note" id="pcNote"></p>

          <div id="pcSchemaWrap" hidden>
            <div
              class="pc-schematic"
              id="pcSchema"
              aria-hidden="true"
            ></div>
            <p class="pc-schema-caption">
              Schéma explicatif, pas une photo du composant.
            </p>
          </div>
        </section>
      </aside>
    </div>
  `;

  document.body.append(dialog);

  const find = selector => dialog.querySelector(selector);

  const stage = find("#pcStage");
  const camera = find("#pcCamera");
  const points = find("#pcPoints");
  const list = find("#pcList");
  const toggle = find("#pcToggle");
  const reset = find("#pcReset");
  const name = find("#pcName");
  const price = find("#pcPrice");
  const note = find("#pcNote");
  const schemaWrap = find("#pcSchemaWrap");
  const schema = find("#pcSchema");

  let panelOpen = false;
  let openingTimer;

  /*
    On réutilise le chemin déjà configuré dans app.js.
    Le chemin de secours permet aussi de garder ce module lisible.
  */

  find("#pcInside").src =
    typeof IMAGES !== "undefined"
      ? IMAGES.setupOuvert
      : "assets/boitier-ouvert.png";

  find("#pcSubtotal").textContent =
    `${money(subtotal)} chiffrés · RAM et refroidissement non chiffrés`;

  // Construction des boutons de la liste et des repères.
  components.forEach(component => {
    const button = document.createElement("button");

    button.type = "button";
    button.className = "pc-part";
    button.dataset.component = component.id;
    button.setAttribute("aria-pressed", "false");

    const label = document.createElement("span");
    label.textContent = component.short;

    const amount = document.createElement("strong");
    amount.textContent =
      component.price === null
        ? "À définir"
        : money(component.price);

    button.append(label, amount);
    list.append(button);

    if (!component.point) return;

    const marker = document.createElement("button");

    marker.type = "button";
    marker.className = "pc-point";
    marker.dataset.component = component.id;
    marker.textContent = component.short.split(" · ")[0];

    marker.style.left = `${component.point[0]}%`;
    marker.style.top = `${component.point[1]}%`;

    marker.setAttribute("aria-label", component.name);
    marker.setAttribute("aria-pressed", "false");
    marker.title = component.name;

    points.append(marker);
  });

  const componentButtons = [
    ...dialog.querySelectorAll("[data-component]")
  ];

  function moveCamera(focus = [50, 50], zoom = 1) {
    /*
      On centre le point sélectionné.

      Le bornage évite de déplacer l’image entièrement
      hors du cadre pendant un zoom.
    */

    const clamp = value =>
      Math.max(100 - 100 * zoom, Math.min(0, value));

    const x = clamp(50 - focus[0] * zoom);
    const y = clamp(50 - focus[1] * zoom);

    camera.style.setProperty("--pc-x", `${x}%`);
    camera.style.setProperty("--pc-y", `${y}%`);
    camera.style.setProperty("--pc-zoom", zoom);
    camera.style.setProperty("--pc-inverse", 1 / zoom);
  }

  function resetView() {
    moveCamera();

    componentButtons.forEach(button =>
      button.setAttribute("aria-pressed", "false")
    );

    name.textContent = "La configuration";
    price.textContent = "";
    schemaWrap.hidden = true;

    note.textContent = panelOpen
      ? "Choisis un repère sur la photo ou une pièce dans la liste."
      : "Le panneau est fermé. Ouvre-le pour explorer le PC.";
  }

  function setPanelOpen(value) {
    panelOpen = value;

    stage.classList.toggle("is-open", value);
    toggle.setAttribute("aria-expanded", String(value));

    toggle.textContent = value
      ? "Refermer le panneau"
      : "Ouvrir le panneau";

    componentButtons.forEach(button => {
      button.disabled = !value;
    });

    reset.disabled = !value;

    resetView();
  }

  function selectComponent(id) {
    if (!panelOpen) return;

    const component = components.find(item => item.id === id);
    if (!component) return;

    componentButtons.forEach(button => {
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.component === id)
      );
    });

    moveCamera(
      component.focus ?? [50, 50],
      component.zoom
    );

    name.textContent = component.name;

    price.textContent =
      component.price === null
        ? `Prix à définir · ${component.condition}`
        : `${money(component.price)} · ${component.condition}`;

    note.textContent = component.note;

    schemaWrap.hidden = !component.schema;
    schema.dataset.kind = component.schema ?? "";
    schema.textContent = component.symbol ?? "";
  }

  launcher.addEventListener("click", () => {
    if (dialog.open) return;

    clearTimeout(openingTimer);
    setPanelOpen(false);

    document.documentElement.classList.add("pc-modal-open");
    dialog.showModal();

    // Petit délai pour rendre le retrait du panneau visible.
    openingTimer = setTimeout(() => {
      if (dialog.open) setPanelOpen(true);
    }, 180);
  });

  toggle.addEventListener("click", () => {
    clearTimeout(openingTimer);
    setPanelOpen(!panelOpen);
  });

  reset.addEventListener("click", resetView);

  find("#pcClose").addEventListener("click", () => {
    dialog.close();
  });

  dialog.addEventListener("click", event => {
    const button = event.target.closest("[data-component]");

    if (button) {
      selectComponent(button.dataset.component);
      return;
    }

    // Fermeture par clic sur l’arrière-plan, hors de la fenêtre.
    if (event.target === dialog) {
      const bounds = dialog.getBoundingClientRect();

      const outside =
        event.clientX < bounds.left ||
        event.clientX > bounds.right ||
        event.clientY < bounds.top ||
        event.clientY > bounds.bottom;

      if (outside) dialog.close();
    }
  });

  // Échap est géré par le <dialog> natif.
  dialog.addEventListener("close", () => {
    clearTimeout(openingTimer);

    document.documentElement.classList.remove("pc-modal-open");

    setPanelOpen(false);
    launcher.focus({ preventScroll: true });
  });

  setPanelOpen(false);
})();
