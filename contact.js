document.addEventListener("DOMContentLoaded", () => {
  const store = window.CacaoStore;
  const form = document.querySelector("#contact-form");
  const feedback = document.querySelector("#contact-feedback");
  const message = form.elements.message;
  const count = document.querySelector("#contact-char-count");

  message.addEventListener("input", () => {
    count.textContent = `${message.value.length} / 2000`;
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submit = form.querySelector('[type="submit"]');
    const values = new FormData(form);
    if (!values.get("consent")) return;
    submit.disabled = true;
    feedback.textContent = "";
    feedback.classList.remove("is-error");
    try {
      await window.CacaoDB.sendContactMessage({
        name: String(values.get("name")).trim(),
        email: String(values.get("email")).trim().toLowerCase(),
        topic: String(values.get("topic")),
        message: String(values.get("message")).trim()
      });
      form.reset();
      count.textContent = "0 / 2000";
      feedback.textContent = "Your note is in our store inbox. Email notifications aren't connected yet.";
    } catch (error) {
      feedback.textContent = `We couldn't save your note: ${error.message}`;
      feedback.classList.add("is-error");
    } finally {
      submit.disabled = false;
    }
  });

  store.initSite();
});
