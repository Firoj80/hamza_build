import type { CountryCode, Currency } from 'dodopayments/resources/misc';

export interface SupportedCurrencyInfo {
  code: Currency;
  symbol: string;
  name: string;
  defaultCountry: CountryCode;
  flag: string;
  zeroDecimal?: boolean;
}

export const SUPPORTED_CURRENCIES: SupportedCurrencyInfo[] = [
  { code: 'USD', symbol: '$', name: 'US Dollar', defaultCountry: 'US', flag: '🇺🇸' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', defaultCountry: 'IN', flag: '🇮🇳' },
  { code: 'EUR', symbol: '€', name: 'Euro', defaultCountry: 'DE', flag: '🇪🇺' },
  { code: 'GBP', symbol: '£', name: 'British Pound', defaultCountry: 'GB', flag: '🇬🇧' },
  { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar', defaultCountry: 'CA', flag: '🇨🇦' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', defaultCountry: 'AU', flag: '🇦🇺' },
  { code: 'AED', symbol: 'AED ', name: 'UAE Dirham', defaultCountry: 'AE', flag: '🇦🇪' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', defaultCountry: 'SG', flag: '🇸🇬' },
  { code: 'BDT', symbol: '৳', name: 'Bangladeshi Taka', defaultCountry: 'BD', flag: '🇧🇩' },
  { code: 'PKR', symbol: 'Rs ', name: 'Pakistani Rupee', defaultCountry: 'PK', flag: '🇵🇰' },
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira', defaultCountry: 'NG', flag: '🇳🇬' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', defaultCountry: 'BR', flag: '🇧🇷' },
  { code: 'MXN', symbol: 'MX$', name: 'Mexican Peso', defaultCountry: 'MX', flag: '🇲🇽' },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit', defaultCountry: 'MY', flag: '🇲🇾' },
  { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah', defaultCountry: 'ID', flag: '🇮🇩', zeroDecimal: true },
  { code: 'PHP', symbol: '₱', name: 'Philippine Peso', defaultCountry: 'PH', flag: '🇵🇭' },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand', defaultCountry: 'ZA', flag: '🇿🇦' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', defaultCountry: 'JP', flag: '🇯🇵', zeroDecimal: true },
  { code: 'CHF', symbol: 'CHF ', name: 'Swiss Franc', defaultCountry: 'CH', flag: '🇨🇭' },
  { code: 'SAR', symbol: 'SAR ', name: 'Saudi Riyal', defaultCountry: 'SA', flag: '🇸🇦' }
];

// Reliable fallback exchange rates relative to 1 USD (updated when live FX API is fetched)
export const FALLBACK_USD_RATES: Record<string, number> = {
  USD: 1,
  INR: 84.0,
  EUR: 0.92,
  GBP: 0.79,
  CAD: 1.38,
  AUD: 1.52,
  AED: 3.67,
  SGD: 1.34,
  BDT: 119.5,
  PKR: 278.0,
  NGN: 1600.0,
  BRL: 5.7,
  MXN: 19.8,
  MYR: 4.38,
  IDR: 15700.0,
  PHP: 58.0,
  ZAR: 17.7,
  JPY: 152.0,
  CHF: 0.87,
  SAR: 3.75
};

const EUROZONE_COUNTRIES = new Set([
  'AT', 'BE', 'CY', 'DE', 'EE', 'ES', 'FI', 'FR', 'GR', 'HR',
  'IE', 'IT', 'LT', 'LU', 'LV', 'MT', 'NL', 'PT', 'SI', 'SK'
]);

export const COUNTRY_TO_CURRENCY: Record<string, Currency> = {
  US: 'USD',
  IN: 'INR',
  GB: 'GBP',
  CA: 'CAD',
  AU: 'AUD',
  AE: 'AED',
  SG: 'SGD',
  BD: 'BDT',
  PK: 'PKR',
  NG: 'NGN',
  BR: 'BRL',
  MX: 'MXN',
  MY: 'MYR',
  ID: 'IDR',
  PH: 'PHP',
  ZA: 'ZAR',
  JP: 'JPY',
  CH: 'CHF',
  SA: 'SAR'
};

export const TIMEZONE_TO_COUNTRY: Record<string, CountryCode> = {
  'Asia/Kolkata': 'IN',
  'Asia/Calcutta': 'IN',
  'Asia/Dhaka': 'BD',
  'Asia/Karachi': 'PK',
  'Asia/Dubai': 'AE',
  'Asia/Riyadh': 'SA',
  'Asia/Singapore': 'SG',
  'Asia/Kuala_Lumpur': 'MY',
  'Asia/Jakarta': 'ID',
  'Asia/Manila': 'PH',
  'Asia/Tokyo': 'JP',
  'Europe/London': 'GB',
  'Europe/Berlin': 'DE',
  'Europe/Paris': 'FR',
  'Europe/Madrid': 'ES',
  'Europe/Rome': 'IT',
  'Europe/Amsterdam': 'NL',
  'Europe/Dublin': 'IE',
  'Europe/Zurich': 'CH',
  'Africa/Lagos': 'NG',
  'Africa/Johannesburg': 'ZA',
  'America/Toronto': 'CA',
  'America/Vancouver': 'CA',
  'America/Sao_Paulo': 'BR',
  'America/Mexico_City': 'MX',
  'Australia/Sydney': 'AU',
  'Australia/Melbourne': 'AU'
};

export function isSupportedCurrency(value: string | null | undefined): value is Currency {
  if (!value) return false;
  const upper = value.trim().toUpperCase();
  return SUPPORTED_CURRENCIES.some((c) => c.code === upper);
}

export function getCurrencyInfo(code: string | null | undefined): SupportedCurrencyInfo {
  const upper = (code || 'USD').trim().toUpperCase();
  return SUPPORTED_CURRENCIES.find((c) => c.code === upper) || SUPPORTED_CURRENCIES[0];
}

export function currencyForCountry(countryCode: string | null | undefined): {
  country: CountryCode;
  currency: Currency;
} {
  const cleaned = (countryCode || '').trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(cleaned)) {
    return { country: 'US', currency: 'USD' };
  }
  const country = cleaned as CountryCode;
  if (EUROZONE_COUNTRIES.has(cleaned)) {
    return { country, currency: 'EUR' };
  }
  const mapped = COUNTRY_TO_CURRENCY[cleaned];
  if (mapped) {
    return { country, currency: mapped };
  }
  return { country, currency: 'USD' };
}

export function detectClientCountryAndCurrency(): {
  country: CountryCode;
  currency: Currency;
} {
  if (typeof window === 'undefined') {
    return { country: 'US', currency: 'USD' };
  }
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && TIMEZONE_TO_COUNTRY[tz]) {
      return currencyForCountry(TIMEZONE_TO_COUNTRY[tz]);
    }
    const langs = navigator.languages?.length ? navigator.languages : [navigator.language];
    for (const lang of langs) {
      if (!lang) continue;
      const parts = lang.replace('_', '-').split('-');
      if (parts.length >= 2 && parts[1].length === 2) {
        const candidate = parts[1].toUpperCase();
        if (COUNTRY_TO_CURRENCY[candidate] || EUROZONE_COUNTRIES.has(candidate)) {
          return currencyForCountry(candidate);
        }
      }
    }
  } catch {
    // Fallback to USD
  }
  return { country: 'US', currency: 'USD' };
}

export function convertUsdAmount(
  usdAmount: number,
  targetCurrency: string,
  rates: Record<string, number> = FALLBACK_USD_RATES
): number {
  const code = (targetCurrency || 'USD').toUpperCase();
  if (code === 'USD') return usdAmount;
  const rate = rates[code] || FALLBACK_USD_RATES[code] || 1;
  const raw = usdAmount * rate;
  const info = getCurrencyInfo(code);
  if (info.zeroDecimal || raw >= 100) {
    return Math.round(raw);
  }
  return Math.round(raw * 100) / 100;
}

export function formatConvertedMoney(
  amount: number,
  currencyCode: string,
  options?: { compact?: boolean }
): string {
  const code = (currencyCode || 'USD').toUpperCase();
  const info = getCurrencyInfo(code);
  const isWhole = Number.isInteger(amount) || info.zeroDecimal || amount >= 100;
  try {
    return new Intl.NumberFormat(code === 'INR' ? 'en-IN' : 'en-US', {
      style: 'currency',
      currency: code,
      minimumFractionDigits: isWhole ? 0 : 2,
      maximumFractionDigits: isWhole ? 0 : 2
    }).format(amount);
  } catch {
    return `${info.symbol}${isWhole ? Math.round(amount) : amount.toFixed(2)}`;
  }
}

export interface ProductCurrencyQuote {
  productKey: string;
  usdPrice: number;
  usdCompareAtPrice?: number | null;
  currency: Currency;
  convertedPrice: number;
  convertedCompareAtPrice?: number | null;
  formattedPrice: string;
  formattedCompareAtPrice?: string;
  formattedUsdPrice: string;
  source: 'dodo_adaptive' | 'fx_live' | 'usd_base';
  taxIncluded?: boolean;
}
