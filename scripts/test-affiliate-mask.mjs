// Guarda contra o bug de encoding do referred_initial (mojibake "L‚Ä¢‚Ä¢‚Ä¢").
// Causa raiz: caractere não-ASCII ('•') num LITERAL SQL foi re-encodado no paste
// do SQL editor (UTF-8 → Mac Roman) e gravado torto no corpo da função.
// Rodar: node scripts/test-affiliate-mask.mjs
import { readFileSync } from "node:fs";

let fail = 0;
const ok = (cond, desc) => { console.log(`${cond ? "✅" : "❌"} ${desc}`); if (!cond) fail++; };

// 1) Lógica da inicial (espelho do SQL: upper(left(coalesce(email,'?'),1))).
//    Acentos extremos entram no nome/email; a inicial sai limpa, sem mojibake.
const initial = (email) => (email && email.length ? email[0].toUpperCase() : "?");
const noMojibake = (s) => !/[Ä¢‚â€]/.test(s); // bytes típicos do lixo

for (const [email, exp] of [
  ["lucia@x.com", "L"],
  ["úrsula@x.com", "Ú"],
  ["ñoño@x.com", "Ñ"],
  ["Lúcia Ção Ñoño", "L"], // nome com acentos extremos → inicial ASCII limpa
  ["", "?"],
  [null, "?"],
]) {
  const got = initial(email);
  ok(got === exp && noMojibake(got), `inicial(${JSON.stringify(email)}) = "${got}" (esperado "${exp}", sem mojibake)`);
}

// 2) A decoração "•••" do front é UTF-8 íntegro (3× U+2022), nunca o mojibake.
const MASK = "•••";
ok([...MASK].every((c) => c.codePointAt(0) === 0x2022) && MASK.length === 3, 'máscara do front = 3× U+2022 ("•••")');

// 3) GUARD do root-cause: NENHUM byte não-ASCII em SQL executável da migration
//    (acento em COMENTÁRIO é ok; em literal/código não — foi o que quebrou).
const sql = readFileSync(new URL("../supabase/migrations/20260612120000_affiliate_phase1.sql", import.meta.url), "utf8");
const offenders = [];
sql.split("\n").forEach((line, i) => {
  const code = line.split("--")[0]; // descarta comentário de fim de linha
  if (/[^\x00-\x7F]/.test(code)) offenders.push(`L${i + 1}: ${line.trim().slice(0, 70)}`);
});
ok(offenders.length === 0, `migration sem não-ASCII em SQL executável${offenders.length ? " → " + offenders.join(" | ") : ""}`);

if (fail) { console.error(`\n${fail} caso(s) FALHARAM`); process.exit(1); }
console.log("\nTodos os casos passaram.");
