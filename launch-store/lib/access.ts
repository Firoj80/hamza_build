import 'server-only';
import { authClient, currentUser } from './supabase/server';
import { redirect } from 'next/navigation';
import { loadProductCatalogState } from './product-store';

export type ProductKey = 'studio' | 'fieldguide' | string;

export async function ownedProducts() {
  const user = await currentUser();
  if (!user) return { user: null, products: [] as string[] };
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
    .filter((p) => p.user_id === user.id && p.access_status === 'active')
    .map((p) => p.product_key);

  const customRevoked = new Set(
    (catalogState?.customPurchases || [])
      .filter((p) => p.user_id === user.id && p.access_status === 'revoked')
      .map((p) => p.product_key)
  );

  const merged = [...new Set([...dbProducts, ...customActive])].filter(
    (k) => !customRevoked.has(k) || dbProducts.includes(k)
  );

  return {
    user,
    products: merged
  };
}

export async function requireProduct(product: ProductKey) {
  const user = await currentUser();
  const nextPath =
    product === 'studio'
      ? '/studio'
      : product === 'fieldguide'
        ? '/fieldguide'
        : `/products/${product}/access`;
  if (!user) redirect('/login?next=' + encodeURIComponent(nextPath));

  const { products } = await ownedProducts();
  if (!products.includes(product)) {
    redirect('/library?locked=' + encodeURIComponent(product));
  }
  return user;
}
