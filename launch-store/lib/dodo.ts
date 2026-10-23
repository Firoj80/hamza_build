import 'server-only';
import DodoPayments from 'dodopayments';

let cachedClient: DodoPayments | null = null;
let cachedClientKey = '';
let cachedClientEnv = '';

const PRODUCT_CACHE_TTL_MS = 10 * 60 * 1000;
const productCache = new Map<
  string,
  {
    product: Awaited<ReturnType<DodoPayments['products']['retrieve']>>;
    cachedAt: number;
  }
>();

// Tracks whether the merchant's Dodo account accepts explicit `billing_currency` on checkout sessions
let billingCurrencySupportedState: boolean | null = null;
let billingCurrencyCheckedAt = 0;

export function isBillingCurrencyOverrideSupported(): boolean {
  if (billingCurrencySupportedState === false && Date.now() - billingCurrencyCheckedAt < PRODUCT_CACHE_TTL_MS) {
    return false;
  }
  return true;
}

export function markBillingCurrencyOverrideSupported(supported: boolean): void {
  billingCurrencySupportedState = supported;
  billingCurrencyCheckedAt = Date.now();
}

export function paymentConfig() {
  const key = process.env.DODO_PAYMENTS_API_KEY;
  const environment = process.env.DODO_PAYMENTS_ENVIRONMENT || 'test_mode';
  if (!key) throw new Error('Checkout configuration missing');
  if (environment !== 'test_mode' && environment !== 'live_mode') {
    throw new Error('Invalid payment environment');
  }
  if (!cachedClient || cachedClientKey !== key || cachedClientEnv !== environment) {
    cachedClient = new DodoPayments({
      bearerToken: key,
      environment,
      maxRetries: 0,
      timeout: 10000
    });
    cachedClientKey = key;
    cachedClientEnv = environment;
  }
  return { client: cachedClient, environment };
}

export async function retrieveDodoProductCached(productId: string) {
  const now = Date.now();
  const hit = productCache.get(productId);
  if (hit && now - hit.cachedAt < PRODUCT_CACHE_TTL_MS) {
    return hit.product;
  }
  const { client } = paymentConfig();
  const product = await client.products.retrieve(productId);
  productCache.set(productId, { product, cachedAt: now });
  return product;
}

