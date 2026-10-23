import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import {
  isBillingCurrencyOverrideSupported,
  markBillingCurrencyOverrideSupported,
  paymentConfig,
  retrieveDodoProductCached
} from '@/lib/dodo';
import { currentUser } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { ownedProducts } from '@/lib/access';
import { trustedRequestOrigin, allowedCheckoutUrl } from '@/lib/payment-policy.mjs';
import {
  findProductBySlugOrKey,
  resolveDodoProductId,
  saveProductCatalogState
} from '@/lib/product-store';
import {
  currencyForCountry,
  getCurrencyInfo,
  isSupportedCurrency
} from '@/lib/currency';
import type { CountryCode, Currency } from 'dodopayments/resources/misc';

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

    // Step 1: Fetch catalog product and current user in parallel
    const [catalogProduct, user] = await Promise.all([
      findProductBySlugOrKey(rawKey),
      currentUser()
    ]);

    if (!catalogProduct || catalogProduct.status === 'archived') {
      return NextResponse.json({ error: 'Unknown product' }, { status: 400 });
    }

    const key = catalogProduct.key;
    if (!user) {
      return NextResponse.json(
        { loginUrl: '/login?next=' + encodeURIComponent('/library?buy=' + key) },
        { status: 401 }
      );
    }

    // Resolve user's preferred or geo-detected currency & country for Dodo Adaptive Checkout
    const headerCountry =
      request.headers.get('x-vercel-ip-country') ||
      request.headers.get('cf-ipcountry') ||
      request.headers.get('x-country-code') ||
      '';
    const geo = currencyForCountry(headerCountry);
    let billingCurrency: Currency = geo.currency;
    let billingCountry: CountryCode = geo.country;

    const reqCountry = typeof body.country === 'string' ? body.country.trim().toUpperCase() : '';
    if (/^[A-Z]{2}$/.test(reqCountry)) {
      const mapped = currencyForCountry(reqCountry);
      billingCountry = mapped.country;
      billingCurrency = mapped.currency;
    }

    const reqCurrency =
      typeof body.currency === 'string'
        ? body.currency.trim().toUpperCase()
        : request.cookies.get('launch_currency')?.value?.trim().toUpperCase() || '';

    if (isSupportedCurrency(reqCurrency)) {
      billingCurrency = reqCurrency;
      if (!reqCountry) {
        billingCountry = getCurrencyInfo(reqCurrency).defaultCountry;
      }
    }

    const resolvedDodo = resolveDodoProductId(catalogProduct);
    const productId = resolvedDodo.productId;
    const expectedCents = Math.round(catalogProduct.price * 100);

    if (!productId) {
      return NextResponse.json(
        {
          error: `Dodo Product ID is not configured yet for "${catalogProduct.name}". Add its Dodo Product ID (pdt_...) in the Admin Dashboard → Products tab or in your environment variables.`
        },
        { status: 503 }
      );
    }

    const admin = adminClient();
    const since = new Date(Date.now() - 60 * 1000).toISOString();

    // Step 2: Check ownership, rate limit, and Dodo product metadata in parallel
    const [{ products: owned }, { count, error: limitError }, product] = await Promise.all([
      ownedProducts(user),
      admin
        .from('platform_checkout_attempts')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', since),
      retrieveDodoProductCached(productId)
    ]);

    if (owned.includes(key)) {
      return NextResponse.json({ libraryUrl: '/library' });
    }

    if (limitError) throw new Error('Checkout service unavailable');
    if ((count || 0) >= 5) {
      return NextResponse.json(
        { error: 'Please wait a minute before opening another checkout.' },
        { status: 429 }
      );
    }

    const validCents =
      key === 'studio'
        ? Array.from(new Set([expectedCents, 900, 1900]))
        : [expectedCents];

    if (
      product.price.type !== 'one_time_price' ||
      product.price.pay_what_you_want ||
      (product.price.currency === 'USD' && !validCents.includes(product.price.price))
    ) {
      throw new Error('Offer mismatch');
    }

    const attempt = randomUUID();
    const isStandardKey = key === 'studio' || key === 'fieldguide';
    const isStandardCents = [500, 900, 1900].includes(expectedCents);

    // Step 3: Record the checkout attempt and create the Dodo checkout session in parallel
    const recordAttemptTask = (async () => {
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
    })();

    const createSessionTask = (async () => {
      const { client } = paymentConfig();
      const canPassBillingCurrency =
        billingCurrency !== 'USD' && isBillingCurrencyOverrideSupported();

      if (canPassBillingCurrency) {
        try {
          const created = await client.checkoutSessions.create({
            product_cart: [{ product_id: productId, quantity: 1 }],
            customer: { email: user.email! },
            billing_currency: billingCurrency,
            billing_address: { country: billingCountry },
            feature_flags: {
              allow_currency_selection: true,
              allow_customer_editing_country: true
            },
            return_url: origin + '/order',
            metadata: {
              platform_attempt: attempt,
              product_key: key,
              preferred_currency: billingCurrency,
              preferred_country: billingCountry
            }
          });
          markBillingCurrencyOverrideSupported(true);
          return created;
        } catch {
          markBillingCurrencyOverrideSupported(false);
        }
      }

      try {
        return await client.checkoutSessions.create({
          product_cart: [{ product_id: productId, quantity: 1 }],
          customer: { email: user.email! },
          billing_address: { country: billingCountry },
          feature_flags: {
            allow_currency_selection: true,
            allow_customer_editing_country: true
          },
          return_url: origin + '/order',
          metadata: {
            platform_attempt: attempt,
            product_key: key,
            preferred_currency: billingCurrency,
            preferred_country: billingCountry
          }
        });
      } catch {
        return await client.checkoutSessions.create({
          product_cart: [{ product_id: productId, quantity: 1 }],
          customer: { email: user.email! },
          return_url: origin + '/order',
          metadata: {
            platform_attempt: attempt,
            product_key: key
          }
        });
      }
    })();

    const [, session] = await Promise.all([recordAttemptTask, createSessionTask]);

    if (!session.checkout_url || !allowedCheckoutUrl(session.checkout_url)) {
      throw new Error('Invalid provider URL');
    }

    return NextResponse.json(
      { url: session.checkout_url, currency: billingCurrency, country: billingCountry },
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

