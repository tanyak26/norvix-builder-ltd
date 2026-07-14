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
  const statusMessage = document.querySelector("[data-form-status]");
  const submitButton = contactForm.querySelector("[data-submit-button]");
  const defaultButtonText = submitButton ? submitButton.textContent : "";

  contactForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (statusMessage) {
      statusMessage.hidden = true;
      statusMessage.textContent = "";
    }

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Sending...";
    }

    try {
      const formData = new FormData(contactForm);
      const payload = Object.fromEntries(formData.entries());
      const response = await fetch(contactForm.action, {
        method: "POST",
        body: JSON.stringify(payload),
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        }
      });

      if (!response.ok) {
        throw new Error("Form service failed");
      }

      contactForm.reset();

      if (statusMessage) {
        statusMessage.textContent = "Thank you. Your enquiry has been sent to Norvix Builder LTD.";
        statusMessage.hidden = false;
      }
    } catch (error) {
      if (statusMessage) {
        statusMessage.textContent = "Sorry, the enquiry service is temporarily busy. Please try again or email info@norvixbuilderltd.co.uk.";
        statusMessage.hidden = false;
      }
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = defaultButtonText;
      }
    }
  });
}
