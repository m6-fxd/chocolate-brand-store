import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type AdminRequest = { action: string; email?: unknown };
type AdminSummary = {
  id: string;
  email: string | undefined;
  display_name: string;
  created_at: string;
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ownerEmail = Deno.env.get("OWNER_EMAIL")?.trim().toLowerCase();
const allowedOrigins = new Set(
  (Deno.env.get("ALLOWED_ORIGINS") || "https://m6-fxd.github.io")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
);

const service = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

function response(body: unknown, status: number, origin: string | null) {
  const headers = new Headers({
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    "Vary": "Origin"
  });
  if (origin && allowedOrigins.has(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Headers", "authorization, apikey, content-type, x-client-info");
    headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  }
  return new Response(JSON.stringify(body), { status, headers });
}

function fail(message: string, status: number, origin: string | null) {
  return response({ error: message }, status, origin);
}

function isAdminRequest(value: unknown): value is AdminRequest {
  return value !== null
    && typeof value === "object"
    && "action" in value
    && typeof value.action === "string";
}

async function findAuthUserByEmail(email: string) {
  const perPage = 1000;
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await service.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const match = data.users.find((user) => user.email?.toLowerCase() === email);
    if (match) return match;
    if (data.users.length < perPage) return null;
  }
  throw new Error("The user directory is too large to search safely.");
}

async function ensureOwner(userId: string, email: string) {
  const { data: currentOwner, error } = await service
    .from("store_owner")
    .select("user_id")
    .eq("singleton", true)
    .maybeSingle();
  if (error) throw error;
  if (currentOwner) return currentOwner.user_id === userId;
  if (!ownerEmail || email !== ownerEmail) return false;

  const { error: insertError } = await service
    .from("store_owner")
    .insert({ singleton: true, user_id: userId });
  if (insertError) {
    const { data: ownerAfterRace, error: raceError } = await service
      .from("store_owner")
      .select("user_id")
      .eq("singleton", true)
      .maybeSingle();
    if (raceError) throw raceError;
    if (ownerAfterRace?.user_id !== userId) throw insertError;
  }
  return true;
}

async function listAdmins() {
  const { data: owner, error: ownerError } = await service
    .from("store_owner")
    .select("user_id")
    .eq("singleton", true)
    .maybeSingle();
  if (ownerError) throw ownerError;

  const { data: profiles, error: profilesError } = await service
    .from("user_profiles")
    .select("id, display_name, role, created_at")
    .eq("role", "admin")
    .order("created_at", { ascending: true });
  if (profilesError) throw profilesError;

  const admins: AdminSummary[] = [];
  for (const profile of profiles) {
    if (profile.id === owner?.user_id) continue;
    const { data, error } = await service.auth.admin.getUserById(profile.id);
    if (error) throw error;
    if (!data.user) continue;
    admins.push({
      id: profile.id,
      email: data.user.email,
      display_name: profile.display_name,
      created_at: profile.created_at
    });
  }
  return admins;
}

Deno.serve(async (request) => {
  const origin = request.headers.get("Origin");
  if (origin && !allowedOrigins.has(origin)) {
    return response({ error: "This website is not allowed to manage store access." }, 403, null);
  }
  if (request.method === "OPTIONS") return response({}, 200, origin);
  if (request.method !== "POST") return fail("Use a POST request.", 405, origin);

  try {
    const contentLength = Number(request.headers.get("Content-Length") || 0);
    if (contentLength > 4096) return fail("The request is too large.", 413, origin);
    const authorization = request.headers.get("Authorization");
    const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) return fail("Sign in to continue.", 401, origin);

    const callerClient = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${token}` } }
    });
    const { data: authData, error: authError } = await callerClient.auth.getUser(token);
    const caller = authData?.user;
    if (authError || !caller?.email || !caller.email_confirmed_at) {
      return fail("A verified sign-in is required.", 401, origin);
    }

    const rawBody = await request.text();
    if (rawBody.length > 4096) return fail("The request is too large.", 413, origin);
    let parsedBody: unknown;
    try {
      parsedBody = JSON.parse(rawBody) as unknown;
    } catch {
      return fail("Send a valid JSON request.", 400, origin);
    }
    if (!isAdminRequest(parsedBody)) {
      return fail("Choose a valid store-access action.", 400, origin);
    }
    const body = parsedBody;

    const isOwner = await ensureOwner(caller.id, caller.email.toLowerCase());
    if (body.action === "access") {
      const { data: profile, error } = await service
        .from("user_profiles")
        .select("role")
        .eq("id", caller.id)
        .single();
      if (error) throw error;
      return response({ owner: isOwner, admin: isOwner || profile.role === "admin" }, 200, origin);
    }
    if (!isOwner) return fail("Only the store owner can manage administrator access.", 403, origin);

    if (body.action === "list") {
      return response({ admins: await listAdmins() }, 200, origin);
    }

    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return fail("Enter a valid email address.", 400, origin);
    }

    if (body.action === "grant") {
      if (email === caller.email.toLowerCase()) {
        return fail("Your owner account already has permanent administrator access.", 400, origin);
      }
      let target = await findAuthUserByEmail(email);
      let invited = false;
      if (!target) {
        const { data, error } = await service.auth.admin.inviteUserByEmail(email);
        if (error) throw error;
        target = data.user;
        invited = true;
      }
      if (!target) throw new Error("The account invitation did not return a user.");
      if (target.id === caller.id) {
        return fail("Your owner account already has permanent administrator access.", 400, origin);
      }
      const { data: updatedProfile, error } = await service
        .from("user_profiles")
        .update({ role: "admin" })
        .eq("id", target.id)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (!updatedProfile) throw new Error("The account profile is not ready yet. Please try again shortly.");

      const { error: auditError } = await service.from("store_audit_log").insert({
        actor_id: caller.id,
        action: "grant_admin",
        record_type: "user_profile",
        record_id: target.id
      });
      if (auditError) console.error("Could not record admin grant in store audit log:", auditError);
      return response({
        message: invited ? "Invitation sent with administrator access." : "Administrator access granted.",
        auditWarning: auditError ? "Access changed, but the audit log could not be updated." : undefined,
        admins: await listAdmins()
      }, 200, origin);
    }

    if (body.action === "revoke") {
      const target = await findAuthUserByEmail(email);
      if (!target) return fail("No account was found with that email address.", 404, origin);
      const { data: owner, error: ownerError } = await service
        .from("store_owner")
        .select("user_id")
        .eq("singleton", true)
        .maybeSingle();
      if (ownerError) throw ownerError;
      if (target.id === owner?.user_id) return fail("The store owner cannot be removed or demoted.", 403, origin);

      const { data: updatedProfile, error } = await service
        .from("user_profiles")
        .update({ role: "customer" })
        .eq("id", target.id)
        .eq("role", "admin")
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (!updatedProfile) return fail("That account does not currently have administrator access.", 404, origin);

      const { error: auditError } = await service.from("store_audit_log").insert({
        actor_id: caller.id,
        action: "revoke_admin",
        record_type: "user_profile",
        record_id: target.id
      });
      if (auditError) console.error("Could not record admin revocation in store audit log:", auditError);
      return response({
        message: "Administrator access removed.",
        auditWarning: auditError ? "Access changed, but the audit log could not be updated." : undefined,
        admins: await listAdmins()
      }, 200, origin);
    }

    return fail("Unknown store-access action.", 400, origin);
  } catch (error) {
    console.error("Store admin management failed:", error);
    return fail("The request could not be completed. Check the function logs and try again.", 500, origin);
  }
});
