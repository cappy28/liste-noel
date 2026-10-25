const pages = document.querySelectorAll("[data-page]");
const pageButtons = document.querySelectorAll("[data-page-button]");

function showPage(name) {
  pages.forEach((page) => {
    page.hidden = page.dataset.page !== name;
  });

  pageButtons.forEach((button) => {
    const active = button.dataset.pageButton === name;
    button.classList.toggle("is-active", active);

    if (active) {
      button.setAttribute("aria-current", "page");
    } else {
      button.removeAttribute("aria-current");
    }
  });

  if (location.hash !== `#${name}`) {
    history.replaceState(null, "", `#${name}`);
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

pageButtons.forEach((button) => {
  button.addEventListener("click", () => {
    showPage(button.dataset.pageButton);
  });
});

document.querySelector(".brand").addEventListener("click", (event) => {
  event.preventDefault();
  showPage("setup");
});

if (location.hash === "#ear") {
  showPage("ear");
}

// Le boîtier : son panneau se retire, les composants restent en place.
const caseStage = document.querySelector("#caseStage");
const caseToggle = document.querySelector("#caseToggle");
const caseStatus = document.querySelector("#caseStatus");
const toggleText = caseToggle.querySelector(".toggle-text");
const toggleIcon = caseToggle.querySelector(".toggle-icon");

caseToggle.addEventListener("click", () => {
  const open = caseStage.classList.toggle("is-open");

  caseToggle.setAttribute("aria-expanded", String(open));
  caseStage.setAttribute(
    "aria-label",
    open
      ? "Illustration du boîtier ouvert : carte mère, refroidissement, mémoire, carte graphique et alimentation à leur place"
      : "Illustration du boîtier fermé, avec son panneau latéral plein"
  );

  toggleText.textContent = open
    ? "Refermer le boîtier"
    : "Ouvrir le boîtier";

  toggleIcon.textContent = open ? "−" : "＋";
  caseStatus.textContent = open
    ? "Les composants sont en place"
    : "Panneau fermé";
});

// La souris bouge indépendamment ; le clavier ne bouge jamais.
const mouse = document.querySelector("#mouseImage");
const logitechPicture = document.querySelector(".logitech-picture");

logitechPicture.addEventListener("pointerenter", () => {
  mouse.classList.add("mouse-moving");
});

logitechPicture.addEventListener("pointerleave", () => {
  mouse.classList.remove("mouse-moving");
});

// Si une image locale manque, on affiche une indication plutôt
// que de remplacer le vrai produit par une image inventée.
document.querySelectorAll("img[data-image]").forEach((image) => {
  image.addEventListener("error", () => {
    image.hidden = true;

    const picture = image.closest(
      ".hero-picture, .case-product-image, .product-picture, .ear-picture"
    );

    const help = picture?.querySelector(".image-help");
    if (help) help.hidden = false;
  });
});

// Si la vidéo n'est pas encore fournie, la photo de l'écran reste visible.
const screenVideo = document.querySelector(".screen-video");
screenVideo.addEventListener("error", () => {
  screenVideo.hidden = true;
});
