document.addEventListener("DOMContentLoaded", async () => {
  const store = window.CacaoStore;
  const db = window.CacaoDB;
  const bannerForm = document.querySelector("#banner-form");
  const productForm = document.querySelector("#product-form");
  const feedback = document.querySelector("#product-feedback");
  const bannerFeedback = document.querySelector("#banner-feedback");
  let products = [];

  if (!db.configured) {
    document.body.classList.remove("auth-pending");
    store.showPageError("Connect Supabase and run database.sql before using the admin workspace.");
    location.href = "admin-login.html";
    return;
  }

  try {
    const session = await db.getSession();
    if (!session) {
      location.replace("admin-login.html");
      return;
    }
    const profile = await db.getProfile(session.user.id);
    if (profile.role !== "admin") {
      await db.signOut();
      location.replace("admin-login.html");
      return;
    }
  } catch {
    location.replace("admin-login.html");
    return;
  }

  document.body.classList.remove("auth-pending");
  store.initSite();
  document.querySelector("#admin-date").textContent = new Intl.DateTimeFormat("en-US", {
    weekday: "long", month: "long", day: "numeric"
  }).format(new Date());

  function populateBannerForm(banner) {
    const fields = {
      eyebrow: banner.eyebrow,
      title: banner.title,
      description: banner.description,
      buttonText: banner.buttonText,
      buttonLink: banner.buttonLink,
      image: banner.image
    };
    for (const [name, value] of Object.entries(fields)) {
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

  async function renderActivity() {
    const [activity, subscriberCount] = await Promise.all([db.getAdminActivity(), db.getSubscriberCount()]);
    document.querySelector("#subscriber-count").textContent = subscriberCount ?? 0;
    document.querySelector("#activity-count").textContent = activity.length;
    document.querySelector("#admin-activity-list").innerHTML = activity.length ? activity.map((item) => `
      <div class="admin-activity-row">
        <span class="activity-dot"></span>
        <strong>${store.escapeHtml(item.action.toLowerCase())} ${store.escapeHtml(item.record_type.replaceAll("_", " "))}</strong>
        <span>${store.escapeHtml(item.record_id)}</span>
        <time datetime="${store.escapeHtml(item.created_at)}">${new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.created_at))}</time>
      </div>`).join("") : '<p class="empty-state">Your store updates will appear here.</p>';
  }

  function clearProductForm() {
    productForm.reset();
    productForm.elements.id.value = "";
    document.querySelector("#product-form-title").textContent = "Add a product";
    document.querySelector("#product-submit").innerHTML = 'Add product <span>↗</span>';
    document.querySelector("#cancel-edit").classList.add("is-hidden");
  }

  bannerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submit = bannerForm.querySelector('[type="submit"]');
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
    const originalText = submit.innerHTML;
    submit.disabled = true;
    bannerFeedback.textContent = "";
    try {
      await store.saveBanner({
        eyebrow: String(values.get("eyebrow")).trim(),
        title: String(values.get("title")).trim(),
        description: String(values.get("description")).trim(),
        buttonText: String(values.get("buttonText")).trim(),
        buttonLink: store.safeLink(linkInput),
        image: store.safeImageUrl(imageInput) || String(bannerForm.elements.image.dataset.savedImage || "")
      });
      bannerFeedback.textContent = "Promotion saved to your store.";
      await renderActivity();
    } catch (error) {
      bannerFeedback.textContent = `Couldn't save the promotion: ${error.message}`;
    } finally {
      submit.disabled = false;
      submit.innerHTML = originalText;
    }
  });

  productForm.addEventListener("submit", async (event) => {
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
    const submit = document.querySelector("#product-submit");
    const originalText = submit.innerHTML;
    submit.disabled = true;
    feedback.textContent = "";
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
    try {
      await store.saveProduct(product);
      products = await store.getProducts();
      renderProducts();
      clearProductForm();
      feedback.textContent = "Product saved to your collection.";
      await renderActivity();
    } catch (error) {
      feedback.textContent = `Couldn't save the product: ${error.message}`;
    } finally {
      submit.disabled = false;
      submit.innerHTML = originalText;
    }
  });

  document.querySelector("#cancel-edit").addEventListener("click", clearProductForm);
  document.querySelector("#admin-product-list").addEventListener("click", async (event) => {
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
      deleteButton.disabled = true;
      try {
        await store.deleteProduct(product.id);
        products = await store.getProducts();
        renderProducts();
        feedback.textContent = `${product.name} was removed.`;
        await renderActivity();
      } catch (error) {
        feedback.textContent = `Couldn't remove the product: ${error.message}`;
      } finally {
        deleteButton.disabled = false;
      }
    }
  });

  document.querySelector("#admin-signout").addEventListener("click", async () => {
    try {
      const result = await db.signOut();
      if (result.error) throw result.error;
      location.replace("admin-login.html");
    } catch (error) {
      store.showToast(`Couldn't sign out: ${error.message}`);
    }
  });

  try {
    const [banner, productRows] = await Promise.all([store.getBanner(), store.getProducts()]);
    bannerForm.elements.image.dataset.savedImage = banner.image;
    populateBannerForm(banner);
    products = productRows;
    renderProducts();
    await renderActivity();
  } catch (error) {
    store.showPageError(`Couldn't load the admin workspace: ${error.message}`);
  }
});
