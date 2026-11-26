# Cacao & Co.

A responsive chocolate storefront with a product catalog, individual product pages, and a simple admin preview for managing products and the homepage promotion.

## Run locally

Open `index.html` in a browser, or serve this directory with any static web server, for example:

```sh
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## Included pages

- `index.html` — homepage, featured products, brand story, and newsletter form preview.
- `shop.html` — searchable, category-filtered product catalog.
- `product.html?id=...` — product detail page.
- `admin.html` — add, edit, and remove products; update the homepage promotion.

The admin and storefront share product, banner, and bag data through browser `localStorage`, so changes persist in the same browser. This is a front-end prototype, not a production commerce backend: there is no admin authentication, shared database, checkout, or connected newsletter service. Before deploying a live store, connect secure server-side admin authentication and persistent storage.

Product and promotion images use remote image URLs. The typefaces are loaded from Google Fonts.

## Netlify badge

The “Powered by Netlify” badge is managed by Netlify, not this site's source files. If it is enabled for your project and your plan allows removal, turn it off in **Project configuration → General → Powered by Netlify badge**. Netlify may require a plan change if the control is locked.
