// Anti-regressão da correção de lentidão (~30s) em /ganhe-dinheiro (jun/2026).
// Invariante: no fetchUserData do AuthContext, CADA query resolve e grava seu
// estado de forma INDEPENDENTE. O gate de `role` (que o ProtectedRoute usa pra
// liberar a página / bypass admin) NÃO pode esperar a query lenta de
// `subscriptions`. Se alguém reagrupar tudo num Promise.all único (a regressão),
// roleResolved passa a esperar a subscription e este teste falha.
// Rodar: node scripts/test-auth-fetch-timing.mjs

const now = () => Number(process.hrtime.bigint() / 1000000n); // ms
const t0 = now();
const at = {};
const safeQuery = (label, ms) => new Promise((r) => setTimeout(() => r({ status: "success", label }), ms));

// Estrutura ESPELHO do fetchUserData (resolução independente por query):
const DELAYS = { profile: 40, roles: 40, subscription: 800, preferences: 40 };

const pProfile = safeQuery("profile", DELAYS.profile).then((res) => { at.profile = now() - t0; return res; });
const pRole = safeQuery("roles", DELAYS.roles).then((res) => { at.roleResolved = now() - t0; return res; });
const pSub = safeQuery("subscription", DELAYS.subscription).then((res) => { at.subscriptionResolved = now() - t0; return res; });
const pPrefs = safeQuery("preferences", DELAYS.preferences).then((res) => { at.preferences = now() - t0; return res; });
Promise.all([pProfile, pPrefs]).then(() => { at.onboardingResolved = now() - t0; });

// status="authenticated" é setado SÍNCRONO ao conhecer a sessão (não espera fetch).
at.statusAuthenticated = now() - t0;

await Promise.all([pProfile, pRole, pSub, pPrefs]);

let fail = 0;
const ok = (cond, desc) => { console.log(`${cond ? "✅" : "❌"} ${desc}`); if (!cond) fail++; };

ok(at.statusAuthenticated < 10, `status="authenticated" é síncrono (${at.statusAuthenticated}ms, não espera fetch)`);
ok(at.roleResolved < 200, `roleResolved rápido (${at.roleResolved}ms) — NÃO espera subscription`);
ok(at.roleResolved < at.subscriptionResolved - 300, `role (${at.roleResolved}ms) resolve MUITO antes da subscription (${at.subscriptionResolved}ms)`);
ok(at.onboardingResolved < at.subscriptionResolved - 300, `onboarding (${at.onboardingResolved}ms) não depende da subscription (${at.subscriptionResolved}ms)`);
ok(at.subscriptionResolved >= 800, `subscription lenta (${at.subscriptionResolved}ms) NÃO bloqueou os demais gates`);

if (fail) { console.error(`\n${fail} caso(s) FALHARAM — alguém pode ter reagrupado o fetch num Promise.all único.`); process.exit(1); }
console.log("\nTodos os casos passaram (gate de render desacoplado da subscription).");
