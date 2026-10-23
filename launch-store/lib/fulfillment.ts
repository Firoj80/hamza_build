import 'server-only';
import { adminClient } from './supabase/admin';
import { paymentConfig } from './dodo';
import { paymentAccessStatus } from './platform-policy.mjs';
import {
  loadProductCatalogState,
  resolveDodoProductId,
  saveProductCatalogState
} from './product-store';
import { createGuestDeliveryToken } from './delivery-token';

export async function reconcilePayment(paymentId: string, expectedUser?: string) {
  const { client } = paymentConfig();
  const payment = await client.payments.retrieve(paymentId);
  const attemptId =
    typeof payment.metadata?.platform_attempt === 'string'
      ? payment.metadata.platform_attempt
      : '';
  const metadataProductKey =
    typeof payment.metadata?.product_key === 'string'
      ? payment.metadata.product_key
      : '';
  const customerEmail =
    typeof payment.customer?.email === 'string'
      ? payment.customer.email.trim().toLowerCase()
      : '';
  const customerName =
    typeof payment.customer?.name === 'string'
      ? payment.customer.name.trim()
      : '';

  const db = adminClient();
  let attempt: {
    id: string;
    user_id: string;
    customer_email?: string;
    product_key: string;
    provider_product_id: string;
    expected_cents: number;
    created_at?: string;
  } | null = null;

  if (attemptId) {
    const { data } = await db
      .from('platform_checkout_attempts')
      .select('*')
      .eq('id', attemptId)
      .maybeSingle();
    attempt = data || null;
  }

  let catalogState = await loadProductCatalogState();
  let customAttempt = attemptId
    ? catalogState.customAttempts.find((a) => a.id === attemptId)
    : undefined;
  if (attemptId && !attempt && !customAttempt) {
    catalogState = await loadProductCatalogState({ forceRefresh: true });
    customAttempt = catalogState.customAttempts.find((a) => a.id === attemptId);
  }

  // Fallback for direct Dodo payments where metadata has product_key or cart has a known product_id
  let effectiveAttempt = customAttempt || attempt;
  if (!effectiveAttempt) {
    const matchedCatalogProduct = catalogState.products.find((p) => {
      const resolved = resolveDodoProductId(p);
      return (
        (metadataProductKey && p.key === metadataProductKey) ||
        (resolved.productId &&
          payment.product_cart?.some((item) => item.product_id === resolved.productId))
      );
    });
    if (matchedCatalogProduct) {
      const resolved = resolveDodoProductId(matchedCatalogProduct);
      effectiveAttempt = {
        id: attemptId || `direct_${payment.payment_id}`,
        user_id: expectedUser || 'guest',
        customer_email: customerEmail || undefined,
        product_key: matchedCatalogProduct.key,
        provider_product_id: resolved.productId,
        expected_cents: Math.round(matchedCatalogProduct.price * 100),
        created_at: new Date().toISOString()
      };
    }
  }

  if (!effectiveAttempt) {
    if (expectedUser) throw new Error('No platform checkout association');
    return {
      status: 'ignored' as const,
      product: null,
      paymentId: payment.payment_id,
      customerEmail: customerEmail || null,
      deliveryToken: null
    };
  }

  // If the attempt belonged to a specific registered user and a DIFFERENT user is logged in, verify email or user id
  if (
    expectedUser &&
    effectiveAttempt.user_id !== 'guest' &&
    effectiveAttempt.user_id !== expectedUser
  ) {
    throw new Error('Payment does not belong to this account');
  }

  if (
    effectiveAttempt.provider_product_id &&
    !payment.product_cart?.some(
      (p) => p.product_id === effectiveAttempt.provider_product_id && p.quantity === 1
    )
  ) {
    throw new Error('Payment product mismatch');
  }

  const status = paymentAccessStatus(payment) as 'active' | 'pending' | 'revoked';
  const productKey = effectiveAttempt.product_key;

  if (attempt && attempt.user_id !== 'guest') {
    const { error: writeError } = await db.rpc('platform_record_payment', {
      p_attempt_id: attempt.id,
      p_payment_id: payment.payment_id,
      p_access_status: status,
      p_provider_status: payment.status || 'unknown',
      p_amount_cents: payment.total_amount,
      p_currency: payment.currency
    });
    if (writeError && !customAttempt) {
      throw new Error('Could not persist purchase');
    }
  }

  // Always persist in customPurchases as well so Dodo guest purchases & dashboard sync work seamlessly
  await saveProductCatalogState((curr) => {
    const existingIdx = curr.customPurchases.findIndex(
      (p) => p.payment_id === payment.payment_id
    );
    const resolvedUserId =
      effectiveAttempt.user_id !== 'guest'
        ? effectiveAttempt.user_id
        : expectedUser || 'guest';
    const record = {
      payment_id: payment.payment_id,
      attempt_id: effectiveAttempt.id,
      user_id: resolvedUserId,
      customer_email: customerEmail || customAttempt?.customer_email || undefined,
      customer_name: customerName || undefined,
      product_key: productKey,
      access_status: status,
      provider_status: payment.status || 'unknown',
      amount_cents: payment.total_amount || effectiveAttempt.expected_cents,
      currency: payment.currency || 'USD',
      updated_at: new Date().toISOString()
    };
    const nextPurchases = [...curr.customPurchases];
    if (existingIdx >= 0) {
      nextPurchases[existingIdx] = record;
    } else {
      nextPurchases.unshift(record);
    }
    return {
      ...curr,
      customPurchases: nextPurchases
    };
  });

  const deliveryToken =
    status === 'active'
      ? createGuestDeliveryToken({
          paymentId: payment.payment_id,
          productKey,
          email: customerEmail
        })
      : null;

  return {
    status,
    product: productKey,
    paymentId: payment.payment_id,
    customerEmail: customerEmail || null,
    deliveryToken
  };
}
