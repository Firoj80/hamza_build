import 'server-only';
import { cookies } from 'next/headers';
import { authClient, currentUser } from './supabase/server';
import { redirect } from 'next/navigation';
import { loadProductCatalogState } from './product-store';
import { hasGuestProductAccess } from './delivery-token';
import { isSalesAdmin } from './platform-policy.mjs';

export type ProductKey = 'studio' | 'fieldguide' | 'bundle' | string;

export async function ownedProducts(
  existingUser?: Awaited<ReturnType<typeof currentUser>>
) {
  const user = existingUser !== undefined ? existingUser : await currentUser();
  if (!user) return { user: null, products: [] as string[] };
  const userEmail = user.email?.trim().toLowerCase() || '';

  if (userEmail && isSalesAdmin(userEmail, process.env.SALES_DASHBOARD_ADMIN_EMAIL)) {
    return {
      user,
      products: ['fieldguide', 'studio', 'bundle']
    };
  }

  const db = await authClient();
  const [{ data, error }, catalogState] = await Promise.all([
    db
      .from('platform_purchases')
      .select('product_key')
      .eq('user_id', user.id)
      .eq('access_status', 'active'),
    loadProductCatalogState().catch(() => null)
  ]);
  if (error) throw new Error('Could not load product access');

  const dbProducts = (data || []).map((p) => p.product_key as string);
  const customActive = (catalogState?.customPurchases || [])
    .filter(
      (p) =>
        p.access_status === 'active' &&
        (p.user_id === user.id ||
          (userEmail && p.customer_email?.toLowerCase() === userEmail))
    )
    .map((p) => p.product_key);

  const customRevoked = new Set(
    (catalogState?.customPurchases || [])
      .filter(
        (p) =>
          p.access_status === 'revoked' &&
          (p.user_id === user.id ||
            (userEmail && p.customer_email?.toLowerCase() === userEmail))
      )
      .map((p) => p.product_key)
  );

  const rawMerged = [...new Set([...dbProducts, ...customActive])].filter(
    (k) => !customRevoked.has(k) || dbProducts.includes(k)
  );

  const expanded = new Set(rawMerged);
  if (expanded.has('bundle')) {
    expanded.add('fieldguide');
    expanded.add('studio');
  }

  return {
    user,
    products: Array.from(expanded)
  };
}

export async function requireProduct(
  product: ProductKey,
  options?: { tokenParam?: string | null }
) {
  const [user, cookieStore] = await Promise.all([currentUser(), cookies()]);

  // Check if buyer has a valid signed delivery token in URL or cookie
  const guestAccess = hasGuestProductAccess(product, {
    tokenParam: options?.tokenParam || null,
    cookieStore
  });

  if (guestAccess.allowed) {
    return {
      user,
      isGuestTokenAccess: true,
      deliveryToken: guestAccess.token,
      guestEmail: guestAccess.payload?.email || null
    };
  }

  if (user) {
    const { products } = await ownedProducts(user);
    if (products.includes(product)) {
      return {
        user,
        isGuestTokenAccess: false,
        deliveryToken: null,
        guestEmail: user.email || null
      };
    }
  }

  const productPage =
    product === 'studio'
      ? '/products/launchpad-studio'
      : product === 'fieldguide'
        ? '/products/first-product-fieldguide'
        : product === 'bundle'
          ? '/products/complete-creator-bundle'
          : `/products/${product}`;

  redirect(productPage);
}
