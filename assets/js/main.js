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

  contactForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const submitButton = contactForm.querySelector("[data-submit-button]");
    const data = new FormData(contactForm);
    const name = String(data.get("name") || "").trim();
    const phone = String(data.get("phone") || "").trim();
    const email = String(data.get("email") || "").trim();
    const service = String(data.get("service") || "").trim();
    const location = String(data.get("location") || "").trim();
    const message = String(data.get("message") || "").trim();
    const subject = encodeURIComponent(`New Norvix Builder LTD enquiry from ${name || "website visitor"}`);
    const body = encodeURIComponent(
      [
        "New website enquiry",
        "",
        `Name: ${name}`,
        `Phone: ${phone}`,
        `Email: ${email}`,
        `Service: ${service}`,
        `Project location: ${location || "Not provided"}`,
        "",
        "Project details:",
        message
      ].join("\n")
    );

    if (submitButton) {
      submitButton.textContent = "Opening email...";
    }

    window.location.href = `mailto:info@norvixbuilderltd.co.uk?subject=${subject}&body=${body}`;

    if (sentMessage) {
      sentMessage.hidden = false;
    }

    window.setTimeout(() => {
      if (submitButton) {
        submitButton.textContent = "Email Norvix Builder";
      }
    }, 1200);
  });
}
