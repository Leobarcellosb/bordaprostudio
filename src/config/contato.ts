// Contato de suporte — fonte ÚNICA de verdade.
// Para trocar o número/canal, edite SOMENTE este arquivo.
export const WHATSAPP_NUMERO = "5527996675935"; // +55 27 99667-5935 (só dígitos, formato wa.me)

/** Monta o link wa.me com mensagem pré-preenchida (já abre o WhatsApp com o texto pronto pra enviar). */
export const whatsappLink = (mensagem: string) =>
  `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(mensagem)}`;
