import 'server-only';
import fs from 'node:fs/promises';
import path from 'node:path';
import { adminClient } from './supabase/admin';
import { isSalesAdmin } from './platform-policy.mjs';
import { bundle, guide, productDetails, studio } from './catalog';

export type ManagedProductSection = {
  title: string;
  body: string;
};

export type ManagedProduct = {
  key: string; // e.g. 'fieldguide', 'studio', 'bundle', or custom slug/key
  slug: string; // URL slug under /products/[slug]
  name: string;
  price: number; // Price in USD dollars, e.g. 5, 9, 12
  compareAtPrice?: number | null; // Optional original price for strikethrough
  currency: 'USD';
  status: 'active' | 'draft' | 'archived';
  featured: boolean;
  sortOrder: number;
  // Dodo Payments configuration
  dodoProductId: string; // Optional direct pdt_... ID set in Admin UI
  dodoEnvVar: string; // e.g. 'DODO_FIELDGUIDE_PRODUCT_ID'
  // Badges & Card UI
  eyebrow: string;
  headline: string;
  badge: string; // e.g. '$5 · START HERE'
  badgeTheme: 'default' | 'green' | 'amber';
  cardTag: string; // e.g. '01 / THE FOUNDATION'
  ctaLabel: string; // e.g. 'Get the Fieldguide · $5'
  formatNote: string; // e.g. 'Instant PDF download · No signup required'
  // Descriptions & SEO
  shortDescription: string; // Shown on homepage cards
  description: string; // Shown on product detail hero
  shareTitle: string;
  shareDescription: string;
  // Media & Visuals
  image: string;
  ogImage: string;
  imageAlt: string;
  imageLabel: string;
  coverTheme: 'light' | 'dark';
  galleryImages: string[];
  // Lists & Sections
  cardBullets: string[]; // 3-4 bullets on homepage card
  includes: string[]; // 'What You Get' bullets on product detail page
  sections: ManagedProductSection[]; // 3 numbered stages on product detail page
  // Expectations & Cross-sell
  access: string;
  limitation: string;
  nextStep: string;
  nextHref: string;
  // Buyer Delivery / Access
  deliveryType: 'fieldguide_reader' | 'studio_workspace' | 'bundle_both' | 'hosted_reader' | 'external_url';
  readerHref: string; // '/fieldguide', '/studio', or '/products/<slug>/access'
  externalAccessUrl?: string; // Optional external Notion/Drive/Figma/Download link for buyers
  hostedContent?: string; // Markdown/text content shown to buyers on /products/<slug>/access
  updatedAt: string;
};

export type CustomCheckoutAttempt = {
  id: string;
  user_id: string;
  customer_email?: string;
  product_key: string;
  provider_product_id: string;
  expected_cents: number;
  created_at: string;
};

export type CustomPurchaseRecord = {
  payment_id: string;
  attempt_id: string;
  user_id: string;
  customer_email?: string;
  customer_name?: string;
  product_key: string;
  access_status: 'active' | 'pending' | 'revoked';
  provider_status: string;
  amount_cents: number;
  currency: string;
  updated_at: string;
};

export type ProductCatalogPersistedState = {
  products: ManagedProduct[];
  deletedBuiltinKeys: string[];
  customAttempts: CustomCheckoutAttempt[];
  customPurchases: CustomPurchaseRecord[];
  updatedAt: string;
};

const STATE_KEY = '_admin_product_catalog';
const LOCAL_FALLBACK_PATH = path.join('/tmp', 'hamza-product-catalog-store.json');

export const DEFAULT_MANAGED_PRODUCTS: ManagedProduct[] = [
  {
    key: 'fieldguide',
    slug: guide.slug,
    name: productDetails['first-product-fieldguide'].name,
    price: productDetails['first-product-fieldguide'].price,
    compareAtPrice: 9,
    currency: 'USD',
    status: 'active',
    featured: true,
    sortOrder: 1,
    dodoProductId: '',
    dodoEnvVar: 'DODO_FIELDGUIDE_PRODUCT_ID',
    eyebrow: productDetails['first-product-fieldguide'].eyebrow,
    headline: productDetails['first-product-fieldguide'].headline,
    badge: '$5 · WAS $9 (SAVE $4)',
    badgeTheme: 'default',
    cardTag: '01 / THE FOUNDATION',
    ctaLabel: 'Get the Fieldguide · $5 (Was $9)',
    formatNote: 'Launch Offer: Save $4 (44% Off $9) · Instant PDF + Web Reader',
    shortDescription:
      'A practical seven-page guide to finding one useful problem, checking real demand, and planning your first profitable launch.',
    description: productDetails['first-product-fieldguide'].description,
    shareTitle: productDetails['first-product-fieldguide'].shareTitle,
    shareDescription: productDetails['first-product-fieldguide'].shareDescription,
    image: productDetails['first-product-fieldguide'].image,
    ogImage: productDetails['first-product-fieldguide'].ogImage,
    imageAlt: productDetails['first-product-fieldguide'].imageAlt,
    imageLabel: productDetails['first-product-fieldguide'].imageLabel,
    coverTheme: 'light',
    galleryImages: [],
    cardBullets: [
      'Instant downloadable 7-page PDF guide + online reader',
      '15-point idea validation scorecard & 5 buyer research questions',
      'Worked example, fill-in offer brief, AI prompts & launch checklist'
    ],
    includes: [...productDetails['first-product-fieldguide'].includes],
    sections: productDetails['first-product-fieldguide'].sections.map((s) => ({
      title: s.title,
      body: s.body
    })),
    access: productDetails['first-product-fieldguide'].access,
    limitation: productDetails['first-product-fieldguide'].limitation,
    nextStep: productDetails['first-product-fieldguide'].nextStep,
    nextHref: productDetails['first-product-fieldguide'].nextHref,
    deliveryType: 'fieldguide_reader',
    readerHref: '/fieldguide',
    externalAccessUrl: '',
    hostedContent: '',
    updatedAt: '2025-02-20T00:00:00.000Z'
  },
  {
    key: 'studio',
    slug: studio.slug,
    name: productDetails['launchpad-studio'].name,
    price: productDetails['launchpad-studio'].price,
    compareAtPrice: 19,
    currency: 'USD',
    status: 'active',
    featured: true,
    sortOrder: 2,
    dodoProductId: '',
    dodoEnvVar: 'DODO_STUDIO_PRODUCT_ID',
    eyebrow: productDetails['launchpad-studio'].eyebrow,
    headline: productDetails['launchpad-studio'].headline,
    badge: '$9 · WAS $19 (SAVE $10)',
    badgeTheme: 'green',
    cardTag: '02 / THE WORKSPACE + HTML APP',
    ctaLabel: 'Get Launchpad Studio · $9 (Was $19)',
    formatNote: 'Launch Offer: Save $10 (53% Off $19) · Standalone Offline HTML App',
    shortDescription:
      'Your complete 5-stage launch system: downloadable offline HTML app with 15-point idea scorecard, 8 AI prompt engines, 30 Threads post starters, and revenue calculator.',
    description: productDetails['launchpad-studio'].description,
    shareTitle: productDetails['launchpad-studio'].shareTitle,
    shareDescription: productDetails['launchpad-studio'].shareDescription,
    image: productDetails['launchpad-studio'].image,
    ogImage: productDetails['launchpad-studio'].ogImage,
    imageAlt: productDetails['launchpad-studio'].imageAlt,
    imageLabel: productDetails['launchpad-studio'].imageLabel,
    coverTheme: 'dark',
    galleryImages: [],
    cardBullets: [
      'Downloadable standalone HTML app (works offline forever on any device)',
      '15-Point Idea Scorecard + 8-Mode AI Master Prompt Builder',
      '30-Day Threads Content Engine, Hook Swapper & Revenue Calculator',
      '1-Click Markdown Launch Plan & JSON Project Backup export'
    ],
    includes: [...productDetails['launchpad-studio'].includes],
    sections: productDetails['launchpad-studio'].sections.map((s) => ({
      title: s.title,
      body: s.body
    })),
    access: productDetails['launchpad-studio'].access,
    limitation: productDetails['launchpad-studio'].limitation,
    nextStep: productDetails['launchpad-studio'].nextStep,
    nextHref: productDetails['launchpad-studio'].nextHref,
    deliveryType: 'studio_workspace',
    readerHref: '/studio',
    externalAccessUrl: '',
    hostedContent: '',
    updatedAt: '2025-02-20T00:00:00.000Z'
  },
  {
    key: 'bundle',
    slug: bundle.slug,
    name: productDetails['complete-creator-bundle'].name,
    price: productDetails['complete-creator-bundle'].price,
    compareAtPrice: 25,
    currency: 'USD',
    status: 'active',
    featured: true,
    sortOrder: 3,
    dodoProductId: '',
    dodoEnvVar: 'DODO_BUNDLE_PRODUCT_ID',
    eyebrow: productDetails['complete-creator-bundle'].eyebrow,
    headline: productDetails['complete-creator-bundle'].headline,
    badge: '$12 · WAS $25 (SAVE $13)',
    badgeTheme: 'amber',
    cardTag: '03 / COMPLETE BUNDLE · PDF + HTML',
    ctaLabel: 'Get Complete Bundle · $12 (Was $25)',
    formatNote: 'Best Value: Save $13 (52% Off $25) · Includes Both PDF + HTML App',
    shortDescription:
      'Get both tools in one package: the 7-page Idea-to-Income Fieldguide PDF + the standalone Launchpad Studio 5-stage HTML app for $12 (original price $25).',
    description: productDetails['complete-creator-bundle'].description,
    shareTitle: productDetails['complete-creator-bundle'].shareTitle,
    shareDescription: productDetails['complete-creator-bundle'].shareDescription,
    image: productDetails['complete-creator-bundle'].image,
    ogImage: productDetails['complete-creator-bundle'].ogImage,
    imageAlt: productDetails['complete-creator-bundle'].imageAlt,
    imageLabel: productDetails['complete-creator-bundle'].imageLabel,
    coverTheme: 'dark',
    galleryImages: [],
    cardBullets: [
      'Both files included: Idea-to-Income-Fieldguide.pdf + Launchpad-Studio.html',
      '7-page validation framework + 24 niche blueprints & 15-point scorecard',
      '8-Mode AI Master Prompt Studio + 30-Day Threads Content Engine',
      'Save $13 off the $25 original price with instant dual-file download'
    ],
    includes: [...productDetails['complete-creator-bundle'].includes],
    sections: productDetails['complete-creator-bundle'].sections.map((s) => ({
      title: s.title,
      body: s.body
    })),
    access: productDetails['complete-creator-bundle'].access,
    limitation: productDetails['complete-creator-bundle'].limitation,
    nextStep: productDetails['complete-creator-bundle'].nextStep,
    nextHref: productDetails['complete-creator-bundle'].nextHref,
    deliveryType: 'bundle_both',
    readerHref: '/studio',
    externalAccessUrl: '',
    hostedContent: '',
    updatedAt: '2025-02-20T00:00:00.000Z'
  }
];

export function sanitizeSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 64);
}

export function normalizeManagedProduct(
  raw: Partial<ManagedProduct>,
  fallback?: ManagedProduct,
  index = 0
): ManagedProduct {
  const base = fallback || {
    ...DEFAULT_MANAGED_PRODUCTS[0],
    key: sanitizeSlug(raw.key || raw.slug || raw.name || `product-${index + 1}`) || `product-${index + 1}`,
    slug: sanitizeSlug(raw.slug || raw.key || raw.name || `product-${index + 1}`) || `product-${index + 1}`,
    name: 'New Digital Product',
    price: 9,
    compareAtPrice: null,
    status: 'active' as const,
    featured: true,
    sortOrder: index + 1,
    dodoProductId: '',
    dodoEnvVar: '',
    eyebrow: 'DIGITAL EDITION',
    headline: 'A clear, practical tool built for makers.',
    badge: '$9 · DIGITAL TOOL',
    badgeTheme: 'default' as const,
    cardTag: `0${index + 1} / DIGITAL PRODUCT`,
    ctaLabel: '',
    formatNote: 'Instant download · One-time purchase · Taxes shown at checkout',
    shortDescription: 'A focused resource designed to help you execute faster with clarity.',
    description: 'A practical resource to help you validate, build, and launch with clarity.',
    shareTitle: '',
    shareDescription: '',
    image: '/images/idea-to-income-fieldguide-cover.svg',
    ogImage: '/images/idea-to-income-fieldguide-og.png',
    imageAlt: 'Digital product cover showcase',
    imageLabel: `EDITION 0${index + 1} · DIGITAL COVER`,
    coverTheme: 'light' as const,
    galleryImages: [],
    cardBullets: [
      'Actionable templates and frameworks',
      'Worked examples and step-by-step guidance',
      'Instant file download right after checkout'
    ],
    includes: [
      'Complete guide and structured templates',
      'Worked examples you can adapt immediately',
      'Instant download right after Dodo checkout'
    ],
    sections: [
      {
        title: 'Start with a clear framework',
        body: 'Follow a structured process instead of starting from a blank page.'
      },
      {
        title: 'Customize to your project',
        body: 'Adapt the included prompts, worksheets, and examples to your specific audience.'
      },
      {
        title: 'Put it into action',
        body: 'Download and use your resource anytime on desktop or mobile.'
      }
    ],
    access: 'Instant file download right after Dodo checkout. One-time payment in USD.',
    limitation: 'Provides structured frameworks, templates, and examples. Results depend on your execution and market validation.',
    nextStep: 'Looking for our full 5-stage workspace? Explore Launchpad Studio.',
    nextHref: '/products/launchpad-studio',
    deliveryType: 'hosted_reader' as const,
    readerHref: '',
    externalAccessUrl: '',
    hostedContent: '# Welcome to your unlocked resource\n\nThank you for your purchase! Use the resources and links below to get started.',
    updatedAt: new Date().toISOString()
  };

  const key =
    raw.key === 'fieldguide' || raw.key === 'studio' || raw.key === 'bundle'
      ? raw.key
      : sanitizeSlug(typeof raw.key === 'string' && raw.key.trim() ? raw.key : raw.slug || raw.name || base.key) || base.key;

  const slug =
    sanitizeSlug(typeof raw.slug === 'string' && raw.slug.trim() ? raw.slug : key) || base.slug;

  const name = typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : base.name;
  const numericPrice = Number(raw.price);
  const price = Number.isFinite(numericPrice) && numericPrice >= 0 ? Math.round(numericPrice * 100) / 100 : base.price;

  const rawCompare = raw.compareAtPrice;
  const parsedCompare =
    rawCompare !== null &&
    rawCompare !== undefined &&
    Number.isFinite(Number(rawCompare)) &&
    Number(rawCompare) > price
      ? Math.round(Number(rawCompare) * 100) / 100
      : null;

  const compareAtPrice =
    key === 'fieldguide' && (parsedCompare === null || parsedCompare === 0)
      ? 9
      : key === 'studio' && (parsedCompare === null || parsedCompare === 29)
        ? 19
        : key === 'bundle' && (parsedCompare === null || parsedCompare === 14)
          ? 25
          : parsedCompare ?? base.compareAtPrice ?? null;

  const status =
    raw.status === 'active' || raw.status === 'draft' || raw.status === 'archived'
      ? raw.status
      : base.status;

  const badgeTheme =
    raw.badgeTheme === 'green' || raw.badgeTheme === 'amber' || raw.badgeTheme === 'default'
      ? raw.badgeTheme
      : base.badgeTheme;

  const coverTheme =
    raw.coverTheme === 'dark' || raw.coverTheme === 'light' ? raw.coverTheme : base.coverTheme;

  const deliveryType =
    key === 'fieldguide'
      ? 'fieldguide_reader'
      : key === 'studio'
        ? 'studio_workspace'
        : key === 'bundle'
          ? 'bundle_both'
          : raw.deliveryType === 'external_url' || raw.deliveryType === 'hosted_reader' || raw.deliveryType === 'bundle_both'
            ? raw.deliveryType
            : base.deliveryType;

  const defaultReaderHref =
    key === 'fieldguide'
      ? '/fieldguide'
      : key === 'studio' || key === 'bundle'
        ? '/studio'
        : `/products/${slug}/access`;

  const readerHref =
    typeof raw.readerHref === 'string' && raw.readerHref.trim()
      ? raw.readerHref.trim()
      : defaultReaderHref;

  const cardBullets =
    Array.isArray(raw.cardBullets) && raw.cardBullets.filter((b) => typeof b === 'string' && b.trim()).length > 0
      ? raw.cardBullets.map((b) => String(b).trim()).filter(Boolean)
      : base.cardBullets;

  const includes =
    Array.isArray(raw.includes) && raw.includes.filter((b) => typeof b === 'string' && b.trim()).length > 0
      ? raw.includes.map((b) => String(b).trim()).filter(Boolean)
      : base.includes;

  const sections =
    Array.isArray(raw.sections) && raw.sections.length > 0
      ? raw.sections
          .map((s) => ({
            title: typeof s?.title === 'string' ? s.title.trim() : '',
            body: typeof s?.body === 'string' ? s.body.trim() : ''
          }))
          .filter((s) => s.title || s.body)
      : base.sections;

  const description =
    typeof raw.description === 'string' && raw.description.trim()
      ? raw.description.trim()
      : base.description;

  const shortDescription =
    typeof raw.shortDescription === 'string' && raw.shortDescription.trim()
      ? raw.shortDescription.trim()
      : description;

  const headline =
    typeof raw.headline === 'string' && raw.headline.trim() ? raw.headline.trim() : base.headline;

  return {
    key,
    slug,
    name,
    price,
    compareAtPrice,
    currency: 'USD',
    status,
    featured: typeof raw.featured === 'boolean' ? raw.featured : base.featured,
    sortOrder: Number.isFinite(Number(raw.sortOrder)) ? Number(raw.sortOrder) : base.sortOrder,
    dodoProductId: typeof raw.dodoProductId === 'string' ? raw.dodoProductId.trim() : base.dodoProductId,
    dodoEnvVar:
      typeof raw.dodoEnvVar === 'string' && raw.dodoEnvVar.trim()
        ? raw.dodoEnvVar.trim()
        : key === 'fieldguide'
          ? 'DODO_FIELDGUIDE_PRODUCT_ID'
          : key === 'studio'
            ? 'DODO_STUDIO_PRODUCT_ID'
            : key === 'bundle'
              ? 'DODO_BUNDLE_PRODUCT_ID'
              : base.dodoEnvVar,
    eyebrow: typeof raw.eyebrow === 'string' && raw.eyebrow.trim() ? raw.eyebrow.trim() : base.eyebrow,
    headline,
    badge:
      typeof raw.badge === 'string' &&
      raw.badge.trim() &&
      raw.badge.trim() !== '$5 · START HERE' &&
      raw.badge.trim() !== '$9 · COMPLETE LAUNCH SYSTEM' &&
      raw.badge.trim() !== '$12 · FULL BUNDLE (SAVE $2)'
        ? raw.badge.trim()
        : base.badge,
    badgeTheme,
    cardTag: typeof raw.cardTag === 'string' && raw.cardTag.trim() ? raw.cardTag.trim() : base.cardTag,
    ctaLabel:
      typeof raw.ctaLabel === 'string' &&
      raw.ctaLabel.trim() &&
      raw.ctaLabel.trim() !== 'Get the Fieldguide · $5' &&
      raw.ctaLabel.trim() !== 'Get Launchpad Studio · $9' &&
      raw.ctaLabel.trim() !== 'Get Complete Bundle · $12'
        ? raw.ctaLabel.trim()
        : base.ctaLabel || `Get ${name} · $${price}`,
    formatNote:
      typeof raw.formatNote === 'string' &&
      raw.formatNote.trim() &&
      !raw.formatNote.includes('Login required') &&
      !raw.formatNote.includes('Direct checkout') &&
      !raw.formatNote.includes('Save $2') &&
      !raw.formatNote.includes('7-page fieldguide · Account access')
        ? raw.formatNote.trim()
        : base.formatNote,
    shortDescription,
    description,
    shareTitle:
      typeof raw.shareTitle === 'string' && raw.shareTitle.trim()
        ? raw.shareTitle.trim()
        : `${name} ($${price}) — ${headline}`,
    shareDescription:
      typeof raw.shareDescription === 'string' && raw.shareDescription.trim()
        ? raw.shareDescription.trim()
        : description,
    image:
      typeof raw.image === 'string' &&
      raw.image.trim() &&
      !(key === 'bundle' && raw.image.trim() === '/images/launchpad-studio-cover.svg')
        ? raw.image.trim()
        : base.image,
    ogImage:
      typeof raw.ogImage === 'string' &&
      raw.ogImage.trim() &&
      !(key === 'bundle' && raw.ogImage.trim() === '/images/launchpad-studio-og.png')
        ? raw.ogImage.trim()
        : typeof raw.image === 'string' &&
            raw.image.trim() &&
            !(key === 'bundle' && raw.image.trim() === '/images/launchpad-studio-cover.svg')
          ? raw.image.trim()
          : base.ogImage,
    imageAlt:
      typeof raw.imageAlt === 'string' && raw.imageAlt.trim() ? raw.imageAlt.trim() : `${name} cover`,
    imageLabel:
      typeof raw.imageLabel === 'string' && raw.imageLabel.trim()
        ? raw.imageLabel.trim()
        : base.imageLabel,
    coverTheme,
    galleryImages: Array.isArray(raw.galleryImages)
      ? raw.galleryImages.map((img) => String(img).trim()).filter(Boolean)
      : base.galleryImages,
    cardBullets,
    includes,
    sections: sections.length > 0 ? sections : base.sections,
    access:
      typeof raw.access === 'string' &&
      raw.access.trim() &&
      !raw.access.includes('No app ZIP or HTML download') &&
      !raw.access.includes('Private seven-page reader in your Hamza Idrishi account')
        ? raw.access.trim()
        : base.access,
    limitation:
      typeof raw.limitation === 'string' && raw.limitation.trim()
        ? raw.limitation.trim()
        : base.limitation,
    nextStep:
      typeof raw.nextStep === 'string' && raw.nextStep.trim() ? raw.nextStep.trim() : base.nextStep,
    nextHref:
      typeof raw.nextHref === 'string' && raw.nextHref.trim() ? raw.nextHref.trim() : base.nextHref,
    deliveryType,
    readerHref,
    externalAccessUrl:
      typeof raw.externalAccessUrl === 'string' ? raw.externalAccessUrl.trim() : base.externalAccessUrl || '',
    hostedContent:
      typeof raw.hostedContent === 'string' ? raw.hostedContent : base.hostedContent || '',
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : new Date().toISOString()
  };
}

function normalizeCatalogState(
  raw?: Partial<ProductCatalogPersistedState> | null
): ProductCatalogPersistedState {
  const deletedBuiltinKeys = Array.isArray(raw?.deletedBuiltinKeys)
    ? raw!.deletedBuiltinKeys.filter((k): k is string => typeof k === 'string')
    : [];

  const savedProducts = Array.isArray(raw?.products) ? raw!.products : [];
  const byKey = new Map<string, ManagedProduct>();

  for (const def of DEFAULT_MANAGED_PRODUCTS) {
    if (deletedBuiltinKeys.includes(def.key)) continue;
    const savedMatch = savedProducts.find(
      (p) => p && (p.key === def.key || p.slug === def.slug)
    );
    byKey.set(def.key, savedMatch ? normalizeManagedProduct(savedMatch, def) : def);
  }

  for (let i = 0; i < savedProducts.length; i++) {
    const item = savedProducts[i];
    if (!item || typeof item !== 'object') continue;
    const existingDefault = DEFAULT_MANAGED_PRODUCTS.find(
      (d) => d.key === item.key || d.slug === item.slug
    );
    if (existingDefault) continue;
    const normalized = normalizeManagedProduct(item, undefined, byKey.size + i);
    if (!byKey.has(normalized.key)) {
      byKey.set(normalized.key, normalized);
    }
  }

  const products = Array.from(byKey.values()).sort(
    (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)
  );

  const customAttempts = Array.isArray(raw?.customAttempts)
    ? raw!.customAttempts.filter((a) => a && typeof a.id === 'string').slice(0, 500)
    : [];

  const customPurchases = Array.isArray(raw?.customPurchases)
    ? raw!.customPurchases.filter((p) => p && typeof p.payment_id === 'string').slice(0, 500)
    : [];

  return {
    products,
    deletedBuiltinKeys,
    customAttempts,
    customPurchases,
    updatedAt: typeof raw?.updatedAt === 'string' ? raw.updatedAt : new Date().toISOString()
  };
}

async function readLocalFallback(): Promise<Partial<ProductCatalogPersistedState> | null> {
  try {
    const txt = await fs.readFile(LOCAL_FALLBACK_PATH, 'utf8');
    return JSON.parse(txt) as Partial<ProductCatalogPersistedState>;
  } catch {
    return null;
  }
}

async function writeLocalFallback(state: ProductCatalogPersistedState): Promise<void> {
  try {
    await fs.writeFile(LOCAL_FALLBACK_PATH, JSON.stringify(state, null, 2), 'utf8');
  } catch {
    // Ignore local tmp write failure in read-only runtimes
  }
}

const CATALOG_CACHE_TTL_MS = 25 * 1000;
const ADMIN_USER_CACHE_TTL_MS = 10 * 60 * 1000;

let cachedCatalogState: ProductCatalogPersistedState | null = null;
let cachedCatalogAt = 0;
let cachedAdminUserId: string | null = null;
let cachedAdminUserAt = 0;

export function invalidateProductCatalogCache(): void {
  cachedCatalogState = null;
  cachedCatalogAt = 0;
}

async function resolveAdminAnchorUserId(
  skipWorkspaceFetch = false
): Promise<{
  db: ReturnType<typeof adminClient>;
  userId: string | null;
  existingWorkspaceState: Record<string, unknown>;
}> {
  const db = adminClient();
  const now = Date.now();
  let userId = cachedAdminUserId;

  if (!userId || now - cachedAdminUserAt > ADMIN_USER_CACHE_TTL_MS) {
    const configuredAdminEmail = process.env.SALES_DASHBOARD_ADMIN_EMAIL;
    const { data: usersData } = await db.auth.admin
      .listUsers({ page: 1, perPage: 200 })
      .catch(() => ({ data: { users: [] } }));
    const users = usersData?.users || [];
    const adminUser =
      users.find((u) => u.email && isSalesAdmin(u.email, configuredAdminEmail)) || users[0] || null;
    userId = adminUser?.id || null;
    if (userId) {
      cachedAdminUserId = userId;
      cachedAdminUserAt = now;
    }
  }

  if (!userId) {
    return { db, userId: null, existingWorkspaceState: {} };
  }

  if (skipWorkspaceFetch) {
    return { db, userId, existingWorkspaceState: {} };
  }

  const { data: wsRow } = await db
    .from('platform_workspace')
    .select('state')
    .eq('user_id', userId)
    .maybeSingle();

  const existingWorkspaceState =
    wsRow?.state && typeof wsRow.state === 'object' && !Array.isArray(wsRow.state)
      ? (wsRow.state as Record<string, unknown>)
      : {};

  return {
    db,
    userId,
    existingWorkspaceState
  };
}

export async function loadProductCatalogState(options?: {
  forceRefresh?: boolean;
}): Promise<ProductCatalogPersistedState> {
  const now = Date.now();
  if (
    !options?.forceRefresh &&
    cachedCatalogState &&
    now - cachedCatalogAt < CATALOG_CACHE_TTL_MS
  ) {
    return cachedCatalogState;
  }

  try {
    const { userId, existingWorkspaceState } = await resolveAdminAnchorUserId();
    if (
      userId &&
      existingWorkspaceState[STATE_KEY] &&
      typeof existingWorkspaceState[STATE_KEY] === 'object'
    ) {
      const normalized = normalizeCatalogState(
        existingWorkspaceState[STATE_KEY] as Partial<ProductCatalogPersistedState>
      );
      cachedCatalogState = normalized;
      cachedCatalogAt = Date.now();
      return normalized;
    }
  } catch {
    // Fallback to local state if Supabase is not reachable
  }
  const local = await readLocalFallback();
  const normalized = normalizeCatalogState(local);
  cachedCatalogState = normalized;
  cachedCatalogAt = Date.now();
  return normalized;
}

export async function saveProductCatalogState(
  updater: (current: ProductCatalogPersistedState) => ProductCatalogPersistedState
): Promise<ProductCatalogPersistedState> {
  let dbInstance: ReturnType<typeof adminClient> | null = null;
  let anchorUserId: string | null = null;
  let existingWorkspaceState: Record<string, unknown> = {};
  let current: ProductCatalogPersistedState;

  try {
    const resolved = await resolveAdminAnchorUserId();
    dbInstance = resolved.db;
    anchorUserId = resolved.userId;
    existingWorkspaceState = resolved.existingWorkspaceState;
    if (
      anchorUserId &&
      existingWorkspaceState[STATE_KEY] &&
      typeof existingWorkspaceState[STATE_KEY] === 'object'
    ) {
      current = normalizeCatalogState(
        existingWorkspaceState[STATE_KEY] as Partial<ProductCatalogPersistedState>
      );
    } else {
      const local = await readLocalFallback();
      current = cachedCatalogState || normalizeCatalogState(local);
    }
  } catch {
    const local = await readLocalFallback();
    current = cachedCatalogState || normalizeCatalogState(local);
  }

  const next = normalizeCatalogState({
    ...updater(current),
    updatedAt: new Date().toISOString()
  });

  cachedCatalogState = next;
  cachedCatalogAt = Date.now();

  await writeLocalFallback(next);

  try {
    if (dbInstance && anchorUserId) {
      const mergedWorkspace = {
        ...existingWorkspaceState,
        [STATE_KEY]: next
      };
      await dbInstance.from('platform_workspace').upsert(
        {
          user_id: anchorUserId,
          state: mergedWorkspace,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'user_id' }
      );
    }
  } catch {
    // Saved in local fallback if DB write fails
  }

  return next;
}

/**
 * Resolves the active Dodo Payments Product ID (`pdt_...`) for a product.
 * Priority:
 * 1. `product.dodoProductId` configured directly in the Admin Product Manager UI
 * 2. Environment variable named in `product.dodoEnvVar` (e.g. `DODO_FIELDGUIDE_PRODUCT_ID`)
 * 3. Default built-in environment variables (`DODO_FIELDGUIDE_PRODUCT_ID` / `DODO_STUDIO_PRODUCT_ID`)
 */
export function resolveDodoProductId(
  product: Pick<ManagedProduct, 'key' | 'dodoProductId' | 'dodoEnvVar'>,
  env: NodeJS.ProcessEnv = process.env
): {
  productId: string;
  source: 'admin_ui' | 'env_var' | 'missing';
  envVarName: string;
} {
  if (product.dodoProductId && product.dodoProductId.trim()) {
    return {
      productId: product.dodoProductId.trim(),
      source: 'admin_ui',
      envVarName: product.dodoEnvVar || ''
    };
  }

  const envVarName =
    (product.dodoEnvVar && product.dodoEnvVar.trim()) ||
    (product.key === 'fieldguide'
      ? 'DODO_FIELDGUIDE_PRODUCT_ID'
      : product.key === 'studio'
        ? 'DODO_STUDIO_PRODUCT_ID'
        : product.key === 'bundle'
          ? 'DODO_BUNDLE_PRODUCT_ID'
          : '');

  if (envVarName && env[envVarName]?.trim()) {
    return {
      productId: env[envVarName]!.trim(),
      source: 'env_var',
      envVarName
    };
  }

  return {
    productId: '',
    source: 'missing',
    envVarName
  };
}

export async function getActiveCatalogProducts(): Promise<ManagedProduct[]> {
  const state = await loadProductCatalogState();
  return state.products.filter((p) => p.status === 'active');
}

export async function findProductBySlugOrKey(slugOrKey: string): Promise<ManagedProduct | null> {
  const clean = slugOrKey.trim().toLowerCase();
  const state = await loadProductCatalogState();
  return (
    state.products.find(
      (p) => p.slug.toLowerCase() === clean || p.key.toLowerCase() === clean
    ) || null
  );
}
