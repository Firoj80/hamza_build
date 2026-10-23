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

    // Step 1: Fetch catalog product and optional signed-in user in parallel (guest checkout allowed!)
    const [catalogProduct, user] = await Promise.all([
      findProductBySlugOrKey(rawKey),
      currentUser().catch(() => null)
    ]);

    if (!catalogProduct || catalogProduct.status === 'archived') {
      return NextResponse.json({ error: 'Unknown product' }, { status: 400 });
    }

    const key = catalogProduct.key;

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
    const product = await retrieveDodoProductCached(productId);

    const validCents =
      key === 'studio'
        ? Array.from(new Set([expectedCents, 900, 1900]))
        : key === 'bundle'
          ? Array.from(new Set([expectedCents, 1200, 1400]))
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
      if (user && isStandardKey && isStandardCents) {
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
      } else if (user) {
        const directRes = await admin.from('platform_checkout_attempts').insert({
          id: attempt,
          user_id: user.id,
          product_key: key,
          provider_product_id: productId || 'unconfigured',
          expected_cents: expectedCents
        });
        dbError = directRes.error;
      }

      if (!user || !isStandardKey || !isStandardCents || dbError) {
        await saveProductCatalogState((curr) => ({
          ...curr,
          customAttempts: [
            {
              id: attempt,
              user_id: user ? user.id : 'guest',
              customer_email: user?.email?.toLowerCase() || undefined,
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

    const returnUrl = `${origin}/order?product=${encodeURIComponent(key)}&attempt=${encodeURIComponent(attempt)}`;
    const customerPayload = user?.email ? { customer: { email: user.email } } : {};

    const createSessionTask = (async () => {
      const { client } = paymentConfig();
      const canPassBillingCurrency =
        billingCurrency !== 'USD' && isBillingCurrencyOverrideSupported();

      if (canPassBillingCurrency) {
        try {
          const created = await client.checkoutSessions.create({
            product_cart: [{ product_id: productId, quantity: 1 }],
            ...customerPayload,
            billing_currency: billingCurrency,
            billing_address: { country: billingCountry },
            feature_flags: {
              allow_currency_selection: true,
              allow_customer_editing_country: true
            },
            return_url: returnUrl,
            metadata: {
              platform_attempt: attempt,
              product_key: key,
              checkout_mode: user ? 'account' : 'guest',
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
          ...customerPayload,
          billing_address: { country: billingCountry },
          feature_flags: {
            allow_currency_selection: true,
            allow_customer_editing_country: true
          },
          return_url: returnUrl,
          metadata: {
            platform_attempt: attempt,
            product_key: key,
            checkout_mode: user ? 'account' : 'guest',
            preferred_currency: billingCurrency,
            preferred_country: billingCountry
          }
        });
      } catch {
        return await client.checkoutSessions.create({
          product_cart: [{ product_id: productId, quantity: 1 }],
          ...customerPayload,
          return_url: returnUrl,
          metadata: {
            platform_attempt: attempt,
            product_key: key,
            checkout_mode: user ? 'account' : 'guest'
          }
        });
      }
    })();

    const [, session] = await Promise.all([recordAttemptTask, createSessionTask]);

    if (!session.checkout_url || !allowedCheckoutUrl(session.checkout_url)) {
      throw new Error('Invalid provider URL');
    }

    return NextResponse.json(
      {
        url: session.checkout_url,
        currency: billingCurrency,
        country: billingCountry,
        guestCheckout: !user
      },
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
