document.addEventListener("DOMContentLoaded", () => {
  const store = window.CacaoStore;
  const banner = store.getBanner();
  document.querySelector("#hero-eyebrow").textContent = banner.eyebrow;
  document.querySelector("#hero-title").textContent = banner.title;
  document.querySelector("#hero-description").textContent = banner.description;
  const link = document.querySelector("#hero-link");
  link.href = store.safeLink(banner.buttonLink);
  link.innerHTML = `${store.escapeHtml(banner.buttonText)} <span>↗</span>`;
  const heroImage = store.safeImageUrl(banner.image);
  document.querySelector("#hero-art").style.backgroundImage = heroImage ? `url("${heroImage.replace(/["\\]/g, "")}")` : "";

  const products = store.getProducts().slice(0, 4);
  document.querySelector("#featured-products").innerHTML = products.length
    ? products.map(store.productCard).join("")
    : '<p class="empty-state">A fresh batch is on its way. Check back soon.</p>';

  document.querySelector("#newsletter-form").addEventListener("submit", (event) => {
    event.preventDefault();
    document.querySelector("#newsletter-message").textContent = "Thanks for your interest — newsletter signup isn't connected yet.";
    event.currentTarget.reset();
  });
  store.initSite();
});
