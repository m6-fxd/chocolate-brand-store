(() => {
  const productKey = "cacao-co-products-v1";
  const bannerKey = "cacao-co-banner-v1";
  const cartKey = "cacao-co-cart-v1";
  const photo = (id, width = 900) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=85`;
  const defaultProducts = [
    { id: "midnight-crunch", name: "Midnight Crunch", category: "Dark chocolate", description: "Deep, silky dark chocolate with a little roasted almond crunch and a pinch of flaky sea salt.", price: 12, size: "80g bar", image: photo("photo-1606313564200-e75d5e30476c"), badge: "Bestseller" },
    { id: "milk-honey", name: "Milk & Honey", category: "Milk chocolate", description: "Creamy, dreamy milk chocolate with a hint of golden honey. A soft spot in every day.", price: 11, size: "80g bar", image: photo("photo-1548907040-4d42baa1d13a"), badge: "A little favorite" },
    { id: "berry-blush", name: "Berry Blush", category: "White chocolate", description: "Sweet white chocolate meets bright, tart raspberry. The fun one in the box.", price: 13, size: "80g bar", image: photo("photo-1511381939415-e44015466834"), badge: "" },
    { id: "the-slow-sunday", name: "The Slow Sunday", category: "Gift boxes", description: "A thoughtful collection of our most-loved bars, ready to make somebody's day.", price: 28, size: "4-piece box", image: photo("photo-1549007994-cb92caebd54b"), badge: "Made for sharing" },
    { id: "orange-grove", name: "Orange Grove", category: "Dark chocolate", description: "Bright citrus peel tucked into rich dark chocolate. A little sunshine, whenever you need it.", price: 12, size: "80g bar", image: photo("photo-1606313564200-e75d5e30476c"), badge: "" },
    { id: "soft-center", name: "Soft Center", category: "Gift boxes", description: "A box of tender, hand-finished ganache truffles for the people you love (including you).", price: 24, size: "9-piece box", image: photo("photo-1548907040-4d42baa1d13a"), badge: "Gift-ready" }
  ];
  const defaultBanner = {
    eyebrow: "A sweeter kind of everyday",
    title: "A little more delicious.",
    description: "Small-batch chocolate, made slowly and shared generously. Find your new favorite little ritual.",
    buttonText: "Discover the collection",
    buttonLink: "shop.html",
    image: photo("photo-1606313564200-e75d5e30476c", 1400)
  };

  function safeImageUrl(value) {
    try {
      const url = new URL(value, window.location.href);
      return ["https:", "http:"].includes(url.protocol) ? url.href : "";
    } catch {
      return "";
    }
  }

  function safeLink(value) {
    const link = String(value || "").trim();
    if (/^(https?:\/\/|\/|\.\/|#|[a-z0-9_-]+\.html(?:[?#].*)?$)/i.test(link) && !/^javascript:/i.test(link)) return link;
    return "shop.html";
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[character]);
  }

  function getProducts() {
    const saved = localStorage.getItem(productKey);
    return saved === null ? defaultProducts.map((product) => ({ ...product })) : JSON.parse(saved);
  }

  function saveProducts(products) {
    localStorage.setItem(productKey, JSON.stringify(products));
  }

  function getBanner() {
    const saved = localStorage.getItem(bannerKey);
    return saved === null ? { ...defaultBanner } : { ...defaultBanner, ...JSON.parse(saved) };
  }

  function saveBanner(banner) {
    localStorage.setItem(bannerKey, JSON.stringify(banner));
  }

  function formatPrice(price) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(price));
  }

  function productCard(product) {
    const image = safeImageUrl(product.image);
    return `<article class="product-card">
      <a class="product-image-link" href="product.html?id=${encodeURIComponent(product.id)}">
        <div class="product-image-wrap"><img class="product-image" src="${escapeHtml(image)}" alt="${escapeHtml(product.name)} chocolate" loading="lazy">${product.badge ? `<span class="product-badge">${escapeHtml(product.badge)}</span>` : ""}</div>
      </a>
      <div class="product-meta"><div><a class="product-name" href="product.html?id=${encodeURIComponent(product.id)}">${escapeHtml(product.name)}</a><span class="product-category">${escapeHtml(product.category)} · ${escapeHtml(product.size)}</span></div><span class="product-price">${formatPrice(product.price)}</span></div>
      <button class="quick-add" type="button" data-add-to-cart="${escapeHtml(product.id)}" aria-label="Add ${escapeHtml(product.name)} to bag">Add to bag <span>＋</span></button>
    </article>`;
  }

  function getCart() {
    const saved = localStorage.getItem(cartKey);
    return saved === null ? [] : JSON.parse(saved);
  }

  function updateCartCount() {
    const count = getCart().reduce((total, item) => total + item.quantity, 0);
    document.querySelectorAll("#cart-count").forEach((element) => { element.textContent = count; });
  }

  function showToast(message) {
    const toast = document.querySelector("#toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("is-visible");
    window.clearTimeout(showToast.timeout);
    showToast.timeout = window.setTimeout(() => toast.classList.remove("is-visible"), 2400);
  }

  function initSite() {
    updateCartCount();
    document.addEventListener("click", (event) => {
      const button = event.target.closest("[data-add-to-cart]");
      if (!button) return;
      const id = button.dataset.addToCart;
      const cart = getCart();
      const existing = cart.find((item) => item.id === id);
      if (existing) existing.quantity += 1;
      else cart.push({ id, quantity: 1 });
      localStorage.setItem(cartKey, JSON.stringify(cart));
      updateCartCount();
      showToast("A little something added to your bag.");
    });
    document.querySelectorAll(".menu-toggle").forEach((button) => {
      button.addEventListener("click", () => {
        const nav = document.querySelector(".main-nav");
        const expanded = button.getAttribute("aria-expanded") === "true";
        button.setAttribute("aria-expanded", String(!expanded));
        nav.classList.toggle("is-open", !expanded);
      });
    });
  }

  window.CacaoStore = { getProducts, saveProducts, getBanner, saveBanner, formatPrice, productCard, escapeHtml, safeImageUrl, safeLink, initSite, showToast };
})();
