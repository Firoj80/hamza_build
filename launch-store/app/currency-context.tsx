'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { CountryCode, Currency } from 'dodopayments/resources/misc';
import {
  FALLBACK_USD_RATES,
  ProductCurrencyQuote,
  convertUsdAmount,
  detectClientCountryAndCurrency,
  formatConvertedMoney,
  getCurrencyInfo,
  isSupportedCurrency
} from '@/lib/currency';

interface CurrencyContextValue {
  currency: Currency;
  country: CountryCode;
  rates: Record<string, number>;
  quotes: Record<string, ProductCurrencyQuote>;
  dodoAdaptiveActive: boolean;
  isAutoDetected: boolean;
  formatUsdPrice: (usdAmount: number, productKey?: string) => string;
  getQuote: (usdAmount: number, productKey?: string, usdCompareAt?: number | null) => {
    currency: Currency;
    convertedPrice: number;
    formattedPrice: string;
    formattedCompareAtPrice?: string;
    formattedUsdPrice: string;
    isConverted: boolean;
    source: 'dodo_adaptive' | 'fx_live' | 'usd_base';
  };
}

const CurrencyContext = createContext<CurrencyContextValue>({
  currency: 'USD',
  country: 'US',
  rates: FALLBACK_USD_RATES,
  quotes: {},
  dodoAdaptiveActive: false,
  isAutoDetected: true,
  formatUsdPrice: (usd) => `$${usd}`,
  getQuote: (usd) => ({
    currency: 'USD',
    convertedPrice: usd,
    formattedPrice: `$${usd}`,
    formattedUsdPrice: `$${usd}`,
    isConverted: false,
    source: 'usd_base'
  })
});

const STORAGE_KEY = 'launch_preferred_currency';

function setCurrencyCookie(currency: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `launch_currency=${encodeURIComponent(currency)}; path=/; max-age=31536000; SameSite=Lax`;
}

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>('USD');
  const [country, setCountryState] = useState<CountryCode>('US');
  const [rates, setRates] = useState<Record<string, number>>(FALLBACK_USD_RATES);
  const [quotes, setQuotes] = useState<Record<string, ProductCurrencyQuote>>({});
  const [dodoAdaptiveActive, setDodoAdaptiveActive] = useState(false);

  const fetchCurrencyQuote = useCallback(
    async (reqCurrency?: Currency, reqCountry?: CountryCode, preferServerGeo = false) => {
      try {
        const params = new URLSearchParams();
        if (!preferServerGeo && reqCurrency) params.set('currency', reqCurrency);
        if (!preferServerGeo && reqCountry) params.set('country', reqCountry);
        const qs = params.toString();
        const res = await fetch(`/api/currency${qs ? `?${qs}` : ''}`, {
          cache: 'no-store'
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data.rates && typeof data.rates === 'object') {
          setRates((prev) => ({ ...prev, ...data.rates }));
        }
        if (data.quotes && typeof data.quotes === 'object') {
          setQuotes(data.quotes);
        }
        if (typeof data.dodoAdaptiveActive === 'boolean') {
          setDodoAdaptiveActive(data.dodoAdaptiveActive);
        }

        // If server IP geo header detected the visitor's country/currency, sync with it
        if (preferServerGeo && data.detectedFromHeader && isSupportedCurrency(data.currency)) {
          setCurrencyState(data.currency);
          setCountryState(data.country || getCurrencyInfo(data.currency).defaultCountry);
          setCurrencyCookie(data.currency);
        }
      } catch {
        // Ignore network errors and use built-in fallback rates
      }
    },
    []
  );

  useEffect(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage error
    }

    // Automatically detect visitor country & currency from timezone/locale immediately
    const clientDetected = detectClientCountryAndCurrency();
    setCurrencyState(clientDetected.currency);
    setCountryState(clientDetected.country);
    setCurrencyCookie(clientDetected.currency);

    if (clientDetected.currency !== 'USD') {
      void fetchCurrencyQuote(clientDetected.currency, clientDetected.country, false);
    } else {
      // Also allow server IP header (x-vercel-ip-country / cf-ipcountry) to auto-detect if timezone was generic
      void fetchCurrencyQuote(undefined, undefined, true);
    }
  }, [fetchCurrencyQuote]);

  const getQuote = useCallback(
    (usdAmount: number, productKey?: string, usdCompareAt?: number | null) => {
      const formattedUsdPrice = formatConvertedMoney(usdAmount, 'USD');
      if (currency === 'USD') {
        return {
          currency: 'USD' as Currency,
          convertedPrice: usdAmount,
          formattedPrice: formattedUsdPrice,
          formattedCompareAtPrice: usdCompareAt
            ? formatConvertedMoney(usdCompareAt, 'USD')
            : undefined,
          formattedUsdPrice,
          isConverted: false,
          source: 'usd_base' as const
        };
      }

      const apiQuote = productKey ? quotes[productKey] : undefined;
      if (apiQuote && apiQuote.currency === currency && apiQuote.usdPrice === usdAmount) {
        return {
          currency,
          convertedPrice: apiQuote.convertedPrice,
          formattedPrice: apiQuote.formattedPrice,
          formattedCompareAtPrice:
            apiQuote.formattedCompareAtPrice ||
            (usdCompareAt
              ? formatConvertedMoney(convertUsdAmount(usdCompareAt, currency, rates), currency)
              : undefined),
          formattedUsdPrice,
          isConverted: true,
          source: apiQuote.source
        };
      }

      const convertedPrice = convertUsdAmount(usdAmount, currency, rates);
      const convertedCompare = usdCompareAt
        ? convertUsdAmount(usdCompareAt, currency, rates)
        : undefined;

      return {
        currency,
        convertedPrice,
        formattedPrice: formatConvertedMoney(convertedPrice, currency),
        formattedCompareAtPrice: convertedCompare
          ? formatConvertedMoney(convertedCompare, currency)
          : undefined,
        formattedUsdPrice,
        isConverted: true,
        source: 'fx_live' as const
      };
    },
    [currency, quotes, rates]
  );

  const formatUsdPrice = useCallback(
    (usdAmount: number, productKey?: string) => {
      return getQuote(usdAmount, productKey).formattedPrice;
    },
    [getQuote]
  );

  const value = useMemo(
    () => ({
      currency,
      country,
      rates,
      quotes,
      dodoAdaptiveActive,
      isAutoDetected: true,
      formatUsdPrice,
      getQuote
    }),
    [currency, country, rates, quotes, dodoAdaptiveActive, formatUsdPrice, getQuote]
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  return useContext(CurrencyContext);
}

export function PriceTag({
  usdPrice,
  productKey,
  usdCompareAtPrice,
  showUsdSubtext = true,
  mode = 'card'
}: {
  usdPrice: number;
  productKey?: string;
  usdCompareAtPrice?: number | null;
  showUsdSubtext?: boolean;
  mode?: 'card' | 'detail-hero' | 'detail-aside' | 'inline';
}) {
  const { getQuote } = useCurrency();
  const q = getQuote(usdPrice, productKey, usdCompareAtPrice);

  if (mode === 'inline') {
    return (
      <>
        {q.formattedPrice}
        {q.isConverted && showUsdSubtext ? ` (${q.formattedUsdPrice} USD)` : ''}
      </>
    );
  }

  if (mode === 'detail-hero') {
    return (
      <div className="detail-price">
        {usdCompareAtPrice && usdCompareAtPrice > usdPrice && q.formattedCompareAtPrice && (
          <s style={{ fontSize: '20px', color: '#8a948d', marginRight: '8px' }}>
            {q.formattedCompareAtPrice}
          </s>
        )}
        <strong>{q.formattedPrice}</strong>
        <span>
          {q.currency} · pay once
          <br />
          {q.isConverted && showUsdSubtext ? `≈ ${q.formattedUsdPrice} USD · Instant download` : 'Instant download'}
        </span>
      </div>
    );
  }

  if (mode === 'detail-aside') {
    return (
      <span className="detail-price">
        <strong>{q.formattedPrice}</strong>
        <small>
          {q.currency} · one-time purchase
          {q.isConverted && showUsdSubtext ? ` (≈ ${q.formattedUsdPrice} USD)` : ''}
        </small>
      </span>
    );
  }

  // Default: 'card' mode inside product-title
  return (
    <span>
      {usdCompareAtPrice && usdCompareAtPrice > usdPrice && q.formattedCompareAtPrice && (
        <s style={{ fontSize: '14px', color: '#8a948d', marginRight: '6px', fontWeight: 500 }}>
          {q.formattedCompareAtPrice}
        </s>
      )}
      {q.formattedPrice}
      <small>
        {q.currency} · pay once{q.isConverted && showUsdSubtext ? ` (${q.formattedUsdPrice})` : ''}
      </small>
    </span>
  );
}

export function LocalizedCtaText({
  label,
  usdPrice,
  productKey
}: {
  label: string;
  usdPrice: number;
  productKey?: string;
}) {
  const { getQuote } = useCurrency();
  const q = getQuote(usdPrice, productKey);
  if (!q.isConverted) return <>{label}</>;

  // Replace $X or $X.XX in the CTA label with the localized formatted price
  const replaced = label.replace(/\$\d+(?:\.\d{1,2})?/g, q.formattedPrice);
  if (replaced !== label) {
    return <>{replaced}</>;
  }
  return (
    <>
      {label} · {q.formattedPrice}
    </>
  );
}
