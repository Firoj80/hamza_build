import 'server-only';
import { adminClient } from './supabase/admin';
import { paymentConfig } from './dodo';
import { paymentAccessStatus } from './platform-policy.mjs';
import { loadProductCatalogState, saveProductCatalogState } from './product-store';

export async function reconcilePayment(paymentId: string, expectedUser?: string) {
  const { client } = paymentConfig();
  const payment = await client.payments.retrieve(paymentId);
  const attemptId = payment.metadata?.platform_attempt;
  if (typeof attemptId !== 'string') {
    if (expectedUser) throw new Error('No platform checkout association');
    return { status: 'ignored', product: null };
  }

  const db = adminClient();
  const { data: attempt } = await db
    .from('platform_checkout_attempts')
    .select('*')
    .eq('id', attemptId)
    .maybeSingle();

  let catalogState = await loadProductCatalogState();
  let customAttempt = catalogState.customAttempts.find((a) => a.id === attemptId);
  if (!attempt && !customAttempt) {
    catalogState = await loadProductCatalogState({ forceRefresh: true });
    customAttempt = catalogState.customAttempts.find((a) => a.id === attemptId);
  }

  const effectiveAttempt = customAttempt || attempt;
  if (!effectiveAttempt || (expectedUser && effectiveAttempt.user_id !== expectedUser)) {
    throw new Error('Payment does not belong to this account');
  }

  if (
    !payment.product_cart?.some(
      (p) => p.product_id === effectiveAttempt.provider_product_id && p.quantity === 1
    )
  ) {
    throw new Error('Payment product mismatch');
  }

  const status = paymentAccessStatus(payment) as 'active' | 'pending' | 'revoked';

  if (attempt) {
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

  if (customAttempt) {
    await saveProductCatalogState((curr) => {
      const existingIdx = curr.customPurchases.findIndex(
        (p) => p.payment_id === payment.payment_id
      );
      const record = {
        payment_id: payment.payment_id,
        attempt_id: customAttempt.id,
        user_id: customAttempt.user_id,
        product_key: customAttempt.product_key,
        access_status: status,
        provider_status: payment.status || 'unknown',
        amount_cents: payment.total_amount || customAttempt.expected_cents,
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
  }

  return { status, product: effectiveAttempt.product_key };
}
