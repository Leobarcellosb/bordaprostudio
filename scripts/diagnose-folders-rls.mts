#!/usr/bin/env -S npx tsx
/**
 * Diagnóstico read-only do bug "useFolders retorna vazio".
 *
 * Compara o que SERVICE_ROLE vê vs o que ANON vê — diferença = RLS.
 * Inspeciona policies em pg_policies e definição de borda_is_admin.
 */
import { createClient } from "@supabase/supabase-js";

const URL = process.env.VITE_SUPABASE_URL!;
const SK = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const AK = process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;
if (!URL || !SK || !AK) {
  console.error("Falta env: VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY + VITE_SUPABASE_PUBLISHABLE_KEY");
  process.exit(1);
}
const svc = createClient(URL, SK, { auth: { persistSession: false } });
const anon = createClient(URL, AK, { auth: { persistSession: false } });

const HR = "─".repeat(60);

// ─── 1. Erro REAL da query do useFolders (anon, sem login) ───
console.log(`\n${HR}\n1. SELECT como ANON (mesma chave do app, sem login)\n${HR}`);
{
  const { data, error, status, statusText } = await anon
    .from("folders")
    .select("id, slug, name, keyword_rules, sort_order, is_active")
    .order("sort_order", { ascending: true });
  console.log("status:", status, statusText);
  console.log("error:", error);
  console.log("data.length:", data?.length ?? 0);
  if ((data?.length ?? 0) > 0) {
    console.log("primeiras 3:", data!.slice(0, 3).map((r: any) => r.slug));
  }
}

// ─── 2. SELECT como SERVICE_ROLE (bypassa RLS) — confere se a linha existe ───
console.log(`\n${HR}\n2. SELECT como SERVICE_ROLE (bypassa RLS)\n${HR}`);
{
  const { data, error } = await svc
    .from("folders")
    .select("id, slug, name, is_active")
    .order("sort_order", { ascending: true });
  console.log("error:", error);
  console.log("data.length:", data?.length ?? 0);
  if ((data?.length ?? 0) > 0) {
    console.log("slugs:", data!.map((r: any) => r.slug).join(", "));
  }
}

// ─── 3. Policies vigentes (pg_policies via RPC) ───
console.log(`\n${HR}\n3. RLS policies na tabela folders\n${HR}`);
{
  const { data, error } = await svc.rpc("exec_sql", {
    sql: `
      SELECT policyname, cmd, permissive, roles::text, qual::text, with_check::text
      FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'folders'
      ORDER BY cmd, policyname;
    `,
  });
  if (error) {
    // RPC exec_sql não existe — usa REST direto via pg_meta? Falha graciosa.
    console.log("RPC exec_sql não disponível, tentando query direta...");
    const { data: d2, error: e2 } = await svc
      .from("pg_policies" as any)
      .select("*")
      .eq("tablename", "folders");
    if (e2) {
      console.log("ERRO ao ler pg_policies via REST:", e2.message);
      console.log("(esperado — pg_policies não é exposta via PostgREST por padrão)");
    } else {
      console.log("policies (REST):", d2);
    }
  } else {
    console.log("policies:", data);
  }
}

// ─── 4. rowsecurity flag da tabela ───
console.log(`\n${HR}\n4. RLS está ENABLED na tabela?\n${HR}`);
{
  const { data, error } = await svc.rpc("exec_sql", {
    sql: "SELECT relname, relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname = 'folders' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname='public');",
  });
  if (error) console.log("RPC indisponível —", error.message);
  else console.log(data);
}

// ─── 5. Definição de borda_is_admin ───
console.log(`\n${HR}\n5. Função borda_is_admin existe?\n${HR}`);
{
  const { data, error } = await svc.rpc("exec_sql", {
    sql: "SELECT proname, pg_get_functiondef(oid) AS def FROM pg_proc WHERE proname = 'borda_is_admin';",
  });
  if (error) console.log("RPC indisponível —", error.message);
  else console.log(data);
}

// ─── 6. Test INSERT como anon (esperado: falhar com 401/403) ───
console.log(`\n${HR}\n6. INSERT como ANON (esperado falhar)\n${HR}`);
{
  const { data, error, status } = await anon
    .from("folders")
    .insert({ slug: "__test_anon", name: "test", keyword_rules: [], sort_order: 999, is_active: true })
    .select();
  console.log("status:", status, "error:", error, "data:", data);
}

// ─── 7. Login como leonardo + tentativa de INSERT (simula o app real) ───
console.log(`\n${HR}\n7. Login como leonardo.barcellos@outlook.com + INSERT\n${HR}`);
{
  const { data: auth, error: loginErr } = await anon.auth.signInWithPassword({
    email: "leonardo.barcellos@outlook.com",
    password: "@Leoborges123",
  });
  if (loginErr) {
    console.log("LOGIN FALHOU:", loginErr.message);
  } else {
    console.log("login OK, user.id:", auth.user?.id);

    // borda_is_admin() retorna true pra esse user?
    const { data: adm, error: admErr } = await anon.rpc("borda_is_admin");
    console.log("borda_is_admin() retorno:", adm, "erro:", admErr?.message);

    // Tenta SELECT logado
    const { data: sel, error: selErr } = await anon
      .from("folders")
      .select("slug")
      .limit(3);
    console.log("SELECT logado: count=", sel?.length, "error=", selErr?.message);

    // Tenta INSERT logado
    const { data: ins, error: insErr, status: insStatus } = await anon
      .from("folders")
      .insert({
        slug: "__test_authed_" + Math.floor(Date.now() % 100000),
        name: "test authed",
        keyword_rules: ["foo", "bar"],
        sort_order: 999,
        is_active: true,
      })
      .select();
    console.log("INSERT logado: status=", insStatus, "data=", ins, "error=", insErr);

    // Limpa o INSERT bem-sucedido se rolou (idempotência)
    if (ins && ins[0]?.id) {
      await svc.from("folders").delete().eq("id", ins[0].id);
      console.log("(cleanup: linha de teste removida via service_role)");
    }
  }
}
