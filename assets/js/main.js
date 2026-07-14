const toggle = document.querySelector("[data-menu-toggle]");
const nav = document.querySelector("[data-nav-links]");

if (toggle && nav) {
  toggle.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(isOpen));
  });
}

document.querySelectorAll("[data-year]").forEach((node) => {
  node.textContent = new Date().getFullYear();
});

const contactForm = document.querySelector("[data-contact-form]");

if (contactForm) {
  const sentMessage = document.querySelector("[data-form-sent]");
  const params = new URLSearchParams(window.location.search);

  if (sentMessage && params.get("sent") === "1") {
    sentMessage.hidden = false;
  }
}
