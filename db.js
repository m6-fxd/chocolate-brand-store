(() => {
  const url = window.CACAO_SUPABASE_URL;
  const key = window.CACAO_SUPABASE_ANON_KEY;
  const configured = Boolean(window.supabase?.createClient && url?.startsWith("https://") && key && !key.startsWith("YOUR_"));
  const client = configured ? window.supabase.createClient(url, key) : null;

  function requireClient() {
    if (!client) throw new Error("Connect Supabase by filling in supabase-config.js, then run database.sql in the Supabase SQL Editor.");
    return client;
  }

  function throwIfError(result) {
    if (result.error) throw result.error;
    return result.data;
  }

  async function getProducts() {
    return throwIfError(await requireClient().from("products").select("*").order("sort_order").order("name"));
  }

  async function saveProduct(product) {
    const row = {
      id: product.id,
      name: product.name,
      category: product.category,
      description: product.description,
      price: Number(product.price),
      size: product.size,
      image: product.image,
      badge: product.badge || ""
    };
    return throwIfError(await requireClient().from("products").upsert(row).select().single());
  }

  async function deleteProduct(id) {
    return throwIfError(await requireClient().from("products").delete().eq("id", id));
  }

  async function getBanner() {
    const row = throwIfError(await requireClient().from("homepage_promotion").select("*").eq("id", true).maybeSingle());
    if (!row) throw new Error("No homepage promotion found. Run database.sql in the Supabase SQL Editor.");
    return {
      eyebrow: row.eyebrow,
      title: row.title,
      description: row.description,
      buttonText: row.button_text,
      buttonLink: row.button_link,
      image: row.image
    };
  }

  async function saveBanner(banner) {
    const row = {
      id: true,
      eyebrow: banner.eyebrow,
      title: banner.title,
      description: banner.description,
      button_text: banner.buttonText,
      button_link: banner.buttonLink,
      image: banner.image
    };
    return throwIfError(await requireClient().from("homepage_promotion").upsert(row, { onConflict: "id" }).select().single());
  }

  async function getSession() {
    const result = await requireClient().auth.getSession();
    if (result.error) throw result.error;
    return result.data.session;
  }

  async function getProfile(userId) {
    return throwIfError(await requireClient().from("user_profiles").select("id, display_name, role, created_at").eq("id", userId).single());
  }

  async function addCartItem(productId) {
    if (!configured) return false;
    const supabase = requireClient();
    const session = await getSession();
    if (!session) return false;
    const result = await supabase.rpc("add_cart_item", { p_product_id: productId });
    if (result.error) throw result.error;
    return true;
  }

  async function getCartCount() {
    if (!configured) return null;
    const session = await getSession();
    if (!session) return null;
    const rows = throwIfError(await requireClient().from("cart_items").select("quantity").eq("user_id", session.user.id));
    return rows.reduce((total, item) => total + item.quantity, 0);
  }

  async function subscribeEmail(email) {
    return throwIfError(await requireClient().from("newsletter_subscribers").insert({ email: email.trim().toLowerCase() }));
  }

  async function getAdminActivity() {
    return throwIfError(await requireClient().from("store_audit_log").select("action, record_type, record_id, created_at").order("created_at", { ascending: false }).limit(12));
  }

  async function getSubscriberCount() {
    const result = await requireClient().from("newsletter_subscribers").select("*", { count: "exact", head: true });
    if (result.error) throw result.error;
    return result.count;
  }

  window.CacaoDB = {
    configured, client, getProducts, saveProduct, deleteProduct, getBanner, saveBanner,
    getSession, getProfile, addCartItem, getCartCount, subscribeEmail, getAdminActivity,
    getSubscriberCount,
    signIn: (email, password) => requireClient().auth.signInWithPassword({ email, password }),
    signUp: (email, password, displayName) => requireClient().auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName }, emailRedirectTo: `${location.origin}/account.html` }
    }),
    signOut: () => requireClient().auth.signOut()
  };
})();
