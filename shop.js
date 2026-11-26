document.addEventListener("DOMContentLoaded", () => {
  const store = window.CacaoStore;
  const filters = document.querySelector("#filters");
  const search = document.querySelector("#product-search");
  const grid = document.querySelector("#shop-products");
  const count = document.querySelector("#results-count");
  let activeCategory = "All chocolate";
  let products = [];

  function render() {
    const query = search.value.trim().toLowerCase();
    const visibleProducts = products.filter((product) => {
      const categoryMatches = activeCategory === "All chocolate" || product.category === activeCategory;
      const searchMatches = `${product.name} ${product.category} ${product.description}`.toLowerCase().includes(query);
      return categoryMatches && searchMatches;
    });
    count.textContent = `${visibleProducts.length} ${visibleProducts.length === 1 ? "little favorite" : "little favorites"}`;
    grid.innerHTML = visibleProducts.length ? visibleProducts.map(store.productCard).join("")
      : '<p class="empty-state">Nothing in this batch just yet. Try another search.</p>';
  }

  filters.addEventListener("click", (event) => {
    const button = event.target.closest("[data-category]");
    if (!button) return;
    activeCategory = button.dataset.category;
    filters.querySelectorAll(".filter-chip").forEach((chip) => {
      const active = chip === button;
      chip.classList.toggle("is-active", active);
      chip.setAttribute("aria-pressed", String(active));
    });
    render();
  });
  search.addEventListener("input", render);
  store.getProducts().then((items) => {
    products = items;
    const categories = ["All chocolate", ...new Set(products.map((product) => product.category))];
    filters.innerHTML = categories.map((category, index) =>
      `<button class="filter-chip${index === 0 ? " is-active" : ""}" type="button" data-category="${store.escapeHtml(category)}" aria-pressed="${index === 0}">${store.escapeHtml(category)}</button>`
    ).join("");
    render();
  }).catch((error) => store.showPageError(error.message));
  store.initSite();
});
