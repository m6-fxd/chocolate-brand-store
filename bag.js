document.addEventListener("DOMContentLoaded", async () => {
  const store = window.CacaoStore;
  const itemsContainer = document.querySelector("#bag-items");
  const subtotalElement = document.querySelector("#bag-subtotal");
  const checkoutLink = document.querySelector("#whatsapp-checkout");
  let items = [];

  function renderBag() {
    const total = items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);
    subtotalElement.textContent = store.formatPrice(total);
    if (!items.length) {
      itemsContainer.innerHTML = '<p class="empty-state">Your bag is waiting for something lovely. <a class="text-link" href="shop.html">Find your favorites ↗</a></p>';
      checkoutLink.href = "#";
      checkoutLink.classList.add("is-disabled");
      checkoutLink.setAttribute("aria-disabled", "true");
      return;
    }

    itemsContainer.innerHTML = items.map((item) => `
      <article class="bag-item">
        <a class="bag-item-image" href="product.html?id=${encodeURIComponent(item.id)}">
          <img src="${store.escapeHtml(store.safeImageUrl(item.image))}" alt="" loading="lazy">
        </a>
        <div class="bag-item-details">
          <a class="bag-item-name" href="product.html?id=${encodeURIComponent(item.id)}">${store.escapeHtml(item.name)}</a>
          <span>${store.escapeHtml(item.category)} · ${store.escapeHtml(item.size)}</span>
          <strong>${store.formatPrice(item.price)} each</strong>
          <div class="bag-item-actions">
            <div class="quantity-control" aria-label="Quantity for ${store.escapeHtml(item.name)}">
              <button type="button" data-cart-delta="-1" data-product-id="${store.escapeHtml(item.id)}" aria-label="Decrease ${store.escapeHtml(item.name)} quantity">−</button>
              <span>${item.quantity}</span>
              <button type="button" data-cart-delta="1" data-product-id="${store.escapeHtml(item.id)}" aria-label="Increase ${store.escapeHtml(item.name)} quantity" ${item.quantity >= 99 ? "disabled" : ""}>+</button>
            </div>
            <button type="button" class="bag-remove" data-cart-remove="${store.escapeHtml(item.id)}">Remove</button>
          </div>
        </div>
        <strong class="bag-line-total">${store.formatPrice(Number(item.price) * item.quantity)}</strong>
      </article>`).join("");
    checkoutLink.href = store.buildWhatsAppOrderUrl(items);
    checkoutLink.classList.remove("is-disabled");
    checkoutLink.setAttribute("aria-disabled", "false");
  }

  async function refreshBag() {
    items = await store.getBagItems();
    renderBag();
  }

  store.initSite();
  try {
    await refreshBag();
  } catch (error) {
    itemsContainer.innerHTML = `<p class="empty-state">Your bag couldn't be loaded: ${store.escapeHtml(error.message)}</p>`;
    checkoutLink.classList.add("is-disabled");
    checkoutLink.setAttribute("aria-disabled", "true");
  }

  itemsContainer.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-cart-delta], [data-cart-remove]");
    if (!button) return;
    const productId = button.dataset.productId || button.dataset.cartRemove;
    const item = items.find((current) => current.id === productId);
    if (!item) return;
    const nextQuantity = button.hasAttribute("data-cart-remove")
      ? 0
      : Math.max(1, item.quantity + Number(button.dataset.cartDelta));
    button.disabled = true;
    try {
      await store.setBagItemQuantity(productId, nextQuantity);
      await refreshBag();
    } catch (error) {
      store.showToast(`Your bag couldn't be updated: ${error.message}`);
      button.disabled = false;
    }
  });
});
