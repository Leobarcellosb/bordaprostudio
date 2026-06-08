import type { Subscription } from "@/types/database.types";

// Lógica central de acesso. Reusada pelo AuthContext (gating de rota) e pelo
// hook useSubscriptionStatus (UI) — fonte única, sem divergência.

const PAID_STATUSES = ["active", "approved", "paid"];
const DAY_MS = 86_400_000;

export type SubStatus = "trial" | "active" | "expired" | "none";

// trial_until ainda não está no types.ts gerado (migration 20260607130000).
// Lê via cast até o regen; em runtime a coluna já existe após a migration.
function trialUntilOf(sub: Subscription | null): string | null {
  if (!sub) return null;
  const v = (sub as Record<string, unknown>).trial_until;
  return typeof v === "string" ? v : null;
}

export function isTrialActive(sub: Subscription | null, now: number = Date.now()): boolean {
  const tu = trialUntilOf(sub);
  if (!tu) return false;
  const t = new Date(tu).getTime();
  return !Number.isNaN(t) && t > now;
}

export function isPaidActive(sub: Subscription | null, now: number = Date.now()): boolean {
  if (!sub) return false;
  if (!PAID_STATUSES.includes(sub.status)) return false;
  if (!sub.access_expires_at) return false;
  const e = new Date(sub.access_expires_at).getTime();
  return !Number.isNaN(e) && e > now;
}

/** Acesso liberado = assinatura paga ativa OU trial ativo. */
export function isSubscriptionActive(sub: Subscription | null, now: number = Date.now()): boolean {
  return isPaidActive(sub, now) || isTrialActive(sub, now);
}

export function trialDaysLeft(sub: Subscription | null, now: number = Date.now()): number | null {
  const tu = trialUntilOf(sub);
  if (!isTrialActive(sub, now) || !tu) return null;
  const t = new Date(tu).getTime();
  return Math.max(0, Math.ceil((t - now) / DAY_MS));
}

/** true se o usuário já iniciou um trial alguma vez (trial_until presente). */
export function hadTrial(sub: Subscription | null): boolean {
  return trialUntilOf(sub) !== null;
}

export function computeSubscriptionStatus(sub: Subscription | null, now: number = Date.now()): SubStatus {
  if (isPaidActive(sub, now)) return "active";
  if (isTrialActive(sub, now)) return "trial";
  // Já teve acesso (trial ou assinatura) e expirou.
  if (sub && (trialUntilOf(sub) || sub.access_expires_at)) return "expired";
  return "none";
}

/**
 * Um usuário pode ter mais de uma linha de assinatura (ex.: eduzz pago + manychat
 * trial), pois a UNIQUE é (user_id, provider). Escolhe a de MELHOR acesso como
 * "primária": paga-ativa > trial-ativo > mais recente. `rows` deve vir ordenada
 * por created_at desc.
 */
export function pickPrimarySubscription(rows: Subscription[], now: number = Date.now()): Subscription | null {
  if (!rows?.length) return null;
  const paid = rows.find((r) => isPaidActive(r, now));
  if (paid) return paid;
  const trial = rows.find((r) => isTrialActive(r, now));
  if (trial) return trial;
  return rows[0];
}
