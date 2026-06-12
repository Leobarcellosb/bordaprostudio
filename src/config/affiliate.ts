// Gate de lançamento do programa de afiliados.
// ⚠️ BLOQUEIO PRÉ-LANÇAMENTO (§7 do spec): o termo de adesão é RASCUNHO (v0-draft)
// até o contador validar. Enquanto false, o menu "💰 Ganhe dinheiro" e a rota
// /ganhe-dinheiro ficam visíveis SÓ PARA ADMIN (smoke test em prod sem expor o
// programa). Virar true SOMENTE com o termo v1.0 validado (e atualizar
// TERMS_VERSION no wizard e na edge function affiliate).
export const AFFILIATE_ENABLED = false;
