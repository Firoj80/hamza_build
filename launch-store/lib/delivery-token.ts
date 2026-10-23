import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies';

export const GUEST_DELIVERY_COOKIE = 'launch_delivery_access';

export type GuestDeliveryPayload = {
  paymentId: string;
  productKey: string;
  email?: string;
  issuedAt: number;
};

function getSigningSecret(): string {
  const secret =
    process.env.DODO_PAYMENTS_WEBHOOK_KEY ||
    process.env.DODO_PAYMENTS_API_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    'hamza-launchpad-default-delivery-secret-key';
  return secret;
}

export function createGuestDeliveryToken(payload: {
  paymentId: string;
  productKey: string;
  email?: string | null;
}): string {
  const data: GuestDeliveryPayload = {
    paymentId: payload.paymentId,
    productKey: payload.productKey,
    email: payload.email ? payload.email.trim().toLowerCase() : undefined,
    issuedAt: Date.now()
  };
  const encoded = Buffer.from(JSON.stringify(data), 'utf8').toString('base64url');
  const sig = createHmac('sha256', getSigningSecret()).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

export function verifyGuestDeliveryToken(token?: string | null): GuestDeliveryPayload | null {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [encoded, sig] = token.split('.');
  if (!encoded || !sig) return null;
  try {
    const expectedSig = createHmac('sha256', getSigningSecret())
      .update(encoded)
      .digest('base64url');
    const a = Buffer.from(sig, 'utf8');
    const b = Buffer.from(expectedSig, 'utf8');
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    if (
      !parsed ||
      typeof parsed.paymentId !== 'string' ||
      typeof parsed.productKey !== 'string'
    ) {
      return null;
    }
    return {
      paymentId: parsed.paymentId,
      productKey: parsed.productKey,
      email: typeof parsed.email === 'string' ? parsed.email : undefined,
      issuedAt: typeof parsed.issuedAt === 'number' ? parsed.issuedAt : 0
    };
  } catch {
    return null;
  }
}

export function parseGuestCookieTokens(rawCookie?: string | null): string[] {
  if (!rawCookie) return [];
  return rawCookie
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}

export function serializeGuestCookieTokens(
  existingRaw: string | undefined | null,
  newToken: string
): string {
  const existing = parseGuestCookieTokens(existingRaw);
  const next = [newToken, ...existing.filter((t) => t !== newToken)].slice(0, 12);
  return next.join(',');
}

export function hasGuestProductAccess(
  productKey: string,
  options: {
    tokenParam?: string | null;
    cookieStore?: ReadonlyRequestCookies | null;
    rawCookieValue?: string | null;
  }
): { allowed: boolean; payload: GuestDeliveryPayload | null; token: string | null } {
  const candidates: string[] = [];
  if (options.tokenParam) candidates.push(options.tokenParam);
  const cookieVal =
    options.rawCookieValue ??
    options.cookieStore?.get(GUEST_DELIVERY_COOKIE)?.value ??
    null;
  if (cookieVal) {
    candidates.push(...parseGuestCookieTokens(cookieVal));
  }

  for (const candidate of candidates) {
    const verified = verifyGuestDeliveryToken(candidate);
    if (!verified) continue;
    const isMatch =
      verified.productKey === productKey ||
      (verified.productKey === 'bundle' &&
        (productKey === 'fieldguide' || productKey === 'studio' || productKey === 'bundle'));
    if (isMatch) {
      return { allowed: true, payload: verified, token: candidate };
    }
  }
  return { allowed: false, payload: null, token: null };
}
