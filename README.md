# Cacao & Co.

A responsive chocolate storefront with Supabase customer accounts, a searchable product catalog, product pages, a protected admin workspace, a database-backed newsletter, and premium animated chocolate artwork.

## Pages

- `index.html` — homepage and featured products.
- `shop.html` — searchable, category-filtered catalog.
- `product.html?id=...` — product detail.
- `bag.html` — review products and prepare a WhatsApp order.
- `story.html` — the Cacao & Co. story and brand values.
- `contact.html` — contact form demo; messages save to the admin inbox.
- `account.html` — customer sign-in and account creation.
- `admin-login.html` — administrator sign-in.
- `admin.html` — protected product, promotion, newsletter-count, contact-inbox, and activity management.

## Supabase setup

1. In Supabase **SQL Editor**, run the updated complete `database.sql` file. For an existing project this updates its security policies, creates the protected owner record and product-photo bucket, and retains existing products and promotions.
2. In `supabase-config.js`, replace the placeholders with your project's **Project URL** and **publishable key** (or legacy anon key). These browser values are designed to be public; never put a `service_role` or secret key in this repository. Database row-level security enforces customer/admin access.
3. Deploy the owner-management Edge Function from the repository root. In a terminal with the Supabase CLI installed, link the project and set the owner email and allowed website origins as server-side function secrets:

   ```sh
   supabase login
   supabase link --project-ref mehlxtwjaelgoxvgcaqe
   supabase secrets set OWNER_EMAIL=YOUR_OWNER_EMAIL ALLOWED_ORIGINS=https://m6-fxd.github.io
   supabase functions deploy manage-store-admins
   ```

   Set `OWNER_EMAIL` to the verified email on your existing owner account. If the site is hosted on another domain, replace or extend `ALLOWED_ORIGINS` with its exact origin (scheme and hostname, without a path). The Supabase function's service-role key stays server-side and is never added to this repository.
4. In Supabase **Authentication → URL Configuration**, set the production Site URL and allow the `/account.html` redirect. Add local development URLs if needed.
5. Deploy the repository to Netlify with the repository root as the publish directory and no build command. Sign in at `/admin-login.html` using the owner account; it is permanently recognized as super-admin by the server, without a SQL role assignment.

The owner-only **Store administrators** panel can invite a new address or promote an existing account, and revoke their access later. Invited users receive Supabase's email invitation. Existing administrators keep their access, but cannot grant or remove roles. Direct profile-role updates are disabled for browser clients.

## Run locally

```sh
python3 -m http.server 8000
```

Visit `http://localhost:8000`. Configure Supabase first; otherwise the pages display a setup notice instead of pretending database writes succeeded.

Passwords are handled by Supabase Auth and are never stored by this site. Signed-in customer profiles and carts, products, homepage promotions, newsletter subscriptions, contact messages, and product/promotion changes are stored in Supabase. Only the owner can change administrator access, through the server-side Supabase Edge Function; database policies reject role changes from browser clients. Admins can choose a product photo in the dashboard, trace it to SVG, preview it, and upload it to Supabase Storage. Contact messages are visible only to admins and can be marked handled; the demo form does not send email notifications. The bag page prepares a message with the selected items, quantities, and subtotal and opens WhatsApp; customers review and send the message themselves. Payments and delivery are confirmed directly with the shop.

Product images can use remote URLs or be uploaded as traced SVGs to Supabase Storage. The admin dashboard loads ImageTracer.js to convert selected photos; the Supabase client and typefaces load from public CDNs.

## GitHub Pages

1. In the repository, open **Settings → Pages**. Select **Deploy from a branch**, choose `main` and the `/ (root)` folder, then save. If Pages is unavailable for this private repository, make the repository public or use a GitHub plan that supports Pages for private repositories.
2. The project site URL is `https://m6-fxd.github.io/chocolate-brand-store/`.
3. In Supabase **Authentication → URL Configuration**, set that URL as the Site URL and add `https://m6-fxd.github.io/chocolate-brand-store/account.html` to the allowed redirect URLs.
4. Wait for the Pages deployment, then check the account and admin pages at `/chocolate-brand-store/account.html` and `/chocolate-brand-store/admin-login.html`.

The signup confirmation redirect automatically preserves the GitHub Pages repository path.

## Netlify badge

The “Powered by Netlify” badge is managed by Netlify, not this site's source files. If it is enabled for your project and your plan allows removal, turn it off in **Project configuration → General → Powered by Netlify badge**. Netlify may require a plan change if the control is locked.
