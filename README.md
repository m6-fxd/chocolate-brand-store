# Cacao & Co.

A responsive chocolate storefront with Supabase customer accounts, a searchable product catalog, product pages, a protected admin workspace, a database-backed newsletter, and premium animated chocolate artwork.

## Pages

- `index.html` — homepage and featured products.
- `shop.html` — searchable, category-filtered catalog.
- `product.html?id=...` — product detail.
- `story.html` — the Cacao & Co. story and brand values.
- `contact.html` — contact form demo; messages save to the admin inbox.
- `account.html` — customer sign-in and account creation.
- `admin-login.html` — administrator sign-in.
- `admin.html` — protected product, promotion, newsletter-count, contact-inbox, and activity management.

## Supabase setup

1. Create a Supabase project. In **SQL Editor**, run the complete `database.sql` file. It creates the profile, product, homepage-promotion, customer-cart, newsletter, contact-message, and audit tables; enables row-level security; creates the public product-photo bucket with admin-only uploads; and seeds the starter catalog and promotion. If the schema was installed earlier, run the updated SQL again to add new tables, policies, and the storage bucket.
2. In `supabase-config.js`, replace the placeholders with your project's **Project URL** and **publishable key** (or legacy anon key). These browser values are designed to be public; never put a `service_role` or secret key in this repository. Database row-level security enforces customer/admin access.
3. In Supabase **Authentication → URL Configuration**, set the production Site URL to your Netlify URL and allow the `/account.html` redirect. Add your local development URL if needed.
4. Deploy the repository to Netlify with the repository root as the publish directory and no build command.
5. Create your customer account at `/account.html` and confirm its email if email confirmation is enabled. In Supabase SQL Editor, grant that account administrator access:

   ```sql
   update public.user_profiles
   set role = 'admin'
   where id = (select id from auth.users where email = 'you@example.com');
   ```

   Admin accounts are provisioned in the database; public sign-up cannot assign an admin role.

## Run locally

```sh
python3 -m http.server 8000
```

Visit `http://localhost:8000`. Configure Supabase first; otherwise the pages display a setup notice instead of pretending database writes succeeded.

Passwords are handled by Supabase Auth and are never stored by this site. Signed-in customer profiles and carts, products, homepage promotions, newsletter subscriptions, contact messages, and product/promotion changes are stored in Supabase. Admins can choose a product photo in the dashboard, trace it to SVG, preview it, and upload it to Supabase Storage. Contact messages are visible only to admins and can be marked handled; the demo form does not send email notifications. Checkout and order management are not implemented yet.

Product images can use remote URLs or be uploaded as traced SVGs to Supabase Storage. The admin dashboard loads ImageTracer.js to convert selected photos; the Supabase client and typefaces load from public CDNs.

## GitHub Pages

1. In the repository, open **Settings → Pages**. Select **Deploy from a branch**, choose `main` and the `/ (root)` folder, then save. If Pages is unavailable for this private repository, make the repository public or use a GitHub plan that supports Pages for private repositories.
2. The project site URL is `https://m6-fxd.github.io/chocolate-brand-store/`.
3. In Supabase **Authentication → URL Configuration**, set that URL as the Site URL and add `https://m6-fxd.github.io/chocolate-brand-store/account.html` to the allowed redirect URLs.
4. Wait for the Pages deployment, then check the account and admin pages at `/chocolate-brand-store/account.html` and `/chocolate-brand-store/admin-login.html`.

The signup confirmation redirect automatically preserves the GitHub Pages repository path.

## Netlify badge

The “Powered by Netlify” badge is managed by Netlify, not this site's source files. If it is enabled for your project and your plan allows removal, turn it off in **Project configuration → General → Powered by Netlify badge**. Netlify may require a plan change if the control is locked.
