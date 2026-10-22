import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@/lib/supabase/server';
import { isSalesAdmin } from '@/lib/platform-policy.mjs';
import { trustedRequestOrigin } from '@/lib/payment-policy.mjs';
import {
  DEFAULT_MANAGED_PRODUCTS,
  loadProductCatalogState,
  normalizeManagedProduct,
  resolveDodoProductId,
  sanitizeSlug,
  saveProductCatalogState,
  type ManagedProduct
} from '@/lib/product-store';

export const runtime = 'nodejs';

async function requireAdmin() {
  const user = await currentUser();
  if (!user || !isSalesAdmin(user.email, process.env.SALES_DASHBOARD_ADMIN_EMAIL)) {
    return null;
  }
  return user;
}

function enrichProductsWithDodoStatus(products: ManagedProduct[]) {
  return products.map((p) => {
    const resolved = resolveDodoProductId(p);
    return {
      ...p,
      resolvedDodo: {
        configured: Boolean(resolved.productId),
        source: resolved.source,
        envVarName: resolved.envVarName,
        maskedId: resolved.productId
          ? resolved.productId.length > 12
            ? `${resolved.productId.slice(0, 8)}…${resolved.productId.slice(-4)}`
            : resolved.productId
          : ''
      }
    };
  });
}

export async function GET() {
  const user = await requireAdmin();
  if (!user) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const state = await loadProductCatalogState();
  return NextResponse.json({
    ok: true,
    products: enrichProductsWithDodoStatus(state.products),
    dodoEnvironment: process.env.DODO_PAYMENTS_ENVIRONMENT || 'test_mode',
    hasDodoApiKey: Boolean(process.env.DODO_PAYMENTS_API_KEY),
    updatedAt: state.updatedAt
  });
}

export async function POST(request: NextRequest) {
  if (!trustedRequestOrigin(request)) {
    return NextResponse.json({ error: 'Untrusted request origin' }, { status: 403 });
  }
  const user = await requireAdmin();
  if (!user) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const action = typeof body.action === 'string' ? body.action : '';

  if (action === 'upsert_product') {
    const rawProduct = (body.product || {}) as Partial<ManagedProduct>;
    const originalKey = typeof body.originalKey === 'string' ? body.originalKey.trim() : '';

    if (!rawProduct.name || typeof rawProduct.name !== 'string' || !rawProduct.name.trim()) {
      return NextResponse.json({ error: 'Product title is required.' }, { status: 400 });
    }

    const state = await saveProductCatalogState((current) => {
      const existingIndex = current.products.findIndex(
        (p) =>
          (originalKey && p.key === originalKey) ||
          (rawProduct.key && p.key === rawProduct.key) ||
          (rawProduct.slug && p.slug === rawProduct.slug)
      );

      const fallback =
        existingIndex >= 0
          ? current.products[existingIndex]
          : DEFAULT_MANAGED_PRODUCTS.find((d) => d.key === rawProduct.key);

      const desiredKey =
        fallback?.key === 'fieldguide' || fallback?.key === 'studio'
          ? fallback.key
          : sanitizeSlug(rawProduct.key || rawProduct.slug || rawProduct.name || '') ||
            `product-${current.products.length + 1}`;

      const desiredSlug =
        sanitizeSlug(rawProduct.slug || desiredKey) || desiredKey;

      const normalized = normalizeManagedProduct(
        {
          ...rawProduct,
          key: desiredKey,
          slug: desiredSlug,
          updatedAt: new Date().toISOString()
        },
        fallback,
        existingIndex >= 0 ? existingIndex : current.products.length
      );

      const nextProducts = [...current.products];
      if (existingIndex >= 0) {
        nextProducts[existingIndex] = normalized;
      } else {
        nextProducts.push(normalized);
      }

      const nextDeleted = current.deletedBuiltinKeys.filter((k) => k !== normalized.key);

      return {
        ...current,
        products: nextProducts,
        deletedBuiltinKeys: nextDeleted
      };
    });

    return NextResponse.json({
      ok: true,
      products: enrichProductsWithDodoStatus(state.products),
      updatedAt: state.updatedAt
    });
  }

  if (action === 'delete_product') {
    const keyToDelete = typeof body.key === 'string' ? body.key.trim() : '';
    if (!keyToDelete) {
      return NextResponse.json({ error: 'Product key is required to delete.' }, { status: 400 });
    }

    const state = await saveProductCatalogState((current) => {
      const nextProducts = current.products.filter((p) => p.key !== keyToDelete);
      const isBuiltin = DEFAULT_MANAGED_PRODUCTS.some((d) => d.key === keyToDelete);
      const nextDeleted =
        isBuiltin && !current.deletedBuiltinKeys.includes(keyToDelete)
          ? [...current.deletedBuiltinKeys, keyToDelete]
          : current.deletedBuiltinKeys;

      return {
        ...current,
        products: nextProducts,
        deletedBuiltinKeys: nextDeleted
      };
    });

    return NextResponse.json({
      ok: true,
      products: enrichProductsWithDodoStatus(state.products),
      updatedAt: state.updatedAt
    });
  }

  if (action === 'restore_defaults') {
    const state = await saveProductCatalogState((current) => {
      const customOnly = current.products.filter(
        (p) => !DEFAULT_MANAGED_PRODUCTS.some((d) => d.key === p.key)
      );
      return {
        ...current,
        products: [...DEFAULT_MANAGED_PRODUCTS, ...customOnly],
        deletedBuiltinKeys: []
      };
    });

    return NextResponse.json({
      ok: true,
      products: enrichProductsWithDodoStatus(state.products),
      updatedAt: state.updatedAt
    });
  }

  return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
}
