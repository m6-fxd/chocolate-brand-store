document.addEventListener("DOMContentLoaded", () => {
  const store = window.CacaoStore;
  Promise.all([store.getBanner(), store.getProducts()]).then(([banner, allProducts]) => {
    document.querySelector("#hero-eyebrow").textContent = banner.eyebrow;
    document.querySelector("#hero-title").textContent = banner.title;
    document.querySelector("#hero-description").textContent = banner.description;
    const link = document.querySelector("#hero-link");
    link.href = store.safeLink(banner.buttonLink);
    link.innerHTML = `${store.escapeHtml(banner.buttonText)} <span>↗</span>`;
    const heroImage = store.safeImageUrl(banner.image);
    document.querySelector("#hero-art").style.backgroundImage = heroImage ? `url("${heroImage.replace(/["\\]/g, "")}")` : "";
    const products = allProducts.slice(0, 4);
    document.querySelector("#featured-products").innerHTML = products.length
      ? products.map(store.productCard).join("")
      : '<p class="empty-state">A fresh batch is on its way. Check back soon.</p>';
  }).catch((error) => store.showPageError(error.message));

  document.querySelector("#newsletter-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const submit = form.querySelector("button");
    submit.disabled = true;
    window.CacaoDB.subscribeEmail(form.elements.email.value).then(() => {
      document.querySelector("#newsletter-message").textContent = "You're on the list. Something sweet is headed your way.";
      form.reset();
    }).catch((error) => {
      document.querySelector("#newsletter-message").textContent = error.code === "23505"
        ? "You're already on the list. We'll be in touch."
        : `We couldn't save your signup: ${error.message}`;
    }).finally(() => { submit.disabled = false; });
  });
  store.initSite();
});
