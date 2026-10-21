export function siteOrigin(value) {
  const url = new URL(value);
  if (url.username || url.password || (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)))) throw new Error('Invalid site origin');
  return url.origin;
}
// Use only configured deployment values, never the incoming Host/Origin header.
export function configuredSiteOrigin(env=process.env) {
  const onVercel=env.VERCEL==='1';
  const candidates=[env.NEXT_PUBLIC_SITE_URL,env.VERCEL_PROJECT_PRODUCTION_URL];
  for(const value of candidates){
    if(typeof value!=='string'||!value.trim())continue;
    const cleaned=value.trim().replace(/^(['"])(.*)\1$/,'$2');
    try{
      const origin=siteOrigin(/^[a-z][a-z0-9+.-]*:\/\//i.test(cleaned)?cleaned:'https://'+cleaned);
      if(onVercel&&['localhost','127.0.0.1'].includes(new URL(origin).hostname))continue;
      return origin;
    }catch{/* Fall back to the trusted deployment domain. */}
  }
  return onVercel?'https://build-hamza.vercel.app':'http://localhost:3000';
}
export function allowedCheckoutUrl(value) {
  try { const url = new URL(value); return url.protocol === 'https:' && ['checkout.dodopayments.com','test.checkout.dodopayments.com'].includes(url.hostname) && !url.username && !url.password; } catch { return false; }
}
export function trustedRequestOrigin(req, env=process.env) {
  const configured = configuredSiteOrigin(env);
  let actual = null;
  try {
    const host = (req.headers?.get('x-forwarded-host') || req.headers?.get('host') || '').split(',')[0].trim();
    const proto = (req.headers?.get('x-forwarded-proto') || '').split(',')[0].trim() || (host.startsWith('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https');
    if (host) actual = siteOrigin(`${proto}://${host}`);
  } catch {}
  if (!actual && req.nextUrl?.origin) {
    try { actual = siteOrigin(req.nextUrl.origin); } catch {}
  }
  const originHeader = req.headers?.get('origin');
  if (originHeader && originHeader !== 'null') {
    if (originHeader === configured) return configured;
    if (actual && originHeader === actual) return actual;
    return null;
  }
  if (req.headers?.get('sec-fetch-site') === 'same-origin') {
    return actual || configured;
  }
  return null;
}
export function ownsPayment(payment, token, productId) {
  return Boolean(token && payment.metadata?.launch_order === token && payment.product_cart?.some(item => item.product_id === productId && item.quantity === 1));
}
export function validPaymentId(value) { return typeof value === 'string' && /^[A-Za-z0-9_-]{5,100}$/.test(value); }
