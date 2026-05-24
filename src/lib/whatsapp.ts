/**
 * WhatsApp CTA helper. Single source of truth for the FinZap Founders sales
 * flow. Replace the number here when the channel changes.
 */
export const FOUNDERS_WHATSAPP_NUMBER = '5528999496868';

export const FOUNDERS_DEFAULT_MESSAGE =
  'Olá! Quero desbloquear o FinZap Founders Vitalício 🚀';

export function buildWhatsAppUrl(message: string = FOUNDERS_DEFAULT_MESSAGE, phone: string = FOUNDERS_WHATSAPP_NUMBER) {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export function openFoundersWhatsApp(message?: string) {
  const url = buildWhatsAppUrl(message);
  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}