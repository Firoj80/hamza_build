import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { paymentConfig } from '@/lib/dodo';
import { currentUser } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { ownedProducts } from '@/lib/access';
import { trustedRequestOrigin, allowedCheckoutUrl } from '@/lib/payment-policy.mjs';
import {
  findProductBySlugOrKey,
  resolveDodoProductId,
  saveProductCatalogState
} from '@/lib/product-store';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const origin = trustedRequestOrigin(request);
    if (!origin) {
      return NextResponse.json(
        { error: 'Please start checkout from this website.' },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const rawKey = typeof body.product === 'string' ? body.product.trim() : '';
    if (!rawKey) {
      return NextResponse.json({ error: 'Unknown product' }, { status: 400 });
    }

    const catalogProduct = await findProductBySlugOrKey(rawKey);
    if (!catalogProduct || catalogProduct.status === 'archived') {
      return NextResponse.json({ error: 'Unknown product' }, { status: 400 });
    }

    const key = catalogProduct.key;
    const user = await currentUser();
    if (!user) {
      return NextResponse.json(
        { loginUrl: '/login?next=' + encodeURIComponent('/library?buy=' + key) },
        { status: 401 }
      );
    }

    const { products: owned } = await ownedProducts();
    if (owned.includes(key)) {
      return NextResponse.json({ libraryUrl: '/library' });
    }

    const resolvedDodo = resolveDodoProductId(catalogProduct);
    const productId = resolvedDodo.productId;
    const expectedCents = Math.round(catalogProduct.price * 100);

    const admin = adminClient();
    const since = new Date(Date.now() - 60 * 1000).toISOString();
    const { count, error: limitError } = await admin
      .from('platform_checkout_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', since);
    if (limitError) throw new Error('Checkout service unavailable');
    if ((count || 0) >= 5) {
      return NextResponse.json(
        { error: 'Please wait a minute before opening another checkout.' },
        { status: 429 }
      );
    }

    const attempt = randomUUID();
    const isStandardKey = key === 'studio' || key === 'fieldguide';
    const isStandardCents = [500, 900, 1900].includes(expectedCents);

    let dbError: unknown = null;
    if (isStandardKey && isStandardCents) {
      const res = await admin.from('platform_checkout_attempts').insert({
        id: attempt,
        user_id: user.id,
        product_key: key,
        provider_product_id: productId || 'unconfigured',
        expected_cents: expectedCents
      });
      dbError = res.error;
      if (dbError && key === 'studio') {
        const retry = await admin.from('platform_checkout_attempts').insert({
          id: attempt,
          user_id: user.id,
          product_key: key,
          provider_product_id: productId || 'unconfigured',
          expected_cents: 1900
        });
        dbError = retry.error;
      }
    } else {
      // Custom product or custom price edited via Admin Product Manager:
      // Try direct DB insert first (if schema constraint was relaxed), and always persist in product catalog store
      const directRes = await admin.from('platform_checkout_attempts').insert({
        id: attempt,
        user_id: user.id,
        product_key: key,
        provider_product_id: productId || 'unconfigured',
        expected_cents: expectedCents
      });
      dbError = directRes.error;
    }

    if (!isStandardKey || !isStandardCents || dbError) {
      await saveProductCatalogState((curr) => ({
        ...curr,
        customAttempts: [
          {
            id: attempt,
            user_id: user.id,
            product_key: key,
            provider_product_id: productId || 'unconfigured',
            expected_cents: expectedCents,
            created_at: new Date().toISOString()
          },
          ...curr.customAttempts
        ].slice(0, 500)
      }));
    }

    if (!productId) {
      return NextResponse.json(
        {
          error: `Dodo Product ID is not configured yet for "${catalogProduct.name}". Add its Dodo Product ID (pdt_...) in the Admin Dashboard → Products tab or in your environment variables.`
        },
        { status: 503 }
      );
    }

    const { client } = paymentConfig();
    const product = await client.products.retrieve(productId);
    const validCents =
      key === 'studio'
        ? Array.from(new Set([expectedCents, 900, 1900]))
        : [expectedCents];

    if (
      product.price.type !== 'one_time_price' ||
      product.price.currency !== 'USD' ||
      !validCents.includes(product.price.price) ||
      product.price.pay_what_you_want
    ) {
      throw new Error('Offer mismatch');
    }

    const session = await client.checkoutSessions.create({
      product_cart: [{ product_id: productId, quantity: 1 }],
      customer: { email: user.email! },
      return_url: origin + '/order',
      metadata: {
        platform_attempt: attempt,
        product_key: key
      }
    });

    if (!session.checkout_url || !allowedCheckoutUrl(session.checkout_url)) {
      throw new Error('Invalid provider URL');
    }

    return NextResponse.json(
      { url: session.checkout_url },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch {
    return NextResponse.json(
      {
        error:
          'Checkout is temporarily unavailable. Please try again later or contact support.'
      },
      { status: 503 }
    );
  }
}
