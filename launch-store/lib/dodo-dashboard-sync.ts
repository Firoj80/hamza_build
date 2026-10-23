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
};

let cachedDodoPayments: RawDodoPaymentItem[] | null = null;
let cachedDodoFetchedAt = 0;
const DODO_PAYMENTS_CACHE_TTL_MS = 15 * 1000;

export async function fetchRecentDodoPayments(): Promise<{
  payments: RawDodoPaymentItem[];
  syncedFromApi: boolean;
  error: string | null;
}> {
  const now = Date.now();
  if (cachedDodoPayments && now - cachedDodoFetchedAt < DODO_PAYMENTS_CACHE_TTL_MS) {
    return { payments: cachedDodoPayments, syncedFromApi: true, error: null };
  }

  try {
    const { client } = paymentConfig();
    const page = await client.payments.list({ page_size: 100 });
    const items: RawDodoPaymentItem[] = Array.isArray(page?.items)
      ? (page.items as unknown as RawDodoPaymentItem[])
      : [];
    cachedDodoPayments = items;
    cachedDodoFetchedAt = now;
    return { payments: items, syncedFromApi: true, error: null };
  } catch (err) {
    return {
      payments: cachedDodoPayments || [],
      syncedFromApi: false,
      error: err instanceof Error ? err.message : 'Dodo API unavailable'
    };
  }
}

export function inferProductKeyForPayment(params: {
  metadataProductKey?: string;
  attemptId?: string;
  productCart?: Array<{ product_id: string; quantity: number }> | null;
  amountCents?: number;
  catalogProducts: ManagedProduct[];
  attemptProductMap: Map<string, string>;
}): string {
  const {
    metadataProductKey,
    attemptId,
    productCart,
    amountCents,
    catalogProducts,
    attemptProductMap
  } = params;

  if (metadataProductKey && metadataProductKey.trim()) {
    return metadataProductKey.trim();
  }

  if (attemptId && attemptProductMap.has(attemptId)) {
    return attemptProductMap.get(attemptId)!;
  }

  if (Array.isArray(productCart) && productCart.length > 0) {
    for (const item of productCart) {
      const matched = catalogProducts.find((p) => {
        const resolved = resolveDodoProductId(p);
        return resolved.productId && resolved.productId === item.product_id;
      });
      if (matched) return matched.key;
    }
  }

  if (typeof amountCents === 'number') {
    if (amountCents === 500) return 'fieldguide';
    if (amountCents === 1200 || amountCents === 1400) return 'bundle';
    if (amountCents === 900 || amountCents === 1900) return 'studio';
    const priceMatched = catalogProducts.find(
      (p) => Math.round(p.price * 100) === amountCents
    );
    if (priceMatched) return priceMatched.key;
  }

  return 'studio';
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

  const attemptProductMap = new Map<string, string>();
  const attemptEmailMap = new Map<string, string>();
  for (const a of supabaseAttempts) {
    if (a.id && a.product_key) attemptProductMap.set(a.id, a.product_key);
    if (a.id && a.user_id && emailByUserId.has(a.user_id)) {
      attemptEmailMap.set(a.id, emailByUserId.get(a.user_id)!);
    }
  }
  for (const a of customAttempts) {
    if (a.id && a.product_key) attemptProductMap.set(a.id, a.product_key);
    if (a.id && a.customer_email) {
      attemptEmailMap.set(a.id, a.customer_email.toLowerCase());
    }
  }

  const dodoResult = await fetchRecentDodoPayments();
  const byPaymentId = new Map<string, UnifiedPurchaseRecord>();

  // 1. Seed from Supabase platform_purchases
  for (const row of supabasePurchases) {
    if (!row.payment_id) continue;
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

  // 2. Merge from customPurchases (guest checkouts & bundle purchases reconciled on /order or webhook)
  for (const cp of customPurchases) {
    if (!cp.payment_id) continue;
    const existing = byPaymentId.get(cp.payment_id);
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
      product_key: cp.product_key || existing?.product_key || 'studio',
      access_status: cp.access_status || existing?.access_status || 'active',
      provider_status: cp.provider_status || existing?.provider_status || 'succeeded',
      amount_cents: cp.amount_cents ?? existing?.amount_cents ?? 0,
      currency: cp.currency || existing?.currency || 'USD',
      updated_at: cp.updated_at || existing?.updated_at || new Date().toISOString(),
      source: existing?.source || 'custom_store'
    });
  }

  // 3. Merge live Dodo Payments API records directly so every Dodo buyer appears automatically
  for (const dp of dodoResult.payments) {
    if (!dp || typeof dp.payment_id !== 'string' || !dp.payment_id) continue;
    const existing = byPaymentId.get(dp.payment_id);
    const attemptId =
      (typeof dp.metadata?.platform_attempt === 'string' && dp.metadata.platform_attempt) ||
      existing?.attempt_id ||
      '';
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

    const productKey =
      existing?.product_key ||
      inferProductKeyForPayment({
        metadataProductKey: dp.metadata?.product_key,
        attemptId,
        productCart: dp.product_cart,
        amountCents,
        catalogProducts,
        attemptProductMap
      });

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
      product_key: productKey,
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
