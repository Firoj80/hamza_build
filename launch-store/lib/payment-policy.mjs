export function siteOrigin(value) {
  const url = new URL(value);
  if (url.username || url.password || (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)))) throw new Error('Invalid site origin');
  return url.origin;
}
export function allowedCheckoutUrl(value) {
  try { const url = new URL(value); return url.protocol === 'https:' && ['checkout.dodopayments.com','test.checkout.dodopayments.com'].includes(url.hostname) && !url.username && !url.password; } catch { return false; }
}
export function ownsPayment(payment, token, productId) {
  return Boolean(token && payment.metadata?.launch_order === token && payment.product_cart?.some(item => item.product_id === productId && item.quantity === 1));
}
export function validPaymentId(value) { return typeof value === 'string' && /^[A-Za-z0-9_-]{5,100}$/.test(value); }
