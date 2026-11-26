document.addEventListener("DOMContentLoaded", () => {
  const store = window.CacaoStore;
  const bannerForm = document.querySelector("#banner-form");
  const productForm = document.querySelector("#product-form");
  const feedback = document.querySelector("#product-feedback");
  const bannerFeedback = document.querySelector("#banner-feedback");
  let products = store.getProducts();
  let banner = store.getBanner();

  document.querySelector("#admin-date").textContent = new Intl.DateTimeFormat("en-US", {
    weekday: "long", month: "long", day: "numeric"
  }).format(new Date());

  function populateBannerForm() {
    for (const [name, value] of Object.entries(banner)) {
      if (bannerForm.elements[name]) bannerForm.elements[name].value = value;
    }
  }

  function renderProducts() {
    document.querySelector("#product-total").textContent = products.length;
    const list = document.querySelector("#admin-product-list");
    list.innerHTML = products.length ? products.map((product) => `
      <article class="admin-product-row">
        <img src="${store.escapeHtml(store.safeImageUrl(product.image))}" alt="" loading="lazy">
        <div class="admin-product-info"><strong>${store.escapeHtml(product.name)}</strong><span>${store.escapeHtml(product.category)} · ${store.escapeHtml(product.size)}</span></div>
        <strong class="admin-row-price">${store.formatPrice(product.price)}</strong>
        <div class="row-actions"><button type="button" class="row-action" data-edit="${store.escapeHtml(product.id)}">Edit</button><button type="button" class="row-action delete-action" data-delete="${store.escapeHtml(product.id)}">Remove</button></div>
      </article>`).join("") : '<p class="empty-state">No products yet. Add something lovely above.</p>';
  }

  function clearProductForm() {
    productForm.reset();
    productForm.elements.id.value = "";
    document.querySelector("#product-form-title").textContent = "Add a product";
    document.querySelector("#product-submit").innerHTML = 'Add product <span>↗</span>';
    document.querySelector("#cancel-edit").classList.add("is-hidden");
  }

  bannerForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const values = new FormData(bannerForm);
    const imageInput = String(values.get("image")).trim();
    const linkInput = String(values.get("buttonLink")).trim();
    if (imageInput && !store.safeImageUrl(imageInput)) {
      bannerFeedback.textContent = "Please enter a valid http or https image URL.";
      return;
    }
    if (!linkInput) {
      bannerFeedback.textContent = "Please enter a destination for the button.";
      return;
    }
    banner = {
      eyebrow: String(values.get("eyebrow")).trim(),
      title: String(values.get("title")).trim(),
      description: String(values.get("description")).trim(),
      buttonText: String(values.get("buttonText")).trim(),
      buttonLink: store.safeLink(linkInput),
      image: imageInput ? store.safeImageUrl(imageInput) : banner.image
    };
    store.saveBanner(banner);
    bannerFeedback.textContent = "Promotion saved. Your homepage is looking lovely.";
  });

  productForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const values = new FormData(productForm);
    const image = String(values.get("image")).trim();
    const price = Number(values.get("price"));
    if (!store.safeImageUrl(image)) {
      feedback.textContent = "Please enter a valid http or https image URL.";
      return;
    }
    if (!Number.isFinite(price) || price <= 0) {
      feedback.textContent = "Please enter a price greater than zero.";
      return;
    }
    const id = String(values.get("id")) || (crypto.randomUUID ? crypto.randomUUID() : `product-${Date.now()}`);
    const product = {
      id,
      name: String(values.get("name")).trim(),
      category: String(values.get("category")).trim(),
      description: String(values.get("description")).trim(),
      price,
      size: String(values.get("size")).trim(),
      image: store.safeImageUrl(image),
      badge: String(values.get("badge")).trim()
    };
    const existingIndex = products.findIndex((item) => item.id === id);
    if (existingIndex < 0) products.push(product);
    else products[existingIndex] = product;
    store.saveProducts(products);
    renderProducts();
    clearProductForm();
    feedback.textContent = existingIndex < 0 ? "Product added to your collection." : "Product updated.";
  });

  document.querySelector("#cancel-edit").addEventListener("click", clearProductForm);
  document.querySelector("#admin-product-list").addEventListener("click", (event) => {
    const editButton = event.target.closest("[data-edit]");
    const deleteButton = event.target.closest("[data-delete]");
    if (editButton) {
      const product = products.find((item) => item.id === editButton.dataset.edit);
      if (!product) return;
      for (const [name, value] of Object.entries(product)) {
        if (productForm.elements[name]) productForm.elements[name].value = value;
      }
      document.querySelector("#product-form-title").textContent = "Edit product";
      document.querySelector("#product-submit").innerHTML = 'Save changes <span>↗</span>';
      document.querySelector("#cancel-edit").classList.remove("is-hidden");
      productForm.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (deleteButton) {
      const product = products.find((item) => item.id === deleteButton.dataset.delete);
      if (!product || !window.confirm(`Remove ${product.name} from the collection?`)) return;
      products = products.filter((item) => item.id !== product.id);
      store.saveProducts(products);
      renderProducts();
      feedback.textContent = `${product.name} was removed.`;
    }
  });

  populateBannerForm();
  renderProducts();
});
