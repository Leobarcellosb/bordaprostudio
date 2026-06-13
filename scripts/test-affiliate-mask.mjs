// Guarda a máscara da my_referrals: "Primeiro + Inicial." (padrão Inner) e a
// classe de bug do mojibake (não-ASCII em literal SQL re-encodado no paste).
// Rodar: node scripts/test-affiliate-mask.mjs
import { readFileSync, readdirSync } from "node:fs";

let fail = 0;
const ok = (cond, desc) => { console.log(`${cond ? "✅" : "❌"} ${desc}`); if (!cond) fail++; };
const noMojibake = (s) => !/[Ä¢‚â€]/.test(s);

// Espelho da lógica SQL do CASE em my_referrals:
//  - nome null/vazio → "Bordadeira " + inicial(email).toUpperCase()
//  - 1 palavra → primeiro nome inteiro
//  - 2+ palavras → Primeiro + inicial(2ª palavra).toUpperCase() + "."
const mask = (name, email) => {
  const n = (name ?? "").trim();
  if (!n) return "Bordadeira " + (email && email.length ? email[0] : "?").toUpperCase();
  const parts = n.split(/\s+/);
  if (parts.length === 1) return parts[0];
  return parts[0] + " " + parts[1].charAt(0).toUpperCase() + ".";
};

for (const [name, email, exp] of [
  ["Lúcia Ção Ñoño", "lucia@x.com", "Lúcia Ç."], // acentos extremos: inicial da 2a palavra preservada
  ["úrsula", "u@x.com", "úrsula"],               // 1 palavra acentuada → inteira
  ["ñoño", "n@x.com", "ñoño"],                   // 1 palavra → inteira
  ["Maria Silva", "m@x.com", "Maria S."],        // padrão Inner
  [null, "lucia@x.com", "Bordadeira L"],         // sem nome → "Bordadeira " + inicial do email
  ["", "bruna@x.com", "Bordadeira B"],           // vazio → idem
  ["  João  Pedro  Souza ", "j@x.com", "João P."], // espaços extras + 2a palavra
]) {
  const got = mask(name, email);
  ok(got === exp && noMojibake(got), `mask(${JSON.stringify(name)}, ${JSON.stringify(email)}) = ${JSON.stringify(got)} (esperado ${JSON.stringify(exp)})`);
}

// GUARD do root-cause: NENHUM byte não-ASCII em SQL executável de QUALQUER
// migration de afiliados (acento em comentário "--" é ok; em literal/código não).
const dir = new URL("../supabase/migrations/", import.meta.url);
const files = readdirSync(dir).filter((f) => /affiliate/.test(f) && f.endsWith(".sql"));
ok(files.length >= 2, `migrations de afiliados encontradas: ${files.join(", ")}`);
for (const f of files) {
  const sql = readFileSync(new URL(f, dir), "utf8");
  const offenders = [];
  sql.split("\n").forEach((line, i) => {
    const code = line.split("--")[0]; // descarta comentário de fim de linha
    if (/[^\x00-\x7F]/.test(code)) offenders.push(`${f}:L${i + 1}: ${line.trim().slice(0, 60)}`);
  });
  ok(offenders.length === 0, `${f}: sem não-ASCII em SQL executável${offenders.length ? " → " + offenders.join(" | ") : ""}`);
}

if (fail) { console.error(`\n${fail} caso(s) FALHARAM`); process.exit(1); }
console.log("\nTodos os casos passaram.");
