export const PLAN_DISPLAY: Record<string, { label: string; price: string }> = {
  mensal: { label: "Plano Mensal", price: "R$ 49,90/mês" },
  anual: { label: "Plano Anual", price: "R$ 397,00/ano" },
};

const MONTHLY_REVENUE: Record<string, number> = {
  mensal: 49.9,
  anual: 397 / 12,
};

export const DEFAULT_MONTHLY_REVENUE = MONTHLY_REVENUE.mensal;

export function monthlyRevenueFor(planCode: string | null | undefined): number {
  if (!planCode) return DEFAULT_MONTHLY_REVENUE;
  return MONTHLY_REVENUE[planCode] ?? DEFAULT_MONTHLY_REVENUE;
}
