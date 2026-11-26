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

  async function uploadProductImage(productId, svgBlob) {
    const bucket = "product-photos";
    const path = `${productId}.svg`;
    const result = await requireClient().storage.from(bucket).upload(path, svgBlob, {
      cacheControl: "3600",
      contentType: "image/svg+xml",
      upsert: true
    });
    if (result.error) throw result.error;
    const publicUrl = requireClient().storage.from(bucket).getPublicUrl(path).data.publicUrl;
    const url = new URL(publicUrl);
    url.searchParams.set("v", String(Date.now()));
    return url.href;
  }

  async function deleteProductImage(imageUrl) {
    let url;
    try {
      url = new URL(imageUrl);
    } catch {
      return;
    }
    const prefix = "/storage/v1/object/public/product-photos/";
    const markerIndex = url.pathname.indexOf(prefix);
    if (markerIndex < 0) return;
    const path = decodeURIComponent(url.pathname.slice(markerIndex + prefix.length));
    if (!path) return;
    const result = await requireClient().storage.from("product-photos").remove([path]);
    if (result.error) throw result.error;
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

  async function sendContactMessage(message) {
    const row = {
      name: message.name,
      email: message.email.trim().toLowerCase(),
      topic: message.topic,
      message: message.message,
      consent: true
    };
    return throwIfError(await requireClient().from("contact_messages").insert(row));
  }

  async function getContactMessages() {
    return throwIfError(await requireClient().from("contact_messages")
      .select("id, name, email, topic, message, status, created_at")
      .order("created_at", { ascending: false })
      .limit(20));
  }

  async function updateContactMessageStatus(id, status) {
    return throwIfError(await requireClient().from("contact_messages")
      .update({ status })
      .eq("id", id)
      .select("id, status")
      .single());
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
    configured, client, getProducts, saveProduct, deleteProduct, uploadProductImage, deleteProductImage, getBanner, saveBanner,
    getSession, getProfile, addCartItem, getCartCount, subscribeEmail, getAdminActivity,
    sendContactMessage, getContactMessages, updateContactMessageStatus, getSubscriberCount,
    signIn: (email, password) => requireClient().auth.signInWithPassword({ email, password }),
    signUp: (email, password, displayName) => requireClient().auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
        emailRedirectTo: new URL("account.html", location.href).href
      }
    }),
    signOut: () => requireClient().auth.signOut()
  };
})();
