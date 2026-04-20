import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type AuthOk = { ok: true; userId: string; token: string };
type AuthFail = { ok: false; response: Response };

export async function requireUser(
  req: Request,
  corsHeaders: Record<string, string>,
): Promise<AuthOk | AuthFail> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return {
      ok: false,
      response: new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }),
    };
  }

  const token = authHeader.replace("Bearer ", "").trim();
  const anon = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
  );

  const { data, error } = await anon.auth.getUser(token);
  if (error || !data?.user) {
    return {
      ok: false,
      response: new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }),
    };
  }

  return { ok: true, userId: data.user.id, token };
}

export async function requireAdmin(
  req: Request,
  corsHeaders: Record<string, string>,
): Promise<AuthOk | AuthFail> {
  const base = await requireUser(req, corsHeaders);
  if (!base.ok) return base;

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: roles, error } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", base.userId);

  if (error) {
    return {
      ok: false,
      response: new Response(JSON.stringify({ error: "Authorization check failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }),
    };
  }

  const isAdmin = Array.isArray(roles) && roles.some((r: { role: string }) => r.role === "admin");
  if (!isAdmin) {
    return {
      ok: false,
      response: new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }),
    };
  }

  return base;
}
