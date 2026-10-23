import { NextRequest, NextResponse } from 'next/server';
import type { CountryCode, Currency } from 'dodopayments/resources/misc';
import { paymentConfig } from '@/lib/dodo';
import { getActiveCatalogProducts, resolveDodoProductId } from '@/lib/product-store';
import {
  FALLBACK_USD_RATES,
  ProductCurrencyQuote,
  convertUsdAmount,
  currencyForCountry,
  formatConvertedMoney,
  getCurrencyInfo,
  isSupportedCurrency
} from '@/lib/currency';

export const runtime = 'nodejs';

let cachedRates: Record<string, number> | null = null;
let cachedRatesAt = 0;
const ONE_HOUR_MS = 60 * 60 * 1000;

async function getLiveUsdRates(): Promise<{ rates: Record<string, number>; isLive: boolean }> {
  const now = Date.now();
  if (cachedRates && now - cachedRatesAt < ONE_HOUR_MS) {
    return { rates: cachedRates, isLive: true };
  }
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    const res = await fetch('https://open.er-api.com/v6/latest/USD', {
      signal: controller.signal,
      next: { revalidate: 3600 }
    });
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json();
      if (data && typeof data.rates === 'object') {
        cachedRates = { ...FALLBACK_USD_RATES, ...data.rates };
        cachedRatesAt = now;
        return { rates: cachedRates!, isLive: true };
      }
    }
  } catch {
    // Fallback to built-in rates
  }
  return { rates: FALLBACK_USD_RATES, isLive: false };
}

function detectRequestGeo(request: NextRequest): {
  country: CountryCode;
  currency: Currency;
  detectedFromHeader: boolean;
} {
  const headerCountry =
    request.headers.get('x-vercel-ip-country') ||
    request.headers.get('cf-ipcountry') ||
    request.headers.get('x-country-code') ||
    '';
  if (headerCountry && /^[A-Za-z]{2}$/.test(headerCountry.trim())) {
    const mapped = currencyForCountry(headerCountry);
    return { ...mapped, detectedFromHeader: true };
  }
  return { country: 'US', currency: 'USD', detectedFromHeader: false };
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const queryCurrency = url.searchParams.get('currency');
    const queryCountry = url.searchParams.get('country');
    const cookieCurrency = request.cookies.get('launch_currency')?.value;

    const geo = detectRequestGeo(request);

    let targetCurrency: Currency = geo.currency;
    let targetCountry: CountryCode = geo.country;

    if (queryCountry && /^[A-Za-z]{2}$/.test(queryCountry.trim())) {
      const fromCountry = currencyForCountry(queryCountry);
      targetCountry = fromCountry.country;
      targetCurrency = fromCountry.currency;
    }

    if (isSupportedCurrency(queryCurrency)) {
      targetCurrency = queryCurrency.trim().toUpperCase() as Currency;
      const info = getCurrencyInfo(targetCurrency);
      if (!queryCountry) {
        targetCountry = info.defaultCountry;
      }
    } else if (!queryCountry && isSupportedCurrency(cookieCurrency)) {
      targetCurrency = cookieCurrency.trim().toUpperCase() as Currency;
      targetCountry = getCurrencyInfo(targetCurrency).defaultCountry;
    }

    const [catalogProducts, { rates }] = await Promise.all([
      getActiveCatalogProducts(),
      getLiveUsdRates()
    ]);

    // Map product keys to resolved Dodo product IDs
    const dodoProductMap = new Map<string, string>();
    for (const p of catalogProducts) {
      const resolved = resolveDodoProductId(p);
      if (resolved.productId) {
        dodoProductMap.set(p.key, resolved.productId);
      }
    }

    // Attempt Dodo checkoutSessions.preview when targetCurrency !== 'USD' (or to verify Dodo adaptive pricing)
    const dodoQuotesByProductId = new Map<
      string,
      { amountMajor: number; currency: Currency; taxIncluded: boolean }
    >();
    let dodoAdaptiveActive = false;

    if (targetCurrency !== 'USD' && dodoProductMap.size > 0) {
      try {
        const { client } = paymentConfig();
        const uniqueProductIds = Array.from(new Set(dodoProductMap.values()));
        const preview = await client.checkoutSessions.preview({
          product_cart: uniqueProductIds.map((product_id) => ({
            product_id,
            quantity: 1
          })),
          billing_currency: targetCurrency,
          billing_address: {
            country: targetCountry
          }
        });

        if (preview && preview.currency === targetCurrency && Array.isArray(preview.product_cart)) {
          dodoAdaptiveActive = true;
          const currencyInfo = getCurrencyInfo(preview.currency);
          const divisor = currencyInfo.zeroDecimal ? 1 : 100;
          for (const cartItem of preview.product_cart) {
            if (cartItem.product_id && typeof cartItem.discounted_price === 'number') {
              const rawMajor = cartItem.discounted_price / divisor;
              dodoQuotesByProductId.set(cartItem.product_id, {
                amountMajor:
                  currencyInfo.zeroDecimal || rawMajor >= 100
                    ? Math.round(rawMajor)
                    : Math.round(rawMajor * 100) / 100,
                currency: preview.currency,
                taxIncluded: Boolean(cartItem.tax_inclusive)
              });
            }
          }
        }
      } catch {
        // Dodo preview unavailable or Adaptive Currency not enabled in Dodo Business settings; fall back to live FX rate
      }
    }

    const quotes: Record<string, ProductCurrencyQuote> = {};
    for (const p of catalogProducts) {
      const usdPrice = p.price;
      const usdCompare = p.compareAtPrice;
      const formattedUsdPrice = formatConvertedMoney(usdPrice, 'USD');

      if (targetCurrency === 'USD') {
        quotes[p.key] = {
          productKey: p.key,
          usdPrice,
          usdCompareAtPrice: usdCompare,
          currency: 'USD',
          convertedPrice: usdPrice,
          convertedCompareAtPrice: usdCompare,
          formattedPrice: formattedUsdPrice,
          formattedCompareAtPrice: usdCompare ? formatConvertedMoney(usdCompare, 'USD') : undefined,
          formattedUsdPrice,
          source: 'usd_base'
        };
        continue;
      }

      const dodoId = dodoProductMap.get(p.key);
      const dodoQuote = dodoId ? dodoQuotesByProductId.get(dodoId) : undefined;

      const convertedPrice = dodoQuote
        ? dodoQuote.amountMajor
        : convertUsdAmount(usdPrice, targetCurrency, rates);

      const convertedCompareAtPrice = usdCompare
        ? convertUsdAmount(usdCompare, targetCurrency, rates)
        : undefined;

      quotes[p.key] = {
        productKey: p.key,
        usdPrice,
        usdCompareAtPrice: usdCompare,
        currency: targetCurrency,
        convertedPrice,
        convertedCompareAtPrice,
        formattedPrice: formatConvertedMoney(convertedPrice, targetCurrency),
        formattedCompareAtPrice: convertedCompareAtPrice
          ? formatConvertedMoney(convertedCompareAtPrice, targetCurrency)
          : undefined,
        formattedUsdPrice,
        source: dodoQuote ? 'dodo_adaptive' : 'fx_live',
        taxIncluded: dodoQuote?.taxIncluded
      };
    }

    return NextResponse.json(
      {
        currency: targetCurrency,
        country: targetCountry,
        detectedFromHeader: geo.detectedFromHeader,
        dodoAdaptiveActive,
        rates,
        quotes
      },
      {
        headers: {
          'Cache-Control': 'private, max-age=120'
        }
      }
    );
  } catch {
    return NextResponse.json(
      {
        currency: 'USD',
        country: 'US',
        detectedFromHeader: false,
        dodoAdaptiveActive: false,
        rates: FALLBACK_USD_RATES,
        quotes: {}
      },
      { status: 200 }
    );
  }
}
