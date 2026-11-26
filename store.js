(() => {
  const cartKey = "cacao-co-cart-v1";

  function safeImageUrl(value) {
    try {
      const image = String(value || "").trim();
      if (!image) return "";
      const url = new URL(image);
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

  const getProducts = () => window.CacaoDB.getProducts();
  const saveProduct = (product) => window.CacaoDB.saveProduct(product);
  const deleteProduct = (id) => window.CacaoDB.deleteProduct(id);
  const getBanner = () => window.CacaoDB.getBanner();
  const saveBanner = (banner) => window.CacaoDB.saveBanner(banner);

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

  async function updateCartCount() {
    let count = getCart().reduce((total, item) => total + item.quantity, 0);
    try {
      count = (await window.CacaoDB.getCartCount()) ?? count;
    } catch (error) {
      showToast(`Bag could not be refreshed: ${error.message}`);
    }
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

  function showPageError(message) {
    let error = document.querySelector(".page-error");
    if (!error) {
      error = document.createElement("div");
      error.className = "page-error";
      const main = document.querySelector("main");
      if (main) main.prepend(error);
      else document.body.prepend(error);
    }
    error.textContent = message;
  }

  function initMotion() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const targets = document.querySelectorAll([
      ".section-heading",
      ".product-card",
      ".story-image",
      ".story-copy",
      ".newsletter-section > *",
      ".page-intro > *",
      ".shop-toolbar",
      ".detail-layout > *",
      ".story-hero-copy",
      ".story-manifesto > *",
      ".story-values-image",
      ".story-values-copy",
      ".story-ritual > *",
      ".contact-hero > *",
      ".contact-aside",
      ".contact-form-card",
      ".contact-bottom > *",
      ".admin-welcome",
      ".admin-card"
    ].join(","));

    if (!targets.length) return;
    targets.forEach((element, index) => {
      element.classList.add("reveal-on-scroll");
      if (element.matches(".product-card")) {
        element.style.setProperty("--reveal-delay", `${(index % 4) * 75}ms`);
      }
    });

    if (!("IntersectionObserver" in window)) {
      targets.forEach((element) => element.classList.add("is-revealed"));
      return;
    }

    document.documentElement.classList.add("motion-ready");
    const observer = new IntersectionObserver((entries, currentObserver) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-revealed");
        currentObserver.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -28px 0px" });
    targets.forEach((element) => observer.observe(element));
  }

  function initSite() {
    updateCartCount();
    initMotion();
    if (!window.CacaoDB?.configured && !document.querySelector(".setup-banner")) {
      const notice = document.createElement("div");
      notice.className = "setup-banner";
      notice.textContent = "Store setup required: add your Supabase project URL and publishable key to supabase-config.js, then run database.sql.";
      document.body.prepend(notice);
    }
    document.addEventListener("click", (event) => {
      const button = event.target.closest("[data-add-to-cart]");
      if (!button) return;
      const id = button.dataset.addToCart;
      window.CacaoDB.addCartItem(id).then((saved) => {
        if (!saved) {
          const cart = getCart();
          const existing = cart.find((item) => item.id === id);
          if (existing) existing.quantity += 1;
          else cart.push({ id, quantity: 1 });
          localStorage.setItem(cartKey, JSON.stringify(cart));
        }
        return updateCartCount();
      }).then(() => showToast("A little something added to your bag."))
        .catch((error) => showToast(`Could not add that to your bag: ${error.message}`));
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

  window.CacaoStore = { getProducts, saveProduct, deleteProduct, getBanner, saveBanner, formatPrice, productCard, escapeHtml, safeImageUrl, safeLink, initSite, showToast, showPageError, updateCartCount };
})();
