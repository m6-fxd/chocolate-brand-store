document.addEventListener("DOMContentLoaded", async () => {
  const store = window.CacaoStore;
  const db = window.CacaoDB;
  const bannerForm = document.querySelector("#banner-form");
  const productForm = document.querySelector("#product-form");
  const feedback = document.querySelector("#product-feedback");
  const bannerFeedback = document.querySelector("#banner-feedback");
  const photoInput = document.querySelector("#product-photo-file");
  const vectorizeButton = document.querySelector("#vectorize-image");
  const vectorizeFeedback = document.querySelector("#vectorize-feedback");
  const imagePreview = document.querySelector("#product-image-preview");
  const imagePreviewElement = document.querySelector("#product-image-preview-img");
  const imageSize = document.querySelector("#product-image-size");
  let convertedSvg = null;
  let previewUrl = "";
  let conversionId = 0;
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

  async function renderContactMessages() {
      const messages = await db.getContactMessages();
      document.querySelector("#contact-total").textContent = messages.filter((message) => message.status === "new").length;
      document.querySelector("#admin-contact-list").innerHTML = messages.length ? messages.map((message) => `
        <article class="admin-contact-message">
          <div class="admin-contact-message-heading">
            <div><strong>${store.escapeHtml(message.name)}</strong><a href="mailto:${store.escapeHtml(message.email)}">${store.escapeHtml(message.email)}</a></div>
            <div class="admin-contact-message-meta"><span class="contact-status contact-status-${store.escapeHtml(message.status)}">${store.escapeHtml(message.status)}</span><time datetime="${store.escapeHtml(message.created_at)}">${new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(message.created_at))}</time></div>
          </div>
          <span class="admin-contact-topic">${store.escapeHtml(message.topic)}</span>
          <p>${store.escapeHtml(message.message)}</p>
          ${message.status === "new" ? `<button class="row-action" type="button" data-contact-handled="${store.escapeHtml(message.id)}">Mark handled</button>` : ""}
        </article>`).join("") : '<p class="empty-state">No notes yet. They will appear here when someone writes in.</p>';
  }

  function clearProductForm() {
    conversionId += 1;
    productForm.reset();
    productForm.elements.id.value = "";
    clearConvertedImage();
    document.querySelector("#product-form-title").textContent = "Add a product";
    document.querySelector("#product-submit").innerHTML = 'Add product <span>↗</span>';
    document.querySelector("#cancel-edit").classList.add("is-hidden");
  }

  function clearConvertedImage() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = "";
    convertedSvg = null;
    imagePreviewElement.removeAttribute("src");
    imagePreview.classList.add("is-hidden");
    imageSize.textContent = "";
    vectorizeFeedback.textContent = "";
    vectorizeFeedback.classList.remove("is-error");
    vectorizeButton.disabled = true;
  }

  function sanitizeSvg(source) {
    const document = new DOMParser().parseFromString(source, "image/svg+xml");
    const root = document.documentElement;
    if (root.localName !== "svg" || document.querySelector("parsererror")) {
      throw new Error("The photo couldn't be converted into a valid SVG.");
    }
    root.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    root.querySelectorAll("script, style, foreignObject, iframe, object, embed").forEach((element) => element.remove());
    [root, ...root.querySelectorAll("*")].forEach((element) => {
      for (const attribute of [...element.attributes]) {
        if (/^on/i.test(attribute.name) || /^(href|xlink:href|src|srcset)$/i.test(attribute.name) || /url\s*\(/i.test(attribute.value)) {
          element.removeAttribute(attribute.name);
        }
      }
    });
    return new XMLSerializer().serializeToString(root);
  }

  function traceImage(imageData) {
    return new Promise((resolve, reject) => {
      const worker = new Worker(new URL("svg-tracer-worker.js", document.baseURI));
      const timeout = window.setTimeout(() => {
        worker.terminate();
        reject(new Error("This image has too much detail to convert quickly. Try a simpler photo."));
      }, 30000);
      const finish = (callback, value) => {
        window.clearTimeout(timeout);
        worker.terminate();
        callback(value);
      };

      worker.addEventListener("message", (event) => {
        if (event.data.error) finish(reject, new Error(event.data.error));
        else finish(resolve, event.data.svg);
      }, { once: true });
      worker.addEventListener("error", () => {
        finish(reject, new Error("The SVG converter failed to load. Check your connection and try again."));
      }, { once: true });

      try {
        worker.postMessage({
          pixels: imageData.data.buffer,
          width: imageData.width,
          height: imageData.height
        }, [imageData.data.buffer]);
      } catch (error) {
        finish(reject, error);
      }
    });
  }

  async function convertPhoto() {
    const file = photoInput.files[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
      vectorizeFeedback.textContent = "Choose a JPG, PNG, WebP, or GIF image.";
      vectorizeFeedback.classList.add("is-error");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      vectorizeFeedback.textContent = "That photo is over 5 MB. Choose a smaller image.";
      vectorizeFeedback.classList.add("is-error");
      return;
    }

    const requestId = ++conversionId;
    clearConvertedImage();
    vectorizeButton.disabled = true;
    vectorizeFeedback.classList.remove("is-error");
    vectorizeFeedback.textContent = "Tracing your photo into SVG…";

    try {
      const sourceUrl = URL.createObjectURL(file);
      let image;
      try {
        image = await new Promise((resolve, reject) => {
          const element = new Image();
          element.onload = () => resolve(element);
          element.onerror = () => reject(new Error("We couldn't read that photo. Try another image."));
          element.src = sourceUrl;
        });
      } finally {
        URL.revokeObjectURL(sourceUrl);
      }

      if (image.naturalWidth > 12000 || image.naturalHeight > 12000) {
        throw new Error("That photo is too large to trace. Try an image under 12,000 pixels per side.");
      }
      const scale = Math.min(1, 420 / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error("Your browser couldn't prepare the image for conversion.");
      context.drawImage(image, 0, 0, canvas.width, canvas.height);

      const traced = await traceImage(context.getImageData(0, 0, canvas.width, canvas.height));
      if (requestId !== conversionId) return;
      const svgBlob = new Blob([sanitizeSvg(traced)], { type: "image/svg+xml" });
      if (svgBlob.size > 4 * 1024 * 1024) {
        throw new Error("The traced SVG is too large to upload. Try a simpler photo with fewer details.");
      }
      convertedSvg = svgBlob;
      previewUrl = URL.createObjectURL(svgBlob);
      imagePreviewElement.src = previewUrl;
      imagePreview.classList.remove("is-hidden");
      imageSize.textContent = `${(svgBlob.size / 1024).toFixed(0)} KB SVG`;
      vectorizeFeedback.textContent = "SVG ready. It will upload when you save the product.";
      productForm.elements.image.value = "";
    } catch (error) {
      if (requestId !== conversionId) return;
      vectorizeFeedback.textContent = error.message || "We couldn't convert that photo.";
      vectorizeFeedback.classList.add("is-error");
    } finally {
      if (requestId === conversionId) vectorizeButton.disabled = !photoInput.files.length;
    }
  }

  photoInput.addEventListener("change", () => {
    conversionId += 1;
    clearConvertedImage();
    if (photoInput.files.length) {
      productForm.elements.image.value = "";
      vectorizeButton.disabled = false;
      vectorizeFeedback.textContent = "Photo selected. Convert it when you're ready.";
    }
  });
  vectorizeButton.addEventListener("click", convertPhoto);
  document.querySelector("#clear-product-image").addEventListener("click", () => {
    conversionId += 1;
    photoInput.value = "";
    clearConvertedImage();
  });
  productForm.elements.image.addEventListener("input", () => {
    if (!productForm.elements.image.value || !photoInput.files.length) return;
    conversionId += 1;
    photoInput.value = "";
    clearConvertedImage();
  });

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
    if (!convertedSvg && !store.safeImageUrl(image)) {
      feedback.textContent = "Convert an uploaded photo to SVG or enter a valid http or https image URL.";
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
      if (convertedSvg) product.image = await db.uploadProductImage(id, convertedSvg);
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
        let cleanupMessage = "";
        try {
          await db.deleteProductImage(product.image);
        } catch (error) {
          cleanupMessage = ` The product was removed, but its stored photo couldn't be cleaned up: ${error.message}`;
        }
        products = await store.getProducts();
        renderProducts();
        feedback.textContent = cleanupMessage || `${product.name} was removed.`;
        await renderActivity();
      } catch (error) {
        feedback.textContent = `Couldn't remove the product: ${error.message}`;
      } finally {
        deleteButton.disabled = false;
      }
    }
  });

  document.querySelector("#admin-contact-list").addEventListener("click", async (event) => {
    const button = event.target.closest("[data-contact-handled]");
    if (!button) return;
    button.disabled = true;
    try {
      await db.updateContactMessageStatus(button.dataset.contactHandled, "handled");
      await renderContactMessages();
    } catch (error) {
      store.showToast(`Couldn't update the message: ${error.message}`);
      button.disabled = false;
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
    await Promise.all([renderActivity(), renderContactMessages()]);
  } catch (error) {
    store.showPageError(`Couldn't load the admin workspace: ${error.message}`);
  }
});
