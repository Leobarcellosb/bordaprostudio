import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { buildCorsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  // Verify caller is admin
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return new Response(JSON.stringify({ error: "Não autorizado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
  const { data: { user: caller } } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
  if (!caller) return new Response(JSON.stringify({ error: "Não autorizado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const { data: roles } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", caller.id);
  if (!roles?.some((r: any) => r.role === "admin")) {
    return new Response(JSON.stringify({ error: "Acesso negado" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const body = await req.json();
  const { action } = body;

  try {
    if (action === "create") {
      const { email, password, name, last_name, plan, role } = body;
      const { data: newUser, error: authErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name },
      });
      if (authErr) throw authErr;

      // Wait for trigger to create profile, then update
      await new Promise((r) => setTimeout(r, 500));
      await supabaseAdmin.from("profiles").update({
        name, last_name: last_name || null, plan: plan || "basic",
      }).eq("id", newUser.user!.id);

      // Set role if admin (trigger creates default role, update it)
      if (role === "admin") {
        await supabaseAdmin.from("user_roles").update({ role: "admin" }).eq("user_id", newUser.user!.id);
      }

      return new Response(JSON.stringify({ success: true, user_id: newUser.user!.id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "update_role") {
      const { user_id, role } = body;
      await supabaseAdmin.from("user_roles").update({ role }).eq("user_id", user_id);
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "update_plan") {
      const { user_id, plan } = body;
      await supabaseAdmin.from("profiles").update({ plan }).eq("id", user_id);
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "update_profile") {
      const { user_id, name, last_name, plan, machine_format, machine_hoop_size } = body;
      if (!user_id) {
        return new Response(JSON.stringify({ error: "user_id obrigatório" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const updates: Record<string, unknown> = {};
      if (typeof name === "string") updates.name = name;
      if (typeof last_name === "string") updates.last_name = last_name;
      if (typeof plan === "string") updates.plan = plan;
      if (typeof machine_format === "string" || machine_format === null) updates.machine_format = machine_format || null;
      if (typeof machine_hoop_size === "string" || machine_hoop_size === null) updates.machine_hoop_size = machine_hoop_size || null;
      await supabaseAdmin.from("profiles").update(updates).eq("id", user_id);
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "toggle_ban") {
      const { user_id, ban } = body;
      if (ban) {
        await supabaseAdmin.auth.admin.updateUserById(user_id, { ban_duration: "876000h" });
      } else {
        await supabaseAdmin.auth.admin.updateUserById(user_id, { ban_duration: "none" });
      }
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Ação inválida" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
