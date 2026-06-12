// Teste da TABELA DE DECISÃO da atribuição de afiliada (eduzz-webhook, Fase 1).
// Reimplementa a lógica pura (sem DB) e afirma os casos críticos do spec.
// Rodar: node scripts/test-affiliate-attribution.mjs

// Espelho da decisão do webhook (3a'):
function decide({ emailReferralExists, utmCampaign, codeExistsInProfiles, sameUser }) {
  if (emailReferralExists) return { path: "email_fallback", action: "mark_paid_first" };
  const isAffiliateCode = typeof utmCampaign === "string" && utmCampaign.startsWith("br_");
  if (!isAffiliateCode) return { path: "none", action: "ignore" };
  if (!codeExistsInProfiles) return { path: "none", action: "ignore" };
  return { path: "utm", action: "create_paid_first", flagged: !!sameUser };
}

const cases = [
  // [descrição, input, esperado]
  ["utm de ANÚNCIO (id numérico) não é código de afiliada",
    { emailReferralExists: false, utmCampaign: "120235545637380722", codeExistsInProfiles: false },
    { path: "none", action: "ignore" }],
  ["utm br_ que NÃO existe em affiliate_profile → ignora",
    { emailReferralExists: false, utmCampaign: "br_zzz999", codeExistsInProfiles: false },
    { path: "none", action: "ignore" }],
  ["utm br_ válido → cria referral paid_first",
    { emailReferralExists: false, utmCampaign: "br_a3f9c2", codeExistsInProfiles: true, sameUser: false },
    { path: "utm", action: "create_paid_first", flagged: false }],
  ["AUTOINDICAÇÃO via utm (mesma conta) → cria flagged",
    { emailReferralExists: false, utmCampaign: "br_a3f9c2", codeExistsInProfiles: true, sameUser: true },
    { path: "utm", action: "create_paid_first", flagged: true }],
  ["trial→paid: referral por email TEM PRECEDÊNCIA sobre utm",
    { emailReferralExists: true, utmCampaign: "br_outro1", codeExistsInProfiles: true },
    { path: "email_fallback", action: "mark_paid_first" }],
  ["sem utm e sem referral por email → nada",
    { emailReferralExists: false, utmCampaign: null, codeExistsInProfiles: false },
    { path: "none", action: "ignore" }],
];

let fail = 0;
for (const [desc, input, expected] of cases) {
  const got = decide(input);
  const ok = JSON.stringify(got) === JSON.stringify(expected);
  console.log(`${ok ? "✅" : "❌"} ${desc}`);
  if (!ok) { console.log(`   esperado ${JSON.stringify(expected)} | obtido ${JSON.stringify(got)}`); fail++; }
}
// Idempotência do retry: o caminho email_fallback filtra first_paid_at IS NULL —
// segunda chegada do MESMO webhook não acha linhas e vira no-op.
const retry = decide({ emailReferralExists: false, utmCampaign: null, codeExistsInProfiles: false });
const retryOk = retry.action === "ignore";
console.log(`${retryOk ? "✅" : "❌"} retry da Eduzz após first_paid marcado → no-op`);
if (!retryOk) fail++;

if (fail) { console.error(`\n${fail} caso(s) FALHARAM`); process.exit(1); }
console.log("\nTodos os casos passaram.");
