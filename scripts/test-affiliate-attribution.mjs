// Teste da TABELA DE DECISÃO da atribuição de afiliada (eduzz-webhook, Fase 1).
// Reimplementa a lógica pura (sem DB) e afirma os casos críticos do spec.
// Rodar: node scripts/test-affiliate-attribution.mjs

// Espelho da decisão do webhook (3a'), pós-revisão adversarial:
// - fallback por email só pega referrals PENDENTES (first_paid_at null) de
//   afiliada real (referrer_user_id não-nulo);
// - branch utm dedupa por EMAIL (qualquer referral do comprador), não por
//   (código,email) — retry com utm não duplica.
function decide({ pendingEmailReferralExists, anyEmailReferralExists, utmCampaign, codeExistsInProfiles, sameUser }) {
  if (pendingEmailReferralExists) return { path: "email_fallback", action: "mark_paid_first" };
  const isAffiliateCode = typeof utmCampaign === "string" && utmCampaign.startsWith("br_");
  if (!isAffiliateCode) return { path: "none", action: "ignore" };
  if (!codeExistsInProfiles) return { path: "none", action: "ignore" };
  if (anyEmailReferralExists) return { path: "none", action: "ignore" }; // dedup por EMAIL
  return { path: "utm", action: "create_paid_first", flagged: !!sameUser };
}

const cases = [
  ["utm de ANÚNCIO (id numérico) não é código de afiliada",
    { pendingEmailReferralExists: false, anyEmailReferralExists: false, utmCampaign: "120235545637380722", codeExistsInProfiles: false },
    { path: "none", action: "ignore" }],
  ["utm br_ que NÃO existe em affiliate_profile → ignora",
    { pendingEmailReferralExists: false, anyEmailReferralExists: false, utmCampaign: "br_zzz999", codeExistsInProfiles: false },
    { path: "none", action: "ignore" }],
  ["utm br_ válido, comprador sem referral → cria paid_first",
    { pendingEmailReferralExists: false, anyEmailReferralExists: false, utmCampaign: "br_a3f9c2", codeExistsInProfiles: true, sameUser: false },
    { path: "utm", action: "create_paid_first", flagged: false }],
  ["AUTOINDICAÇÃO via utm (mesma conta) → cria flagged",
    { pendingEmailReferralExists: false, anyEmailReferralExists: false, utmCampaign: "br_a3f9c2", codeExistsInProfiles: true, sameUser: true },
    { path: "utm", action: "create_paid_first", flagged: true }],
  ["trial→paid: referral pendente por email TEM PRECEDÊNCIA sobre utm",
    { pendingEmailReferralExists: true, anyEmailReferralExists: true, utmCampaign: "br_outro1", codeExistsInProfiles: true },
    { path: "email_fallback", action: "mark_paid_first" }],
  ["BLOCKER (revisão): RETRY da Eduzz com o MESMO utm br_B após o fallback já ter marcado br_A → NO-OP (não cria 2º referral)",
    { pendingEmailReferralExists: false, anyEmailReferralExists: true, utmCampaign: "br_outro1", codeExistsInProfiles: true },
    { path: "none", action: "ignore" }],
  ["RENEWAL de comprador já atribuído (sem utm) → no-op",
    { pendingEmailReferralExists: false, anyEmailReferralExists: true, utmCampaign: null, codeExistsInProfiles: false },
    { path: "none", action: "ignore" }],
  ["sem utm e sem referral por email → nada",
    { pendingEmailReferralExists: false, anyEmailReferralExists: false, utmCampaign: null, codeExistsInProfiles: false },
    { path: "none", action: "ignore" }],
];

let fail = 0;
for (const [desc, input, expected] of cases) {
  const got = decide(input);
  const ok = JSON.stringify(got) === JSON.stringify(expected);
  console.log(`${ok ? "✅" : "❌"} ${desc}`);
  if (!ok) { console.log(`   esperado ${JSON.stringify(expected)} | obtido ${JSON.stringify(got)}`); fail++; }
}

if (fail) { console.error(`\n${fail} caso(s) FALHARAM`); process.exit(1); }
console.log("\nTodos os casos passaram.");
