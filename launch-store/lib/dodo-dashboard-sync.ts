import 'server-only';
import { paymentConfig } from './dodo';
import { paymentAccessStatus } from './platform-policy.mjs';
import {
  type CustomCheckoutAttempt,
  type CustomPurchaseRecord,
  type ManagedProduct,
  resolveDodoProductId
} from './product-store';

export type UnifiedPurchaseRecord = {
  payment_id: string;
  attempt_id: string;
  user_id: string;
  customer_email: string;
  customer_name: string;
  product_key: string;
  access_status: 'active' | 'pending' | 'revoked';
  provider_status: string;
  amount_cents: number;
  currency: string;
  updated_at: string;
  source: 'dodo_api' | 'custom_store' | 'supabase';
};

type RawDodoPaymentItem = {
  payment_id: string;
  brand_id?: string | null;
  status?: string | null;
  total_amount?: number | null;
  currency?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  customer?: {
    customer_id?: string | null;
    email?: string | null;
    name?: string | null;
  } | null;
  product_cart?: Array<{
    product_id: string;
    quantity: number;
  }> | null;
  metadata?: Record<string, string> | null;
  refunds?: Array<{
    status?: string | null;
    amount?: number | null;
  }> | null;
  disputes?: Array<{
    dispute_status?: string | null;
  }> | null;
  /** Internal tag set when fetched via client.payments.list({ product_id }) */
  _matchedProductKey?: string;
};

let cachedScopedPayments: RawDodoPaymentItem[] | null = null;
let cachedScopedKeySignature = '';
let cachedDodoFetchedAt = 0;
const DODO_PAYMENTS_CACHE_TTL_MS = 15 * 1000;

function matchCatalogKeyByProductName(name?: string | null): string | null {
  if (!name || typeof name !== 'string') return null;
  const lower = name.trim().toLowerCase();
  if (
    lower.includes('complete creator') ||
    lower.includes('launch bundle') ||
    lower.includes('creator bundle')
  ) {
    return 'bundle';
  }
  if (lower.includes('fieldguide') || lower.includes('field guide') || lower.includes('idea-to-income')) {
    return 'fieldguide';
  }
  if (lower.includes('launchpad studio')) {
    return 'studio';
  }
  return null;
}

/**
 * Fetches Dodo payments strictly scoped to the 3 products under Business "Hamza Idrishi"
 * (Fieldguide, Launchpad Studio, Complete Creator Bundle, plus any active storefront catalog product).
 * Never returns payments belonging to unrelated products or other businesses in the same Dodo account.
 */
export async function fetchRecentDodoPayments(params: {
  catalogProducts: ManagedProduct[];
  attemptProductMap: Map<string, string>;
  knownProviderProductIds: Map<string, string>;
}): Promise<{
  payments: RawDodoPaymentItem[];
  productIdToKey: Map<string, string>;
  hamzaBrandIds: Set<string>;
  syncedFromApi: boolean;
  error: string | null;
}> {
  const { catalogProducts, attemptProductMap, knownProviderProductIds } = params;
  const validCatalogKeys = new Set(catalogProducts.map((p) => p.key));

  // 1. Build explicit Dodo product_id -> catalog key map from Admin UI / env vars + checkout attempts
  const productIdToKey = new Map<string, string>();
  for (const [pid, pkey] of knownProviderProductIds.entries()) {
    if (pid && pid.startsWith('pdt_') && validCatalogKeys.has(pkey)) {
      productIdToKey.set(pid, pkey);
    }
  }
  for (const product of catalogProducts) {
    const resolved = resolveDodoProductId(product);
    if (resolved.productId && resolved.productId.startsWith('pdt_')) {
      productIdToKey.set(resolved.productId, product.key);
    }
  }

  const signature = Array.from(productIdToKey.entries())
    .map(([k, v]) => `${k}:${v}`)
    .sort()
    .join('|');

  const now = Date.now();
  if (
    cachedScopedPayments &&
    cachedScopedKeySignature === signature &&
    now - cachedDodoFetchedAt < DODO_PAYMENTS_CACHE_TTL_MS
  ) {
    return {
      payments: cachedScopedPayments,
      productIdToKey,
      hamzaBrandIds: new Set(),
      syncedFromApi: true,
      error: null
    };
  }

  try {
    const { client } = paymentConfig();
    const hamzaBrandIds = new Set<string>();

    // 2. Discover "Hamza Idrishi" brand(s) and matching Dodo products so even newly created
    //    products under Hamza Idrishi are mapped to their exact catalog key (fieldguide / studio / bundle).
    const [brandsRes, productsRes] = await Promise.all([
      client.brands.list().catch(() => ({ items: [] })),
      client.products.list({ page_size: 100 }).catch(() => ({ items: [] }))
    ]);

    for (const b of brandsRes?.items || []) {
      const brandName = `${b.name || ''} ${b.statement_descriptor || ''} ${b.url || ''}`.toLowerCase();
      if (brandName.includes('hamza')) {
        hamzaBrandIds.add(b.brand_id);
      }
    }

    for (const prod of productsRes?.items || []) {
      if (!prod?.product_id || productIdToKey.has(prod.product_id)) continue;
      const prodBrandId = (prod as { brand_id?: string | null }).brand_id;
      const byNameKey = matchCatalogKeyByProductName(prod.name);
      const exactCatalogMatch = catalogProducts.find(
        (cp) => cp.name.trim().toLowerCase() === (prod.name || '').trim().toLowerCase()
      );
      const matchedKey = exactCatalogMatch?.key || byNameKey;
      const isHamzaBrand =
        hamzaBrandIds.size === 0 || !prodBrandId || hamzaBrandIds.has(prodBrandId);

      if (matchedKey && validCatalogKeys.has(matchedKey) && isHamzaBrand) {
        productIdToKey.set(prod.product_id, matchedKey);
      }
    }

    // 3. Query Dodo payments per known Hamza Idrishi product_id (server-side filtered by Dodo)
    const perProductPromises = Array.from(productIdToKey.entries()).map(
      async ([productId, productKey]) => {
        try {
          const page = await client.payments.list({
            product_id: productId,
            page_size: 100
          });
          const items: RawDodoPaymentItem[] = Array.isArray(page?.items)
            ? (page.items as unknown as RawDodoPaymentItem[])
            : [];
          return items.map((item) => ({
            ...item,
            _matchedProductKey: productKey
          }));
        } catch {
          return [] as RawDodoPaymentItem[];
        }
      }
    );

    // 4. Also fetch recent payments to catch any storefront checkout session with platform_attempt
    //    or explicit product_key metadata, but strictly filter out unrelated products.
    const generalPromise = (async () => {
      try {
        const page = await client.payments.list({ page_size: 100 });
        return Array.isArray(page?.items)
          ? (page.items as unknown as RawDodoPaymentItem[])
          : [];
      } catch {
        return [] as RawDodoPaymentItem[];
      }
    })();

    const [perProductLists, generalList] = await Promise.all([
      Promise.all(perProductPromises),
      generalPromise
    ]);

    const mergedById = new Map<string, RawDodoPaymentItem>();

    // First insert payments explicitly returned by product_id filter for our 3 products
    for (const list of perProductLists) {
      for (const item of list) {
        if (item?.payment_id) {
          mergedById.set(item.payment_id, item);
        }
      }
    }

    // Next, inspect general payments ONLY for verified storefront metadata / cart matches
    for (const item of generalList) {
      if (!item?.payment_id || mergedById.has(item.payment_id)) continue;

      const attemptId =
        typeof item.metadata?.platform_attempt === 'string'
          ? item.metadata.platform_attempt.trim()
          : '';
      const metaKey =
        typeof item.metadata?.product_key === 'string'
          ? item.metadata.product_key.trim()
          : '';

      // Check if it was initiated by our storefront (/api/checkout)
      if (attemptId && attemptProductMap.has(attemptId)) {
        const key = attemptProductMap.get(attemptId)!;
        if (validCatalogKeys.has(key)) {
          mergedById.set(item.payment_id, { ...item, _matchedProductKey: key });
          continue;
        }
      }

      // Check if metadata explicitly names one of our 3 products
      if (metaKey && validCatalogKeys.has(metaKey)) {
        mergedById.set(item.payment_id, { ...item, _matchedProductKey: metaKey });
        continue;
      }

      // Check if product_cart explicitly contains one of our 3 products' Dodo IDs
      if (Array.isArray(item.product_cart)) {
        const cartMatch = item.product_cart.find((c) => productIdToKey.has(c.product_id));
        if (cartMatch) {
          mergedById.set(item.payment_id, {
            ...item,
            _matchedProductKey: productIdToKey.get(cartMatch.product_id)!
          });
        }
      }
    }

    const scopedPayments = Array.from(mergedById.values());
    cachedScopedPayments = scopedPayments;
    cachedScopedKeySignature = signature;
    cachedDodoFetchedAt = now;

    return {
      payments: scopedPayments,
      productIdToKey,
      hamzaBrandIds,
      syncedFromApi: true,
      error: null
    };
  } catch (err) {
    return {
      payments: cachedScopedPayments || [],
      productIdToKey,
      hamzaBrandIds: new Set(),
      syncedFromApi: false,
      error: err instanceof Error ? err.message : 'Dodo API unavailable'
    };
  }
}

/**
 * Strictly resolves the catalog product key for a payment.
 * Returns `null` if the payment does not belong to one of our 3 Hamza Idrishi products.
 * NEVER guesses by price and NEVER falls back to 'studio'.
 */
export function resolveVerifiedProductKeyForPayment(params: {
  matchedProductKey?: string;
  metadataProductKey?: string;
  attemptId?: string;
  productCart?: Array<{ product_id: string; quantity: number }> | null;
  validCatalogKeys: Set<string>;
  productIdToKey: Map<string, string>;
  attemptProductMap: Map<string, string>;
}): string | null {
  const {
    matchedProductKey,
    metadataProductKey,
    attemptId,
    productCart,
    validCatalogKeys,
    productIdToKey,
    attemptProductMap
  } = params;

  if (matchedProductKey && validCatalogKeys.has(matchedProductKey)) {
    return matchedProductKey;
  }

  if (metadataProductKey && validCatalogKeys.has(metadataProductKey.trim())) {
    return metadataProductKey.trim();
  }

  if (attemptId && attemptProductMap.has(attemptId)) {
    const mapped = attemptProductMap.get(attemptId)!;
    if (validCatalogKeys.has(mapped)) return mapped;
  }

  if (Array.isArray(productCart) && productCart.length > 0) {
    for (const item of productCart) {
      const key = productIdToKey.get(item.product_id);
      if (key && validCatalogKeys.has(key)) return key;
    }
  }

  return null;
}

export async function buildUnifiedDashboardPurchases(params: {
  supabasePurchases: Array<{
    payment_id: string;
    attempt_id: string;
    user_id: string;
    product_key: string;
    access_status: 'active' | 'pending' | 'revoked';
    provider_status: string;
    amount_cents: number;
    currency: string;
    updated_at: string;
  }>;
  customPurchases: CustomPurchaseRecord[];
  supabaseAttempts: Array<{
    id: string;
    user_id: string;
    product_key: string;
    provider_product_id: string;
    expected_cents: number;
    created_at: string;
  }>;
  customAttempts: CustomCheckoutAttempt[];
  catalogProducts: ManagedProduct[];
  emailByUserId: Map<string, string>;
  userIdByEmail: Map<string, string>;
}): Promise<{
  purchases: UnifiedPurchaseRecord[];
  dodoSyncedFromApi: boolean;
  dodoPaymentCount: number;
}> {
  const {
    supabasePurchases,
    customPurchases,
    supabaseAttempts,
    customAttempts,
    catalogProducts,
    emailByUserId,
    userIdByEmail
  } = params;

  const validCatalogKeys = new Set(catalogProducts.map((p) => p.key));
  const attemptProductMap = new Map<string, string>();
  const attemptEmailMap = new Map<string, string>();
  const knownProviderProductIds = new Map<string, string>();

  for (const a of supabaseAttempts) {
    if (a.id && a.product_key && validCatalogKeys.has(a.product_key)) {
      attemptProductMap.set(a.id, a.product_key);
      if (a.provider_product_id && a.provider_product_id.startsWith('pdt_')) {
        knownProviderProductIds.set(a.provider_product_id, a.product_key);
      }
    }
    if (a.id && a.user_id && emailByUserId.has(a.user_id)) {
      attemptEmailMap.set(a.id, emailByUserId.get(a.user_id)!);
    }
  }
  for (const a of customAttempts) {
    if (a.id && a.product_key && validCatalogKeys.has(a.product_key)) {
      attemptProductMap.set(a.id, a.product_key);
      if (a.provider_product_id && a.provider_product_id.startsWith('pdt_')) {
        knownProviderProductIds.set(a.provider_product_id, a.product_key);
      }
    }
    if (a.id && a.customer_email) {
      attemptEmailMap.set(a.id, a.customer_email.toLowerCase());
    }
  }

  const dodoResult = await fetchRecentDodoPayments({
    catalogProducts,
    attemptProductMap,
    knownProviderProductIds
  });
  const byPaymentId = new Map<string, UnifiedPurchaseRecord>();

  // 1. Seed from Supabase platform_purchases (only for valid catalog products)
  for (const row of supabasePurchases) {
    if (!row.payment_id || !validCatalogKeys.has(row.product_key)) continue;
    const email = (emailByUserId.get(row.user_id) || attemptEmailMap.get(row.attempt_id) || '')
      .trim()
      .toLowerCase();
    byPaymentId.set(row.payment_id, {
      payment_id: row.payment_id,
      attempt_id: row.attempt_id || '',
      user_id: row.user_id || (email ? `dodo:${email}` : `dodo:${row.payment_id}`),
      customer_email: email,
      customer_name: '',
      product_key: row.product_key,
      access_status: row.access_status,
      provider_status: row.provider_status,
      amount_cents: row.amount_cents || 0,
      currency: row.currency || 'USD',
      updated_at: row.updated_at || new Date().toISOString(),
      source: 'supabase'
    });
  }

  // 2. Merge from customPurchases (only for valid catalog products)
  for (const cp of customPurchases) {
    if (!cp.payment_id) continue;
    const existing = byPaymentId.get(cp.payment_id);
    const resolvedKey = cp.product_key || existing?.product_key || '';
    if (!validCatalogKeys.has(resolvedKey)) continue;

    const email = (
      cp.customer_email ||
      existing?.customer_email ||
      (cp.user_id && cp.user_id !== 'guest' ? emailByUserId.get(cp.user_id) : '') ||
      attemptEmailMap.get(cp.attempt_id) ||
      ''
    )
      .trim()
      .toLowerCase();
    const matchedAuthUserId = email ? userIdByEmail.get(email) : undefined;
    const resolvedUserId =
      cp.user_id && cp.user_id !== 'guest'
        ? cp.user_id
        : existing?.user_id && existing.user_id !== 'guest' && !existing.user_id.startsWith('dodo:')
          ? existing.user_id
          : matchedAuthUserId || (email ? `dodo:${email}` : `dodo:${cp.payment_id}`);

    byPaymentId.set(cp.payment_id, {
      payment_id: cp.payment_id,
      attempt_id: cp.attempt_id || existing?.attempt_id || '',
      user_id: resolvedUserId,
      customer_email: email,
      customer_name: cp.customer_name || existing?.customer_name || '',
      product_key: resolvedKey,
      access_status: cp.access_status || existing?.access_status || 'active',
      provider_status: cp.provider_status || existing?.provider_status || 'succeeded',
      amount_cents: cp.amount_cents ?? existing?.amount_cents ?? 0,
      currency: cp.currency || existing?.currency || 'USD',
      updated_at: cp.updated_at || existing?.updated_at || new Date().toISOString(),
      source: existing?.source || 'custom_store'
    });
  }

  // 3. Merge live Dodo Payments API records strictly belonging to our 3 Hamza Idrishi products
  for (const dp of dodoResult.payments) {
    if (!dp || typeof dp.payment_id !== 'string' || !dp.payment_id) continue;
    const existing = byPaymentId.get(dp.payment_id);
    const attemptId =
      (typeof dp.metadata?.platform_attempt === 'string' && dp.metadata.platform_attempt) ||
      existing?.attempt_id ||
      '';

    const verifiedProductKey =
      existing?.product_key ||
      resolveVerifiedProductKeyForPayment({
        matchedProductKey: dp._matchedProductKey,
        metadataProductKey: dp.metadata?.product_key,
        attemptId,
        productCart: dp.product_cart,
        validCatalogKeys,
        productIdToKey: dodoResult.productIdToKey,
        attemptProductMap
      });

    // Skip any payment that does not belong to our 3 products under Business Hamza Idrishi
    if (!verifiedProductKey || !validCatalogKeys.has(verifiedProductKey)) {
      continue;
    }

    const dodoEmail = (
      (typeof dp.customer?.email === 'string' ? dp.customer.email : '') ||
      existing?.customer_email ||
      (attemptId ? attemptEmailMap.get(attemptId) : '') ||
      ''
    )
      .trim()
      .toLowerCase();
    const dodoName =
      (typeof dp.customer?.name === 'string' ? dp.customer.name.trim() : '') ||
      existing?.customer_name ||
      '';

    const matchedAuthUserId = dodoEmail ? userIdByEmail.get(dodoEmail) : undefined;
    const resolvedUserId =
      existing?.user_id &&
      existing.user_id !== 'guest' &&
      !existing.user_id.startsWith('dodo:')
        ? existing.user_id
        : matchedAuthUserId || (dodoEmail ? `dodo:${dodoEmail}` : `dodo:${dp.payment_id}`);

    const amountCents =
      typeof dp.total_amount === 'number'
        ? dp.total_amount
        : existing?.amount_cents || 0;

    const computedStatus = paymentAccessStatus(dp) as 'active' | 'pending' | 'revoked';
    const finalStatus =
      existing?.provider_status === 'admin_revoked'
        ? 'revoked'
        : existing?.provider_status === 'admin_granted'
          ? 'active'
          : computedStatus;

    byPaymentId.set(dp.payment_id, {
      payment_id: dp.payment_id,
      attempt_id: attemptId || `dodo_${dp.payment_id}`,
      user_id: resolvedUserId,
      customer_email: dodoEmail,
      customer_name: dodoName,
      product_key: verifiedProductKey,
      access_status: finalStatus,
      provider_status: dp.status || existing?.provider_status || 'unknown',
      amount_cents: amountCents,
      currency: dp.currency || existing?.currency || 'USD',
      updated_at:
        dp.updated_at ||
        dp.created_at ||
        existing?.updated_at ||
        new Date().toISOString(),
      source: 'dodo_api'
    });
  }

  const purchases = Array.from(byPaymentId.values()).sort((a, b) =>
    b.updated_at.localeCompare(a.updated_at)
  );

  return {
    purchases,
    dodoSyncedFromApi: dodoResult.syncedFromApi,
    dodoPaymentCount: dodoResult.payments.length
  };
}
