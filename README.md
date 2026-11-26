# Cacao & Co.

A responsive chocolate storefront with Supabase customer accounts, a searchable product catalog, product pages, a protected admin workspace, a database-backed newsletter, and premium animated chocolate artwork.

## Pages

- `index.html` — homepage and featured products.
- `shop.html` — searchable, category-filtered catalog.
- `product.html?id=...` — product detail.
- `account.html` — customer sign-in and account creation.
- `admin-login.html` — administrator sign-in.
- `admin.html` — protected product, promotion, newsletter-count, and activity management.

## Supabase setup

1. Create a Supabase project. In **SQL Editor**, run the complete `database.sql` file. It creates the profile, product, homepage-promotion, customer-cart, newsletter, and audit tables; enables row-level security; and seeds the starter catalog and promotion.
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

Passwords are handled by Supabase Auth and are never stored by this site. Signed-in customer profiles and carts, products, homepage promotions, newsletter subscriptions, and product/promotion changes are stored in Supabase. Checkout and order management are not implemented yet.

Product images use remote URLs; the typefaces load from Google Fonts and the Supabase client loads from jsDelivr.

## Netlify badge

The “Powered by Netlify” badge is managed by Netlify, not this site's source files. If it is enabled for your project and your plan allows removal, turn it off in **Project configuration → General → Powered by Netlify badge**. Netlify may require a plan change if the control is locked.
