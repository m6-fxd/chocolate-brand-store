document.addEventListener("DOMContentLoaded", () => {
  const store = window.CacaoStore;
  const detail = document.querySelector("#product-detail");

  store.getProducts().then((products) => {
    const selected = products.find((product) => product.id === new URLSearchParams(location.search).get("id"));
    if (!selected) {
      document.title = "Chocolate not found — Cacao & Co.";
      detail.innerHTML = '<div class="not-found"><span class="eyebrow">A little mix-up</span><h1>This chocolate has wandered off.</h1><p>It may have sold out, or the link might be a little stale.</p><a class="button button-dark" href="shop.html">Back to the good stuff <span>↗</span></a></div>';
    } else {
      document.title = `${selected.name} — Cacao & Co.`;
      const image = store.safeImageUrl(selected.image);
      detail.innerHTML = `
        <div class="breadcrumbs"><a href="index.html">Home</a><span>/</span><a href="shop.html">Shop</a><span>/</span><span>${store.escapeHtml(selected.name)}</span></div>
        <div class="detail-layout">
          <div class="detail-image-wrap"><img src="${store.escapeHtml(image)}" alt="${store.escapeHtml(selected.name)} chocolate"></div>
          <div class="detail-copy"><span class="eyebrow">${store.escapeHtml(selected.category)} · ${store.escapeHtml(selected.size)}</span>
            <h1>${store.escapeHtml(selected.name)}${selected.badge ? `<span class="detail-badge">${store.escapeHtml(selected.badge)}</span>` : ""}</h1>
            <p class="detail-price">${store.formatPrice(selected.price)}</p><p class="detail-description">${store.escapeHtml(selected.description)}</p>
            <p class="ingredient-note"><span>✳</span> Thoughtfully made with real ingredients.</p>
            <button class="button button-dark detail-add" type="button" data-add-to-cart="${store.escapeHtml(selected.id)}">Add to bag — ${store.formatPrice(selected.price)} <span>↗</span></button>
            <div class="detail-promise"><p>Made in small batches</p><p>Carefully sourced cacao</p><p>A little joy in every bite</p></div>
          </div>
        </div>`;
    }

    document.querySelector("#related-products").innerHTML = products
      .filter((product) => product.id !== selected?.id)
      .slice(0, 4)
      .map(store.productCard)
      .join("");
  }).catch((error) => store.showPageError(error.message));
  store.initSite();
});
