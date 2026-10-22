import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { isSalesAdmin } from '@/lib/platform-policy.mjs';
import { trustedRequestOrigin } from '@/lib/payment-policy.mjs';
import { findProductBySlugOrKey, saveProductCatalogState } from '@/lib/product-store';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  if (!trustedRequestOrigin(request)) {
    return NextResponse.json({ error: 'Untrusted request origin' }, { status: 403 });
  }
  const user = await currentUser();
  if (!user || !isSalesAdmin(user.email, process.env.SALES_DASHBOARD_ADMIN_EMAIL)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const rawProductKey = typeof body.productKey === 'string' ? body.productKey.trim() : '';
  const action = body.action;

  const catalogProduct = await findProductBySlugOrKey(rawProductKey);
  if (!catalogProduct) {
    return NextResponse.json({ error: 'Invalid product key' }, { status: 400 });
  }
  const productKey = catalogProduct.key;

  if (action !== 'grant' && action !== 'revoke') {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  const db = adminClient();
  let targetUserId = typeof body.userId === 'string' ? body.userId.trim() : '';
  const targetEmail =
    typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';

  if (!targetUserId && targetEmail) {
    const { data: usersData, error: usersErr } = await db.auth.admin.listUsers({
      page: 1,
      perPage: 1000
    });
    if (usersErr) {
      return NextResponse.json({ error: 'Could not look up accounts' }, { status: 500 });
    }
    const found = (usersData?.users || []).find(
      (u) => (u.email || '').toLowerCase() === targetEmail
    );
    if (!found) {
      return NextResponse.json(
        {
          error: `No registered account found for ${targetEmail}. Ask them to sign in once first.`
        },
        { status: 404 }
      );
    }
    targetUserId = found.id;
  }

  if (!targetUserId) {
    return NextResponse.json(
      { error: 'User ID or email is required' },
      { status: 400 }
    );
  }

  const isBuiltinKey = productKey === 'studio' || productKey === 'fieldguide';

  if (action === 'revoke') {
    if (isBuiltinKey) {
      const { error: revokeErr } = await db
        .from('platform_purchases')
        .update({
          access_status: 'revoked',
          provider_status: 'admin_revoked',
          updated_at: new Date().toISOString()
        })
        .eq('user_id', targetUserId)
        .eq('product_key', productKey);
      if (revokeErr) {
        return NextResponse.json({ error: 'Could not revoke access' }, { status: 500 });
      }
    }
    await saveProductCatalogState((curr) => ({
      ...curr,
      customPurchases: curr.customPurchases.map((p) =>
        p.user_id === targetUserId && p.product_key === productKey
          ? {
              ...p,
              access_status: 'revoked',
              provider_status: 'admin_revoked',
              updated_at: new Date().toISOString()
            }
          : p
      )
    }));
    return NextResponse.json({
      ok: true,
      action: 'revoke',
      productKey,
      userId: targetUserId
    });
  }

  // action === 'grant'
  const manualPaymentId = `manual_${productKey}_${targetUserId}`;
  if (isBuiltinKey) {
    const { data: existingManual } = await db
      .from('platform_purchases')
      .select('payment_id')
      .eq('payment_id', manualPaymentId)
      .maybeSingle();

    if (existingManual) {
      const { error: updateErr } = await db
        .from('platform_purchases')
        .update({
          access_status: 'active',
          provider_status: 'admin_granted',
          updated_at: new Date().toISOString()
        })
        .eq('payment_id', manualPaymentId);
      if (updateErr) {
        return NextResponse.json(
          { error: 'Could not reactivate manual access' },
          { status: 500 }
        );
      }
      return NextResponse.json({
        ok: true,
        action: 'grant',
        productKey,
        userId: targetUserId
      });
    }

    const expectedCents = productKey === 'studio' ? 900 : 500;
    const { data: attempt, error: attemptErr } = await db
      .from('platform_checkout_attempts')
      .insert({
        user_id: targetUserId,
        product_key: productKey,
        provider_product_id: 'admin_manual_grant',
        expected_cents: expectedCents
      })
      .select('id')
      .single();

    if (!attemptErr && attempt) {
      const { error: purchaseErr } = await db.from('platform_purchases').insert({
        payment_id: manualPaymentId,
        attempt_id: attempt.id,
        user_id: targetUserId,
        product_key: productKey,
        access_status: 'active',
        provider_status: 'admin_granted',
        amount_cents: 0,
        currency: 'USD',
        updated_at: new Date().toISOString()
      });
      if (!purchaseErr) {
        return NextResponse.json({
          ok: true,
          action: 'grant',
          productKey,
          userId: targetUserId
        });
      }
    }
  }

  // Persist custom product grant in catalog store
  await saveProductCatalogState((curr) => {
    const filtered = curr.customPurchases.filter(
      (p) => p.payment_id !== manualPaymentId
    );
    return {
      ...curr,
      customPurchases: [
        {
          payment_id: manualPaymentId,
          attempt_id: `manual_attempt_${productKey}_${targetUserId}`,
          user_id: targetUserId,
          product_key: productKey,
          access_status: 'active',
          provider_status: 'admin_granted',
          amount_cents: 0,
          currency: 'USD',
          updated_at: new Date().toISOString()
        },
        ...filtered
      ]
    };
  });

  return NextResponse.json({
    ok: true,
    action: 'grant',
    productKey,
    userId: targetUserId
  });
}
