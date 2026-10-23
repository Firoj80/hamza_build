import { notFound, redirect } from 'next/navigation';
import { TrendingUp, ShoppingBag, Clock3, Filter, Users } from 'lucide-react';
import { currentUser } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { bundle, guide, studio } from '@/lib/catalog';
import ShareSnapshot from './share-snapshot';
import CustomerAdmin, { type CustomerRecord, type PaymentExportRow } from './customer-admin';
import EmailCampaignAdmin from './email-campaign-admin';
import ProductManagerAdmin, { type EnrichedManagedProduct } from './product-manager-admin';
import DashboardShell from './dashboard-shell';
import { isSalesAdmin } from '@/lib/platform-policy.mjs';
import { configuredSiteOrigin } from '@/lib/payment-policy.mjs';
import { TRAFFIC_SOURCES, resolvePageviewTrafficSource } from '@/lib/traffic-source.mjs';
import { loadEmailStudioState, resolveGoogleClientId } from '@/lib/email-reviews-store';
import { loadProductCatalogState, resolveDodoProductId } from '@/lib/product-store';
import { buildUnifiedDashboardPurchases } from '@/lib/dodo-dashboard-sync';
import styles from './sales.module.css';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Sales dashboard — Hamza Idrishi',
  robots: { index: false, follow: false }
};

type Purchase = {
  payment_id: string;
  attempt_id: string;
  user_id: string;
  product_key: string;
  access_status: 'active' | 'pending' | 'revoked';
  provider_status: string;
  amount_cents: number;
  currency: string;
  updated_at: string;
};
type CheckoutAttempt = {
  id: string;
  user_id: string;
  customer_email?: string;
  product_key: string;
  provider_product_id: string;
  expected_cents: number;
  created_at: string;
};
type PageviewRow = {
  viewed_on: string;
  path: string;
  visitor_hash: string;
};
type WorkspaceRow = { user_id: string; state: Record<string, unknown>; updated_at: string };
type Analytics = {
  total_visitors: number;
  today_visitors: number;
  by_product: { fieldguide: number; studio: number };
};

const defaultProductNames: Record<string, string> = {
  studio: studio.name,
  fieldguide: guide.name,
  bundle: bundle.name
};

function money(cents: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`;
  }
}

function formatAmounts(amounts: Record<string, number>) {
  return (
    Object.entries(amounts)
      .map(([currency, cents]) => money(cents, currency))
      .join(' · ') || money(0, 'USD')
  );
}

function date(value: string) {
  try {
    return new Intl.DateTimeFormat('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Kolkata'
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function shortDay(isoDate: string) {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC'
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

function pct(numerator: number, denominator: number) {
  if (denominator <= 0) return '0.0%';
  const val = (numerator / denominator) * 100;
  return `${val >= 10 ? val.toFixed(1) : val.toFixed(1)}%`;
}

function deltaLabel(curr: number, prev: number, unit: string) {
  if (prev === 0) return curr > 0 ? `+${curr} vs prior 7d` : `0 ${unit} prior 7d`;
  const diff = curr - prev;
  const sign = diff > 0 ? '+' : '';
  return `${sign}${diff} vs prior 7d (${prev})`;
}

function displayCustomerIdentity(
  userId: string,
  emailMap: Map<string, string>,
  fallbackEmail?: string
) {
  if (fallbackEmail && fallbackEmail.trim()) return fallbackEmail.trim();
  const mapped = emailMap.get(userId);
  if (mapped) return mapped;
  if (userId.startsWith('dodo:')) {
    const rest = userId.slice(5);
    if (rest.includes('@')) return rest;
    return `dodo_${rest.slice(0, 10)}`;
  }
  if (userId === 'guest') return 'Guest checkout (Dodo)';
  return `user_${userId.slice(0, 8)}`;
}

export default async function Sales() {
  const user = await currentUser();
  if (!user) redirect('/login?next=%2Fsales');
  if (!isSalesAdmin(user.email, process.env.SALES_DASHBOARD_ADMIN_EMAIL)) notFound();
  const db = adminClient();

  const now = new Date();
  const days14: string[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i));
    days14.push(d.toISOString().slice(0, 10));
  }
  const start14Date = days14[0];
  const todayUtc = days14[days14.length - 1];

  const [
    { data, error },
    { data: attemptsData, error: attemptsError },
    { data: pageviewsData, error: pageviewsError },
    { data: workspaceData, error: workspaceError },
    { data: analyticsData, error: analyticsError },
    { error: salesError },
    usersResult,
    productCatalogState
  ] = await Promise.all([
    db
      .from('platform_purchases')
      .select(
        'payment_id,attempt_id,user_id,product_key,access_status,provider_status,amount_cents,currency,updated_at'
      )
      .order('updated_at', { ascending: false })
      .limit(500),
    db
      .from('platform_checkout_attempts')
      .select('id,user_id,product_key,provider_product_id,expected_cents,created_at')
      .order('created_at', { ascending: false })
      .limit(500),
    db
      .from('site_pageviews')
      .select('viewed_on,path,visitor_hash')
      .order('viewed_on', { ascending: false })
      .limit(10000),
    db
      .from('platform_workspace')
      .select('user_id,state,updated_at')
      .order('updated_at', { ascending: false })
      .limit(500),
    db.rpc('get_site_analytics'),
    db.rpc('get_product_sales_summary'),
    db.auth.admin.listUsers({ page: 1, perPage: 1000 }).catch(() => ({
      data: { users: [] },
      error: null
    })),
    loadProductCatalogState()
  ]);
  if (error || salesError) throw new Error('Could not load sales dashboard');

  const analytics = (
    analyticsError
      ? { total_visitors: 0, today_visitors: 0, by_product: { fieldguide: 0, studio: 0 } }
      : analyticsData
  ) as Analytics;

  const supabaseRows = (data || []) as Purchase[];
  const supabaseAttempts = (attemptsError ? [] : attemptsData || []) as CheckoutAttempt[];
  const allPageviews = (pageviewsError ? [] : pageviewsData || []) as PageviewRow[];
  const pageviews = allPageviews.filter((p) => p.viewed_on >= start14Date);
  const workspaces = (workspaceError ? [] : workspaceData || []) as WorkspaceRow[];
  const authUsers = usersResult?.data?.users || [];

  const emailMap = new Map<string, string>();
  const userIdByEmail = new Map<string, string>();
  for (const u of authUsers) {
    if (u.id && u.email) {
      const clean = u.email.trim().toLowerCase();
      emailMap.set(u.id, clean);
      userIdByEmail.set(clean, u.id);
    }
  }

  // Merge Supabase checkout attempts + custom/guest checkout attempts
  const attemptById = new Map<string, CheckoutAttempt>();
  for (const a of supabaseAttempts) {
    attemptById.set(a.id, a);
  }
  for (const ca of productCatalogState.customAttempts) {
    if (!attemptById.has(ca.id)) {
      attemptById.set(ca.id, {
        id: ca.id,
        user_id:
          ca.user_id && ca.user_id !== 'guest'
            ? ca.user_id
            : ca.customer_email
              ? `dodo:${ca.customer_email.toLowerCase()}`
              : 'guest',
        customer_email: ca.customer_email,
        product_key: ca.product_key,
        provider_product_id: ca.provider_product_id,
        expected_cents: ca.expected_cents,
        created_at: ca.created_at
      });
    }
  }
  const attempts = Array.from(attemptById.values()).sort((a, b) =>
    b.created_at.localeCompare(a.created_at)
  );

  // Sync buyers & payments directly from Dodo Payments API + customPurchases + Supabase
  const { purchases: rows, dodoSyncedFromApi, dodoPaymentCount } =
    await buildUnifiedDashboardPurchases({
      supabasePurchases: supabaseRows,
      customPurchases: productCatalogState.customPurchases,
      supabaseAttempts,
      customAttempts: productCatalogState.customAttempts,
      catalogProducts: productCatalogState.products,
      emailByUserId: emailMap,
      userIdByEmail
    });

  for (const r of rows) {
    if (r.user_id && r.customer_email) {
      emailMap.set(r.user_id, r.customer_email);
    }
  }

  const productNames: Record<string, string> = { ...defaultProductNames };
  for (const p of productCatalogState.products) {
    productNames[p.key] = p.name;
  }

  // Calculate per-product and total sales from unified rows (including live Dodo API payments)
  const calcProductMetrics = (key: string) => {
    const pRows = rows.filter((r) => r.product_key === key);
    const active = pRows.filter((r) => r.access_status === 'active');
    const pending = pRows.filter((r) => r.access_status === 'pending').length;
    const revoked = pRows.filter((r) => r.access_status === 'revoked').length;
    const unknown = active.filter((r) => r.amount_cents === 0).length;
    const amounts = active
      .filter((r) => r.amount_cents > 0)
      .reduce<Record<string, number>>((acc, r) => {
        acc[r.currency] = (acc[r.currency] || 0) + r.amount_cents;
        return acc;
      }, {});
    return {
      rows: pRows,
      paid: active.length,
      pending,
      revoked,
      unknown,
      amounts,
      revenue: formatAmounts(amounts)
    };
  };

  const fgStats = calcProductMetrics('fieldguide');
  const studioStats = calcProductMetrics('studio');
  const bundleStats = calcProductMetrics('bundle');

  const fgPaid = fgStats.paid;
  const studioPaid = studioStats.paid;
  const bundlePaid = bundleStats.paid;

  const activeAll = rows.filter((r) => r.access_status === 'active');
  const totalPaid = activeAll.length;
  const totalPending = rows.filter((r) => r.access_status === 'pending').length;
  const amountUnknown = activeAll.filter((r) => r.amount_cents === 0).length;
  const totalAmounts = activeAll
    .filter((r) => r.amount_cents > 0)
    .reduce<Record<string, number>>((acc, r) => {
      acc[r.currency] = (acc[r.currency] || 0) + r.amount_cents;
      return acc;
    }, {});

  const studioRevenue = studioStats.revenue;
  const fgRevenue = fgStats.revenue;
  const bundleRevenue = bundleStats.revenue;
  const revenue = formatAmounts(totalAmounts);
  const todaySales = activeAll.filter((r) => r.updated_at?.slice(0, 10) === todayUtc).length;

  // Total Views, Views Today & Traffic Sources Attribution
  const totalViews = Math.max(allPageviews.length, analytics.total_visitors);
  const todayViews = Math.max(
    allPageviews.filter((p) => p.viewed_on === todayUtc).length,
    analytics.today_visitors
  );
  const trafficStatsAll = TRAFFIC_SOURCES.map((src) => {
    const matching = allPageviews.filter(
      (pv) => resolvePageviewTrafficSource(pv.visitor_hash) === src.key
    );
    const matchingToday = matching.filter((pv) => pv.viewed_on === todayUtc);
    const visitors = new Set(matching.map((pv) => pv.visitor_hash)).size;
    const todayVisitors = new Set(matchingToday.map((pv) => pv.visitor_hash)).size;
    return {
      ...src,
      shortLabel: (src as { shortLabel?: string }).shortLabel || src.label,
      views: matching.length,
      todayViews: matchingToday.length,
      visitors,
      todayVisitors
    };
  });
  const trafficSourcesToShow = trafficStatsAll.filter((s) => s.key !== 'other' || s.views > 0);

  // Conversion Funnel & Checkout Drop-off calculations
  const purchaseByAttempt = new Map<string, (typeof rows)[number]>();
  const activeUserProducts = new Set<string>();
  for (const r of rows) {
    if (r.attempt_id) purchaseByAttempt.set(r.attempt_id, r);
    if (r.access_status === 'active' && r.user_id) {
      activeUserProducts.add(`${r.user_id}:${r.product_key}`);
    }
  }
  const classifiedAttempts = attempts.map((attempt) => {
    const p = purchaseByAttempt.get(attempt.id);
    const hasActiveForProduct = activeUserProducts.has(
      `${attempt.user_id}:${attempt.product_key}`
    );
    const outcome: 'active' | 'pending' | 'revoked' | 'recovered' | 'abandoned' = p
      ? p.access_status
      : hasActiveForProduct
        ? 'recovered'
        : 'abandoned';
    return { ...attempt, outcome, purchase: p };
  });

  const totalAttempts = Math.max(classifiedAttempts.length, totalPaid);
  const studioAttempts = classifiedAttempts.filter((a) => a.product_key === 'studio');
  const fgAttempts = classifiedAttempts.filter((a) => a.product_key === 'fieldguide');
  const bundleAttempts = classifiedAttempts.filter((a) => a.product_key === 'bundle');
  const abandonedAttempts = classifiedAttempts.filter((a) => a.outcome === 'abandoned');
  const recoveredAttempts = classifiedAttempts.filter((a) => a.outcome === 'recovered');
  const studioAbandonedUsers = new Set(
    studioAttempts.filter((a) => a.outcome === 'abandoned').map((a) => a.user_id)
  ).size;
  const fgAbandonedUsers = new Set(
    fgAttempts.filter((a) => a.outcome === 'abandoned').map((a) => a.user_id)
  ).size;
  const bundleAbandonedUsers = new Set(
    bundleAttempts.filter((a) => a.outcome === 'abandoned').map((a) => a.user_id)
  ).size;
  const uniqueAttemptUsers = new Set(classifiedAttempts.map((a) => a.user_id)).size;
  const uniquePaidUsers = new Set(
    activeAll.map((r) => r.customer_email || r.user_id).filter(Boolean)
  ).size;
  const uniqueAbandonedUsers = new Set(abandonedAttempts.map((a) => a.user_id)).size;

  const bundlePageviewsCount = new Set(
    allPageviews
      .filter((p) => p.path === '/products/complete-creator-bundle')
      .map((p) => p.visitor_hash)
  ).size;
  const productVisitors =
    analytics.by_product.studio + analytics.by_product.fieldguide + bundlePageviewsCount;
  const topBase = Math.max(analytics.total_visitors, productVisitors, totalAttempts, totalPaid, 1);
  const studioCompletionRate = pct(studioPaid, Math.max(studioAttempts.length, studioPaid));
  const fgCompletionRate = pct(fgPaid, Math.max(fgAttempts.length, fgPaid));
  const bundleCompletionRate = pct(bundlePaid, Math.max(bundleAttempts.length, bundlePaid));
  const overallCheckoutCompletion = pct(totalPaid, totalAttempts);
  const overallDropoffRate =
    totalAttempts > 0 ? pct(abandonedAttempts.length, totalAttempts) : '0.0%';

  // 14-Day Daily Traffic & Revenue Time-Series calculations
  const dailyVisitorsMap = new Map<string, Set<string>>();
  const dailyAttemptsMap = new Map<string, number>();
  const dailySalesMap = new Map<string, number>();
  const dailyAmountsMap = new Map<string, Record<string, number>>();
  for (const d of days14) {
    dailyVisitorsMap.set(d, new Set());
    dailyAttemptsMap.set(d, 0);
    dailySalesMap.set(d, 0);
    dailyAmountsMap.set(d, {});
  }
  for (const pv of pageviews) {
    const bucket = dailyVisitorsMap.get(pv.viewed_on);
    if (bucket) bucket.add(pv.visitor_hash);
  }
  for (const a of attempts) {
    const d = a.created_at?.slice(0, 10);
    if (d && dailyAttemptsMap.has(d)) dailyAttemptsMap.set(d, (dailyAttemptsMap.get(d) || 0) + 1);
  }
  for (const r of rows) {
    if (r.access_status !== 'active') continue;
    const d = r.updated_at?.slice(0, 10);
    if (d && dailySalesMap.has(d)) {
      dailySalesMap.set(d, (dailySalesMap.get(d) || 0) + 1);
      if (r.amount_cents > 0) {
        const amt = dailyAmountsMap.get(d)!;
        amt[r.currency] = (amt[r.currency] || 0) + r.amount_cents;
      }
    }
  }
  const dailySeries = days14.map((d) => ({
    date: d,
    label: shortDay(d),
    visitors: dailyVisitorsMap.get(d)?.size || 0,
    attempts: dailyAttemptsMap.get(d) || 0,
    sales: dailySalesMap.get(d) || 0,
    amounts: dailyAmountsMap.get(d) || {}
  }));
  const maxDailyVisitors = Math.max(...dailySeries.map((d) => d.visitors), 1);
  const prev7 = dailySeries.slice(0, 7);
  const last7 = dailySeries.slice(7, 14);
  const visitorsLast7 = new Set(
    pageviews.filter((p) => p.viewed_on >= days14[7]).map((p) => p.visitor_hash)
  ).size;
  const visitorsPrev7 = new Set(
    pageviews.filter((p) => p.viewed_on < days14[7]).map((p) => p.visitor_hash)
  ).size;
  const attemptsLast7 = last7.reduce((s, d) => s + d.attempts, 0);
  const attemptsPrev7 = prev7.reduce((s, d) => s + d.attempts, 0);
  const salesLast7 = last7.reduce((s, d) => s + d.sales, 0);
  const salesPrev7 = prev7.reduce((s, d) => s + d.sales, 0);
  const amountsLast7: Record<string, number> = {};
  for (const d of last7) {
    for (const [c, v] of Object.entries(d.amounts)) amountsLast7[c] = (amountsLast7[c] || 0) + v;
  }

  const routeDefs: { path: string; title: string; kind: string }[] = [
    { path: '/', title: 'Storefront /', kind: 'Landing page' },
    { path: '/products/launchpad-studio', title: 'Studio detail ($9)', kind: 'Product page' },
    {
      path: '/products/first-product-fieldguide',
      title: 'Fieldguide detail ($5)',
      kind: 'Product page'
    },
    {
      path: '/products/complete-creator-bundle',
      title: 'Bundle detail ($12)',
      kind: 'Product page'
    },
    { path: '/studio', title: 'Studio workspace', kind: 'Buyer usage' },
    { path: '/fieldguide', title: 'Fieldguide reader', kind: 'Buyer usage' }
  ];
  const routeStats = routeDefs.map((def) => {
    const matching = pageviews.filter((p) => p.path === def.path);
    const visitors14d = new Set(matching.map((p) => p.visitor_hash)).size;
    const visitorsToday = new Set(
      matching.filter((p) => p.viewed_on === todayUtc).map((p) => p.visitor_hash)
    ).size;
    return { ...def, visitors14d, visitorsToday };
  });

  // Workspace usage parsing
  const nicheNames: Record<string, string> = {
    ai_hustle: 'AI Side-Hustle',
    focus_habits: 'Focus & Habits',
    prompt_mastery: 'Prompt Mastery',
    threads_growth: 'Threads Growth',
    job_resume: 'Job & Resume',
    simple_budget: 'Simple Budget',
    meal_prep: 'Meal Prep',
    budget_travel: 'Budget Travel'
  };
  type ParsedWorkspace = {
    keys: number;
    updatedAt: string;
    nicheLabel: string | null;
    ideaFields: number;
    hasEvidence: boolean;
    customPostsCount: number;
    hasStoreScope: boolean;
    checksCompleted: number;
    summary: string;
  };
  const workspaceByUser = new Map<string, ParsedWorkspace>();
  const nicheCounts = new Map<string, number>();
  let stage1Count = 0;
  let stage2Count = 0;
  let stage3Count = 0;
  let stage4Count = 0;
  let stage5Count = 0;
  let totalChecksAcrossUsers = 0;
  let totalCustomPosts = 0;

  for (const w of workspaces) {
    const st = (w.state && typeof w.state === 'object' ? w.state : {}) as Record<string, unknown>;
    const keys = Object.keys(st).filter((k) => !k.startsWith('_')).length;
    const nicheKey = typeof st.niche === 'string' ? st.niche : '';
    const nicheLabel = nicheKey ? nicheNames[nicheKey] || nicheKey : null;
    if (keys > 0 && nicheLabel) nicheCounts.set(nicheLabel, (nicheCounts.get(nicheLabel) || 0) + 1);
    const ideaFields = ['audience', 'problem', 'freeTitle', 'paidTitle'].filter(
      (k) => typeof st[k] === 'string' && (st[k] as string).trim().length > 0
    ).length;
    const hasEvidence = typeof st.evidence === 'string' && st.evidence.trim().length > 0;
    const postsObj =
      st.posts && typeof st.posts === 'object' && !Array.isArray(st.posts)
        ? (st.posts as Record<string, unknown>)
        : {};
    const customPostsCount = Object.values(postsObj).filter(
      (v) => typeof v === 'string' && v.trim().length > 0
    ).length;
    const hasStoreScope = Boolean(
      (typeof st.deliverables === 'string' && st.deliverables.trim().length > 0) ||
        (typeof st.freeUrl === 'string' && st.freeUrl.trim().length > 0) ||
        (typeof st.paidUrl === 'string' && st.paidUrl.trim().length > 0)
    );
    const checksObj =
      st.checks && typeof st.checks === 'object' && !Array.isArray(st.checks)
        ? (st.checks as Record<string, unknown>)
        : {};
    const checksCompleted = [0, 1, 2, 3, 4, 5, 6].filter((i) => Boolean(checksObj[String(i)]))
      .length;

    if (ideaFields >= 4) stage1Count++;
    if (hasEvidence) stage2Count++;
    if (customPostsCount > 0) stage3Count++;
    if (hasStoreScope) stage4Count++;
    if (checksCompleted > 0) stage5Count++;
    totalChecksAcrossUsers += checksCompleted;
    totalCustomPosts += customPostsCount;

    const parts: string[] = [`${ideaFields}/4 idea`, `${checksCompleted}/7 checklist`];
    if (customPostsCount > 0)
      parts.push(`${customPostsCount} post${customPostsCount === 1 ? '' : 's'}`);
    if (hasEvidence) parts.push('evidence logged');
    workspaceByUser.set(w.user_id, {
      keys,
      updatedAt: w.updated_at,
      nicheLabel,
      ideaFields,
      hasEvidence,
      customPostsCount,
      hasStoreScope,
      checksCompleted,
      summary: keys > 0 ? parts.join(' · ') : 'Unlocked · not saved yet'
    });
  }

  // Build unified Customer & Dodo Buyer Directory (including guest Dodo buyers!)
  const allUserIds = new Set<string>();
  for (const u of authUsers) {
    if (u.id && !isSalesAdmin(u.email, process.env.SALES_DASHBOARD_ADMIN_EMAIL)) {
      allUserIds.add(u.id);
    }
  }
  for (const r of rows) {
    if (r.user_id && r.user_id !== 'guest') allUserIds.add(r.user_id);
  }
  for (const a of attempts) {
    if (a.user_id && a.user_id !== 'guest') allUserIds.add(a.user_id);
  }
  for (const w of workspaces) {
    if (w.user_id) allUserIds.add(w.user_id);
  }

  const authUserMap = new Map<string, { created_at?: string; last_sign_in_at?: string }>();
  for (const u of authUsers) {
    if (u.id) authUserMap.set(u.id, u);
  }

  const customerProfiles = Array.from(allUserIds)
    .map((uid) => {
      const au = authUserMap.get(uid);
      const email = displayCustomerIdentity(uid, emailMap);
      const userPurchases = rows.filter(
        (r) =>
          r.access_status === 'active' &&
          (r.user_id === uid ||
            (email.includes('@') && r.customer_email?.toLowerCase() === email.toLowerCase()))
      );
      const userAttempts = attempts.filter(
        (a) =>
          a.user_id === uid ||
          (email.includes('@') && a.customer_email?.toLowerCase() === email.toLowerCase())
      );
      const ownsBundle = userPurchases.some((p) => p.product_key === 'bundle');
      const ownsStudio = ownsBundle || userPurchases.some((p) => p.product_key === 'studio');
      const ownsFieldguide =
        ownsBundle || userPurchases.some((p) => p.product_key === 'fieldguide');
      const triedStudio = userAttempts.filter((a) => a.product_key === 'studio').length;
      const triedFieldguide = userAttempts.filter((a) => a.product_key === 'fieldguide').length;
      const triedBundle = userAttempts.filter((a) => a.product_key === 'bundle').length;
      const ws = workspaceByUser.get(uid);
      const spent: Record<string, number> = {};
      for (const p of userPurchases) {
        if (p.amount_cents > 0) spent[p.currency] = (spent[p.currency] || 0) + p.amount_cents;
      }
      const customerName =
        userPurchases.find((p) => p.customer_name && p.customer_name.trim())?.customer_name || null;
      const hasDodoSource = userPurchases.some((p) => p.source === 'dodo_api');
      const dates = [
        au?.last_sign_in_at,
        au?.created_at,
        ws?.updatedAt,
        ...userPurchases.map((p) => p.updated_at),
        ...userAttempts.map((a) => a.created_at)
      ]
        .filter((x): x is string => Boolean(x))
        .sort();
      const lastActivity = dates[dates.length - 1] || new Date(0).toISOString();
      return {
        userId: uid,
        email,
        customerName,
        ownsStudio,
        ownsFieldguide,
        ownsBundle,
        triedStudio,
        triedFieldguide,
        triedBundle,
        workspaceKeys: ws?.keys || 0,
        workspaceSummary: ws?.summary || null,
        nicheLabel: ws?.nicheLabel || null,
        checksCompleted: ws?.checksCompleted || 0,
        workspaceUpdatedAt: ws?.updatedAt || null,
        spent,
        hasPaid: ownsStudio || ownsFieldguide || ownsBundle || userPurchases.length > 0,
        lastActivity,
        sourceLabel: hasDodoSource ? 'Dodo Payments API' : uid.startsWith('dodo:') ? 'Dodo Checkout' : 'Store'
      };
    })
    .filter((c) => !isSalesAdmin(c.email, process.env.SALES_DASHBOARD_ADMIN_EMAIL))
    .sort(
      (a, b) => Number(b.hasPaid) - Number(a.hasPaid) || b.lastActivity.localeCompare(a.lastActivity)
    );

  const totalBuyersAndCustomers = customerProfiles.length;
  const bothOwners = customerProfiles.filter((c) => c.ownsStudio && c.ownsFieldguide).length;
  const fgOnlyOwners = customerProfiles.filter((c) => c.ownsFieldguide && !c.ownsStudio).length;
  const studioOnlyOwners = customerProfiles.filter((c) => c.ownsStudio && !c.ownsFieldguide).length;
  const totalFgOwners = bothOwners + fgOnlyOwners;
  const totalStudioOwners = bothOwners + studioOnlyOwners;
  const activeStudioWorkspaces = customerProfiles.filter(
    (c) => c.ownsStudio && c.workspaceKeys > 0
  ).length;
  const fgOwnersTriedStudio = customerProfiles.filter(
    (c) => c.ownsFieldguide && !c.ownsStudio && c.triedStudio > 0
  ).length;
  const unconvertedAccounts = customerProfiles.filter((c) => !c.hasPaid).length;
  const avgChecklist =
    workspaces.length > 0 ? (totalChecksAcrossUsers / workspaces.length).toFixed(1) : '0.0';
  const sortedNiches = Array.from(nicheCounts.entries()).sort((a, b) => b[1] - a[1]);

  // Pricing Tier Cohorts & Unit Economics calculations
  const studio9Attempts = studioAttempts.filter((a) => a.expected_cents === 900);
  const bundle12Attempts = bundleAttempts.filter((a) => a.expected_cents === 1200);
  const fg5Attempts = fgAttempts.filter((a) => a.expected_cents === 500);
  const fgPaidRows = fgStats.rows.filter(
    (r) => r.access_status === 'active' && r.amount_cents > 0
  ).length;
  const fgCompRows = fgStats.rows.filter(
    (r) => r.access_status === 'active' && r.amount_cents === 0
  ).length;
  const paidRowsWithAmount = activeAll.filter((r) => r.amount_cents > 0);
  const usdTotalCents = totalAmounts['USD'] || 0;
  const usdPaidCount = paidRowsWithAmount.filter((r) => r.currency === 'USD').length;
  const avgOrderUsd =
    usdPaidCount > 0 ? money(Math.round(usdTotalCents / usdPaidCount), 'USD') : revenue;

  const trafficSummaryLine = trafficSourcesToShow
    .map((s) => `${s.shortLabel}: ${s.views}${s.todayViews > 0 ? ` (+${s.todayViews} today)` : ''}`)
    .join(' · ');

  const shareText = [
    `Building in public update:`,
    `• Total views: ${totalViews.toLocaleString()} (${analytics.total_visitors.toLocaleString()} unique visitors)`,
    `• Views today: ${todayViews.toLocaleString()} (${analytics.today_visitors.toLocaleString()} unique today)`,
    `• Traffic sources: ${trafficSummaryLine}`,
    `• Sales: ${totalPaid} paid (${revenue} collected${todaySales > 0 ? ` · +${todaySales} today` : ''}) — ${studio.name}: ${studioPaid} (${studioRevenue}), ${guide.name}: ${fgPaid} (${fgRevenue}), ${bundle.name}: ${bundlePaid} (${bundleRevenue})`,
    `• Total Dodo buyers: ${uniquePaidUsers.toLocaleString()}`,
    `Building in public, one useful step at a time.`
  ].join('\n');

  const shareTemplates = {
    milestone: shareText,
    funnel: [
      `Store funnel & traffic snapshot:`,
      `• Total views: ${totalViews.toLocaleString()} (${todayViews.toLocaleString()} views today)`,
      `• Traffic sources: ${trafficSummaryLine}`,
      `• Product page views: ${productVisitors.toLocaleString()} (${totalAttempts} checkouts started)`,
      `• Sales: ${totalPaid} paid (${overallCheckoutCompletion} checkout conv. · ${revenue} collected)`,
      `• Verified Dodo buyers: ${uniquePaidUsers}`
    ].join('\n'),
    weekly: [
      `Last 7 days building in public:`,
      `• Total views: ${totalViews.toLocaleString()} (${todayViews.toLocaleString()} today · ${visitorsLast7.toLocaleString()} unique in 7d)`,
      `• Traffic sources: ${trafficSummaryLine}`,
      `• Sales: ${totalPaid} total paid (${salesLast7} in last 7d · ${revenue} total collected)`,
      `• Verified Dodo buyers: ${uniquePaidUsers}`
    ].join('\n')
  };

  // Enrich Catalog Products with Dodo Product ID status
  const enrichedCatalogProducts: EnrichedManagedProduct[] = productCatalogState.products.map(
    (p) => {
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
    }
  );
  const activeCatalogProducts = enrichedCatalogProducts.filter((p) => p.status === 'active');
  const dodoEnv = process.env.DODO_PAYMENTS_ENVIRONMENT || 'test_mode';
  const hasDodoKey = Boolean(process.env.DODO_PAYMENTS_API_KEY);
  const hasStudioProduct =
    Boolean(process.env.DODO_STUDIO_PRODUCT_ID) ||
    Boolean(enrichedCatalogProducts.find((p) => p.key === 'studio')?.resolvedDodo.configured);
  const hasFgProduct =
    Boolean(process.env.DODO_FIELDGUIDE_PRODUCT_ID) ||
    Boolean(enrichedCatalogProducts.find((p) => p.key === 'fieldguide')?.resolvedDodo.configured);
  const hasBundleProduct =
    Boolean(process.env.DODO_BUNDLE_PRODUCT_ID) ||
    Boolean(enrichedCatalogProducts.find((p) => p.key === 'bundle')?.resolvedDodo.configured);
  const allActiveProductsHaveDodo =
    activeCatalogProducts.length > 0 &&
    activeCatalogProducts.every((p) => p.resolvedDodo.configured);
  const dodoReady = hasDodoKey && (allActiveProductsHaveDodo || (hasStudioProduct && hasFgProduct));
  const isTestMode = dodoEnv !== 'live_mode';

  let primaryBottleneckTitle = 'Direct Dodo Checkout & Instant File Delivery Active';
  let primaryBottleneckDetail =
    'Public login/signup friction is completely removed. Visitors go straight to Dodo checkout and receive instant PDF & HTML downloads.';
  if (isTestMode || !dodoReady) {
    primaryBottleneckTitle = isTestMode
      ? 'Dodo Payments is currently in TEST MODE'
      : 'Dodo product IDs or API key missing';
    primaryBottleneckDetail = isTestMode
      ? 'Real customer cards will be declined while DODO_PAYMENTS_ENVIRONMENT is set to test_mode. Switch to live_mode with live product IDs (including your $12 Bundle pdt_... ID in the Products tab) to accept real sales.'
      : 'Ensure DODO_PAYMENTS_API_KEY is set and each active product ($5 Fieldguide, $9 Studio, $12 Bundle) has a Dodo Product ID (pdt_...) configured in the Products tab or in Vercel environment variables.';
  } else if (!hasBundleProduct) {
    primaryBottleneckTitle = 'Add your $12 Bundle Dodo Product ID (pdt_...) in the Products tab';
    primaryBottleneckDetail =
      'Your $12 Complete Creator Launch Bundle is live on the storefront! Open the Products tab and paste your Dodo $12 one-time product ID (pdt_...) or set DODO_BUNDLE_PRODUCT_ID in your environment variables.';
  } else if (totalPaid > 0) {
    primaryBottleneckTitle = `Funnel active: ${totalPaid} paid sale(s) synced (${overallCheckoutCompletion} checkout conversion)`;
    primaryBottleneckDetail = dodoSyncedFromApi
      ? `Live Dodo Payments API sync active (${dodoPaymentCount} Dodo payment record(s) checked). All buyers appear automatically below.`
      : 'Direct guest checkout and instant PDF/HTML file delivery are operating normally.';
  }

  const overviewView = (
    <>
      {analyticsError && (
        <p className={styles.note}>
          Visitor analytics could not be loaded right now. Refresh to try again.
        </p>
      )}
      <div className={styles.stats}>
        <article className={styles.stat}>
          <span>
            <ShoppingBag size={17} /> Collected revenue
          </span>
          <strong>
            {revenue}
            {amountUnknown > 0 && <span className={styles.unknown}>*</span>}
          </strong>
          <small>
            {amountUnknown > 0
              ? `Excludes ${amountUnknown} $0 grant row${amountUnknown === 1 ? '' : 's'}`
              : `Avg order ${avgOrderUsd} · Synced with Dodo`}
          </small>
        </article>
        <article className={styles.stat}>
          <span>
            <Clock3 size={17} /> Paid sales (Dodo + Store)
          </span>
          <strong>{totalPaid}</strong>
          <small>
            {todaySales} today · {uniquePaidUsers} unique buyer{uniquePaidUsers === 1 ? '' : 's'} (
            {totalPending} pending)
          </small>
        </article>
        <article className={styles.stat}>
          <span>
            <TrendingUp size={17} /> Total views
          </span>
          <strong>{totalViews.toLocaleString()}</strong>
          <small>
            {todayViews.toLocaleString()} views today ·{' '}
            {analytics.total_visitors.toLocaleString()} unique visitors
          </small>
        </article>
        <article className={styles.stat}>
          <span>
            <Users size={17} /> Dodo buyers &amp; leads
          </span>
          <strong>{totalBuyersAndCustomers.toLocaleString()}</strong>
          <small>
            {uniquePaidUsers} verified buyer{uniquePaidUsers === 1 ? '' : 's'} ·{' '}
            {dodoSyncedFromApi ? 'Live Dodo API synced' : 'Local + DB synced'}
          </small>
        </article>
        <article className={styles.stat}>
          <span>
            <Filter size={17} /> Checkout conversion
          </span>
          <strong>{overallCheckoutCompletion}</strong>
          <small>
            {totalPaid}/{totalAttempts} checkouts paid · Direct guest checkout
          </small>
        </article>
      </div>

      <section className={styles.cohortSection}>
        <div className={styles.sectionTitle}>
          <div>
            <div className={styles.eyebrow}>
              STORE &amp; DODO PAYMENTS DIAGNOSTIC · DIRECT CHECKOUT MODE
            </div>
            <h2>{primaryBottleneckTitle}</h2>
          </div>
          <span
            className={`${styles.badge} ${
              isTestMode || !dodoReady
                ? styles.revoked
                : totalPaid > 0
                  ? styles.active
                  : styles.pending
            }`}
          >
            {isTestMode
              ? 'Dodo: TEST MODE'
              : !dodoReady
                ? 'Config incomplete'
                : 'Dodo: LIVE MODE'}
          </span>
        </div>
        <p
          className={styles.note}
          style={{
            marginTop: 0,
            marginBottom: '12px',
            color: '#1d2925',
            background: '#f8faf6',
            borderColor: '#cfe0c7'
          }}
        >
          <strong>Status:</strong> {primaryBottleneckDetail}
        </p>
        <div className={styles.cohortGrid}>
          <article className={styles.cohortCard}>
            <span>1. Storefront → Product views</span>
            <strong>
              {productVisitors} / {analytics.total_visitors}
            </strong>
            <small>
              {pct(productVisitors, analytics.total_visitors)} opened a product page (
              {analytics.by_product.fieldguide} Guide · {analytics.by_product.studio} Studio ·{' '}
              {bundlePageviewsCount} Bundle)
            </small>
          </article>
          <article className={styles.cohortCard}>
            <span>2. Direct Dodo Checkout</span>
            <strong>100% Frictionless</strong>
            <small>
              Public login removed · Buyers go straight to Dodo and get instant PDF/HTML downloads
            </small>
          </article>
          <article className={styles.cohortCard}>
            <span>3. Dodo API Buyer Sync</span>
            <strong>{dodoSyncedFromApi ? 'Connected' : 'Standby'}</strong>
            <small>
              {dodoSyncedFromApi
                ? `Fetched ${dodoPaymentCount} payment record(s) directly from Dodo API`
                : 'Set DODO_PAYMENTS_API_KEY to fetch live Dodo buyers'}
            </small>
          </article>
          <article className={styles.cohortCard}>
            <span>4. $12 Bundle Product Status</span>
            <strong>{hasBundleProduct ? 'Configured' : 'Needs pdt_... ID'}</strong>
            <small>
              {hasBundleProduct
                ? 'Dodo Product ID set · Delivers both PDF + HTML'
                : 'Paste $12 Bundle pdt_... ID in the Products tab'}
            </small>
          </article>
        </div>
      </section>

      <section className={styles.trafficSection}>
        <div className={styles.sectionTitle}>
          <div>
            <div className={styles.eyebrow}>TRAFFIC ATTRIBUTION · CHANNELS</div>
            <h2>
              Traffic sources (Threads, X, Facebook, Pinterest, Medium, Google &amp; Direct)
            </h2>
          </div>
          <span>
            {totalViews.toLocaleString()} total views · {todayViews.toLocaleString()} today
          </span>
        </div>
        <div className={styles.trafficGrid}>
          {trafficSourcesToShow.map((src) => {
            const share = pct(src.views, Math.max(totalViews, 1));
            const barWidth =
              totalViews > 0
                ? Math.min(
                    100,
                    Math.max(src.views > 0 ? 6 : 0, Math.round((src.views / totalViews) * 100))
                  )
                : 0;
            return (
              <article key={src.key} className={styles.trafficCard}>
                <div className={styles.trafficTop}>
                  <span>{src.label}</span>
                  <span className={styles.funnelRate}>{share}</span>
                </div>
                <strong>
                  {src.views.toLocaleString()}{' '}
                  <span style={{ fontSize: '13px', fontWeight: 500, color: '#68736d' }}>views</span>
                </strong>
                <small>
                  {src.todayViews.toLocaleString()} today · {src.visitors.toLocaleString()} unique
                  visitor{src.visitors === 1 ? '' : 's'}
                </small>
                <div className={styles.funnelBar}>
                  <div className={styles.funnelFill} style={{ width: `${barWidth}%` }} />
                </div>
                <span className={styles.trafficHint} title={src.hint}>
                  {src.hint}
                </span>
              </article>
            );
          })}
        </div>
      </section>

      <section className={styles.products}>
        <div className={styles.sectionTitle}>
          <div>
            <div className={styles.eyebrow}>SHAREABLE SNAPSHOT · SOCIAL READY</div>
            <h2>Copy Threads summary &amp; product performance</h2>
          </div>
        </div>
        <ShareSnapshot
          text={shareText}
          templates={shareTemplates}
          siteOrigin={configuredSiteOrigin()}
        />
        <div className={styles.tableWrap}>
          <table className={`${styles.table} ${styles.shareTable}`}>
            <thead>
              <tr>
                <th>Product</th>
                <th>Visitors</th>
                <th>Checkouts</th>
                <th>Paid sales</th>
                <th>Checkout conv.</th>
                <th>Unrecovered</th>
                <th>Collected</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>{guide.name}</strong>
                  <small>$5 · PDF + Reader</small>
                </td>
                <td>
                  {analytics.by_product.fieldguide.toLocaleString()}
                  <small>{pct(fgPaid, analytics.by_product.fieldguide)} visitor conv.</small>
                </td>
                <td>
                  {fgAttempts.length}
                  <small>
                    {new Set(fgAttempts.map((a) => a.user_id)).size} unique buyer
                    {new Set(fgAttempts.map((a) => a.user_id)).size === 1 ? '' : 's'}
                  </small>
                </td>
                <td>{fgPaid} sales</td>
                <td>{fgCompletionRate}</td>
                <td>
                  {fgAbandonedUsers} user{fgAbandonedUsers === 1 ? '' : 's'}
                  <small>
                    {fgAttempts.filter((a) => a.outcome === 'abandoned').length} attempt
                    {fgAttempts.filter((a) => a.outcome === 'abandoned').length === 1 ? '' : 's'}
                  </small>
                </td>
                <td>
                  {fgRevenue}
                  {fgStats.unknown > 0 && <span className={styles.unknown}>*</span>}
                </td>
              </tr>
              <tr>
                <td>
                  <strong>{studio.name}</strong>
                  <small>$9 · HTML App + Workspace</small>
                </td>
                <td>
                  {analytics.by_product.studio.toLocaleString()}
                  <small>{pct(studioPaid, analytics.by_product.studio)} visitor conv.</small>
                </td>
                <td>
                  {studioAttempts.length}
                  <small>
                    {new Set(studioAttempts.map((a) => a.user_id)).size} unique buyer
                    {new Set(studioAttempts.map((a) => a.user_id)).size === 1 ? '' : 's'}
                  </small>
                </td>
                <td>{studioPaid} sales</td>
                <td>{studioCompletionRate}</td>
                <td>
                  {studioAbandonedUsers} user{studioAbandonedUsers === 1 ? '' : 's'}
                  <small>
                    {studioAttempts.filter((a) => a.outcome === 'abandoned').length} attempt
                    {studioAttempts.filter((a) => a.outcome === 'abandoned').length === 1
                      ? ''
                      : 's'}
                  </small>
                </td>
                <td>
                  {studioRevenue}
                  {studioStats.unknown > 0 && <span className={styles.unknown}>*</span>}
                </td>
              </tr>
              <tr>
                <td>
                  <strong>{bundle.name}</strong>
                  <small>$12 · Complete Bundle (PDF + HTML)</small>
                </td>
                <td>
                  {bundlePageviewsCount.toLocaleString()}
                  <small>{pct(bundlePaid, bundlePageviewsCount)} visitor conv.</small>
                </td>
                <td>
                  {bundleAttempts.length}
                  <small>
                    {new Set(bundleAttempts.map((a) => a.user_id)).size} unique buyer
                    {new Set(bundleAttempts.map((a) => a.user_id)).size === 1 ? '' : 's'}
                  </small>
                </td>
                <td>{bundlePaid} sales</td>
                <td>{bundleCompletionRate}</td>
                <td>
                  {bundleAbandonedUsers} user{bundleAbandonedUsers === 1 ? '' : 's'}
                  <small>
                    {bundleAttempts.filter((a) => a.outcome === 'abandoned').length} attempt
                    {bundleAttempts.filter((a) => a.outcome === 'abandoned').length === 1
                      ? ''
                      : 's'}
                  </small>
                </td>
                <td>
                  {bundleRevenue}
                  {bundleStats.unknown > 0 && <span className={styles.unknown}>*</span>}
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td>
                  <strong>Total</strong>
                </td>
                <td>{analytics.total_visitors.toLocaleString()}</td>
                <td>{totalAttempts} attempts</td>
                <td>{totalPaid} paid sales</td>
                <td>{overallCheckoutCompletion}</td>
                <td>
                  {uniqueAbandonedUsers} user{uniqueAbandonedUsers === 1 ? '' : 's'}
                </td>
                <td>
                  {revenue}
                  {amountUnknown > 0 && <span className={styles.unknown}>*</span>}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <section className={styles.recent}>
        <div className={styles.sectionTitle}>
          <h2>Recent verified payments (Synced from Dodo Payments &amp; Store)</h2>
          <span>Latest {Math.min(rows.length, 25)}</span>
        </div>
        {rows.length === 0 ? (
          <p className={styles.empty}>
            No payments recorded yet. Completed Dodo checkouts appear here automatically.
          </p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Buyer (Dodo Email &amp; Name)</th>
                  <th>Product</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Amount charged</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 25).map((row) => (
                  <tr key={row.payment_id}>
                    <td>
                      <strong>
                        {displayCustomerIdentity(row.user_id, emailMap, row.customer_email)}
                      </strong>
                      {row.customer_name && (
                        <span className={styles.cellSub}>{row.customer_name}</span>
                      )}
                    </td>
                    <td>{productNames[row.product_key] || row.product_key}</td>
                    <td>{date(row.updated_at)}</td>
                    <td>
                      <span className={`${styles.badge} ${styles[row.access_status]}`}>
                        {row.access_status === 'active'
                          ? 'Paid'
                          : row.access_status === 'pending'
                            ? 'Pending'
                            : 'Revoked'}
                      </span>
                    </td>
                    <td>{money(row.amount_cents, row.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className={styles.note}>
        Payments and buyer emails are automatically fetched from the Dodo Payments API and merged
        with store checkout records.
        {amountUnknown > 0
          ? ' * ' +
            amountUnknown +
            ' complimentary/manual grant row(s) with $0 amount are excluded from collected revenue totals.'
          : ''}
      </p>
    </>
  );

  const funnelView = (
    <>
      <section className={styles.funnelSection}>
        <div className={styles.sectionTitle}>
          <div>
            <div className={styles.eyebrow}>CONVERSION FUNNEL &amp; DROP-OFF</div>
            <h2>Visitor to paid Dodo checkout flow</h2>
          </div>
          <span>
            {overallCheckoutCompletion} checkout completion · {overallDropoffRate} unrecovered
            drop-off
          </span>
        </div>
        <div className={styles.funnelGrid}>
          <article className={styles.funnelStep}>
            <div className={styles.funnelStepTop}>
              <span>1. Store visitors</span>
              <span className={styles.funnelRate}>100%</span>
            </div>
            <strong>{analytics.total_visitors.toLocaleString()}</strong>
            <small>{analytics.today_visitors.toLocaleString()} active today across all pages</small>
            <div className={styles.funnelBar}>
              <div className={styles.funnelFill} style={{ width: '100%' }} />
            </div>
          </article>
          <article className={styles.funnelStep}>
            <div className={styles.funnelStepTop}>
              <span>2. Product views</span>
              <span className={styles.funnelRate}>
                {pct(productVisitors, analytics.total_visitors)}
              </span>
            </div>
            <strong>{productVisitors.toLocaleString()}</strong>
            <small>
              {analytics.by_product.fieldguide.toLocaleString()} Guide ·{' '}
              {analytics.by_product.studio.toLocaleString()} Studio · {bundlePageviewsCount} Bundle
            </small>
            <div className={styles.funnelBar}>
              <div
                className={styles.funnelFill}
                style={{
                  width: `${Math.min(100, Math.max(4, Math.round((productVisitors / topBase) * 100)))}%`
                }}
              />
            </div>
          </article>
          <article className={styles.funnelStep}>
            <div className={styles.funnelStepTop}>
              <span>3. Checkout started</span>
              <span className={styles.funnelRate}>
                {pct(totalAttempts, Math.max(productVisitors, analytics.total_visitors))}
              </span>
            </div>
            <strong>{totalAttempts.toLocaleString()}</strong>
            <small>
              {fgAttempts.length} Guide · {studioAttempts.length} Studio · {bundleAttempts.length}{' '}
              Bundle
            </small>
            <div className={styles.funnelBar}>
              <div
                className={styles.funnelFill}
                style={{
                  width: `${Math.min(100, Math.max(4, Math.round((totalAttempts / topBase) * 100)))}%`
                }}
              />
            </div>
          </article>
          <article className={styles.funnelStep}>
            <div className={styles.funnelStepTop}>
              <span>4. Paid &amp; delivered</span>
              <span className={styles.funnelRate}>{overallCheckoutCompletion} of checkouts</span>
            </div>
            <strong>{totalPaid.toLocaleString()}</strong>
            <small>
              {abandonedAttempts.length} abandoned ({uniqueAbandonedUsers} unrecovered)
              {recoveredAttempts.length > 0 ? ` · ${recoveredAttempts.length} retry recovered` : ''}
            </small>
            <div className={styles.funnelBar}>
              <div
                className={styles.funnelFill}
                style={{
                  width: `${Math.min(100, Math.max(4, Math.round((totalPaid / topBase) * 100)))}%`
                }}
              />
            </div>
          </article>
        </div>
      </section>

      <section className={styles.cohortSection}>
        <div className={styles.sectionTitle}>
          <div>
            <div className={styles.eyebrow}>PRICING COHORTS &amp; UNIT ECONOMICS</div>
            <h2>Price tier performance ($5 Fieldguide · $9 Studio · $12 Bundle)</h2>
          </div>
          <span>Synced with Dodo Payments</span>
        </div>
        <div className={styles.cohortGrid}>
          <article className={styles.cohortCard}>
            <span>Fieldguide $5 cohort</span>
            <strong>
              {fgPaidRows} paid · {fgCompRows} $0
            </strong>
            <small>{fg5Attempts.length} $5 checkout attempt(s)</small>
          </article>
          <article className={styles.cohortCard}>
            <span>Studio $9 cohort</span>
            <strong>{studioPaid} paid</strong>
            <small>{studio9Attempts.length} $9 checkout attempt(s)</small>
          </article>
          <article className={styles.cohortCard}>
            <span>Complete Bundle $12 cohort</span>
            <strong>{bundlePaid} paid</strong>
            <small>{bundle12Attempts.length} $12 bundle checkout attempt(s)</small>
          </article>
          <article className={styles.cohortCard}>
            <span>Average order &amp; RPV</span>
            <strong>{avgOrderUsd}</strong>
            <small>
              {paidRowsWithAmount.length} charged order
              {paidRowsWithAmount.length === 1 ? '' : 's'} ·{' '}
              {pct(totalPaid, analytics.total_visitors)} overall visitor conv.
            </small>
          </article>
        </div>
      </section>

      <section className={styles.recent}>
        <div className={styles.sectionTitle}>
          <div>
            <div className={styles.eyebrow}>CHECKOUT INTENT &amp; DROP-OFF LOG</div>
            <h2>Recent checkout attempts</h2>
          </div>
          <span>
            <Filter size={13} style={{ verticalAlign: '-2px', marginRight: 4 }} />
            Latest {Math.min(classifiedAttempts.length, 20)} of {classifiedAttempts.length} attempts
          </span>
        </div>
        {classifiedAttempts.length === 0 ? (
          <p className={styles.empty}>
            No checkout attempts recorded yet. When visitors click a Buy button, their checkout
            attempt and Dodo payment status will appear here.
          </p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Buyer / Visitor</th>
                  <th>Product</th>
                  <th>Started at</th>
                  <th>Funnel status</th>
                  <th>Expected / Charged</th>
                </tr>
              </thead>
              <tbody>
                {classifiedAttempts.slice(0, 20).map((attempt) => {
                  const label =
                    attempt.outcome === 'active'
                      ? 'Paid'
                      : attempt.outcome === 'pending'
                        ? 'Pending webhook'
                        : attempt.outcome === 'recovered'
                          ? 'Recovered on retry'
                          : attempt.outcome === 'revoked'
                            ? 'Revoked'
                            : 'Abandoned checkout';
                  const amountText =
                    attempt.purchase && attempt.purchase.amount_cents > 0
                      ? money(attempt.purchase.amount_cents, attempt.purchase.currency)
                      : money(attempt.expected_cents, 'USD');
                  return (
                    <tr key={attempt.id}>
                      <td>
                        <strong>
                          {displayCustomerIdentity(
                            attempt.user_id,
                            emailMap,
                            attempt.customer_email || attempt.purchase?.customer_email
                          )}
                        </strong>
                      </td>
                      <td>{productNames[attempt.product_key] || attempt.product_key}</td>
                      <td>{date(attempt.created_at)}</td>
                      <td>
                        <span className={`${styles.badge} ${styles[attempt.outcome]}`}>
                          {label}
                        </span>
                      </td>
                      <td>{amountText}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );

  const trendsView = (
    <>
      <section className={styles.trendSection}>
        <div className={styles.sectionTitle}>
          <div>
            <div className={styles.eyebrow}>DAILY TRAFFIC &amp; REVENUE TRENDS</div>
            <h2>Last 14 days activity</h2>
          </div>
          <span>
            {shortDay(days14[0])} – {shortDay(todayUtc)} (UTC)
          </span>
        </div>
        <div className={styles.trendCard}>
          <div className={styles.trendKpis}>
            <div className={styles.trendKpi}>
              <span>7-day visitors</span>
              <strong>{visitorsLast7.toLocaleString()}</strong>
              <small>{deltaLabel(visitorsLast7, visitorsPrev7, 'visitors')}</small>
            </div>
            <div className={styles.trendKpi}>
              <span>7-day checkouts</span>
              <strong>{attemptsLast7.toLocaleString()}</strong>
              <small>{deltaLabel(attemptsLast7, attemptsPrev7, 'attempts')}</small>
            </div>
            <div className={styles.trendKpi}>
              <span>7-day paid sales</span>
              <strong>{salesLast7.toLocaleString()}</strong>
              <small>{deltaLabel(salesLast7, salesPrev7, 'sales')}</small>
            </div>
            <div className={styles.trendKpi}>
              <span>7-day collected</span>
              <strong>{formatAmounts(amountsLast7)}</strong>
              <small>{pct(salesLast7, attemptsLast7)} 7d checkout completion</small>
            </div>
          </div>
          <div
            className={styles.chartGrid}
            role="img"
            aria-label="14-day daily visitors and sales bar chart"
          >
            {dailySeries.map((day) => {
              const heightPct =
                day.visitors > 0 ? Math.max(10, Math.round((day.visitors / maxDailyVisitors) * 100)) : 4;
              const dayRev = formatAmounts(day.amounts);
              return (
                <div
                  key={day.date}
                  className={styles.barCol}
                  title={`${day.label}: ${day.visitors} unique visitors, ${day.attempts} checkout attempts, ${day.sales} paid sales (${dayRev})`}
                >
                  {day.sales > 0 ? (
                    <span className={styles.barSaleTag}>+{day.sales}</span>
                  ) : (
                    <span className={styles.barValue}>{day.visitors}</span>
                  )}
                  <div className={styles.barTrack}>
                    <div
                      className={`${styles.barFill} ${day.sales > 0 ? styles.barFillSale : ''}`}
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                  <span className={styles.barLabel}>{day.label.replace(' ', '\u00A0')}</span>
                </div>
              );
            })}
          </div>
          <div className={styles.routeGrid}>
            {routeStats.map((r) => (
              <div key={r.path} className={styles.routeCard}>
                <span>{r.title}</span>
                <strong>{r.visitors14d.toLocaleString()}</strong>
                <small>
                  {r.visitorsToday} today · {r.kind}
                </small>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );

  const customerRecordsForAdmin = customerProfiles.map<CustomerRecord>((c) => ({
    userId: c.userId,
    email: c.email,
    customerName: c.customerName,
    ownsStudio: c.ownsStudio,
    ownsFieldguide: c.ownsFieldguide,
    ownsBundle: c.ownsBundle,
    triedStudio: c.triedStudio,
    triedFieldguide: c.triedFieldguide,
    triedBundle: c.triedBundle,
    workspaceKeys: c.workspaceKeys,
    workspaceSummary: c.workspaceSummary,
    nicheLabel: c.nicheLabel,
    checksCompleted: c.checksCompleted,
    workspaceUpdatedAtFormatted: c.workspaceUpdatedAt ? date(c.workspaceUpdatedAt) : null,
    spentFormatted: formatAmounts(c.spent),
    hasPaid: c.hasPaid,
    lastActivityFormatted: date(c.lastActivity),
    lastActivityIso: c.lastActivity,
    sourceLabel: c.sourceLabel
  }));

  const customersView = (
    <>
      <section className={styles.customerSection}>
        <div className={styles.sectionTitle}>
          <div>
            <div className={styles.eyebrow}>DODO PAYMENTS BUYERS &amp; CUSTOMER DIRECTORY</div>
            <h2>Verified Dodo buyers, bundle owners &amp; manual access grants</h2>
          </div>
          <span>
            {customerProfiles.length} total record{customerProfiles.length === 1 ? '' : 's'}
          </span>
        </div>
        <div className={styles.customerGrid}>
          <article className={styles.customerCard}>
            <span>Verified Dodo buyers</span>
            <strong>{uniquePaidUsers.toLocaleString()}</strong>
            <small>
              {customerProfiles.length} total records · {unconvertedAccounts} unpaid
            </small>
          </article>
          <article className={styles.customerCard}>
            <span>Bundle / Both products owned</span>
            <strong>{bothOwners.toLocaleString()}</strong>
            <small>
              {bundlePaid} bought $12 Bundle · {fgOnlyOwners} Guide-only · {studioOnlyOwners}{' '}
              Studio-only
            </small>
          </article>
          <article className={styles.customerCard}>
            <span>Fieldguide → Studio / Bundle</span>
            <strong>{pct(bothOwners, totalFgOwners)}</strong>
            <small>
              {fgOnlyOwners} upgrade candidate{fgOnlyOwners === 1 ? '' : 's'}
              {fgOwnersTriedStudio > 0 ? ` (${fgOwnersTriedStudio} tried checkout)` : ''}
            </small>
          </article>
          <article className={styles.customerCard}>
            <span>Studio owners</span>
            <strong>{totalStudioOwners}</strong>
            <small>{activeStudioWorkspaces} saved cloud state · HTML app delivered</small>
          </article>
        </div>
        <CustomerAdmin
          customers={customerRecordsForAdmin}
          paymentExportRows={[
            ...rows.map<PaymentExportRow>((r) => ({
              type: 'payment',
              id: r.payment_id,
              customer: displayCustomerIdentity(r.user_id, emailMap, r.customer_email),
              product: productNames[r.product_key] || r.product_key,
              status: r.access_status,
              amount: money(r.amount_cents, r.currency),
              dateIso: r.updated_at
            })),
            ...classifiedAttempts.map<PaymentExportRow>((a) => ({
              type: 'checkout_attempt',
              id: a.id,
              customer: displayCustomerIdentity(
                a.user_id,
                emailMap,
                a.customer_email || a.purchase?.customer_email
              ),
              product: productNames[a.product_key] || a.product_key,
              status: a.outcome,
              amount: money(a.expected_cents, 'USD'),
              dateIso: a.created_at
            }))
          ]}
        />
      </section>
    </>
  );

  const workspaceView = (
    <>
      <section className={styles.stageSection}>
        <div className={styles.sectionTitle}>
          <div>
            <div className={styles.eyebrow}>LAUNCHPAD STUDIO 5-STAGE PROGRESS</div>
            <h2>Inside-workspace buyer completion</h2>
          </div>
          <span>
            Avg {avgChecklist}/7 launch actions · {totalCustomPosts} custom posts drafted
          </span>
        </div>
        <div className={styles.stageGrid}>
          <article className={styles.stageCard}>
            <span>Step 1 · Validate idea</span>
            <strong>
              {stage1Count}/{workspaces.length}
            </strong>
            <small>Filled all 4 audience, problem &amp; offer fields</small>
          </article>
          <article className={styles.stageCard}>
            <span>Step 2 · AI &amp; evidence</span>
            <strong>
              {stage2Count}/{workspaces.length}
            </strong>
            <small>Recorded real customer research &amp; evidence notes</small>
          </article>
          <article className={styles.stageCard}>
            <span>Step 3 · Content plan</span>
            <strong>
              {stage3Count}/{workspaces.length}
            </strong>
            <small>Customized 30-day Threads post drafts ({totalCustomPosts} total)</small>
          </article>
          <article className={styles.stageCard}>
            <span>Step 4 · Store &amp; links</span>
            <strong>
              {stage4Count}/{workspaces.length}
            </strong>
            <small>Added concrete deliverables or live product URLs</small>
          </article>
          <article className={styles.stageCard}>
            <span>Step 5 · Launch checklist</span>
            <strong>
              {stage5Count}/{workspaces.length}
            </strong>
            <small>Checked off launch tasks (avg {avgChecklist} of 7)</small>
          </article>
        </div>
        <div className={styles.nicheStrip}>
          <strong>Active workspace niches:</strong>
          {sortedNiches.length === 0 ? (
            <span>No workspace niches saved yet.</span>
          ) : (
            sortedNiches.map(([niche, cnt]) => (
              <span key={niche} className={styles.nichePill}>
                {niche}: {cnt}
              </span>
            ))
          )}
        </div>
      </section>
    </>
  );

  const emailStudioState = await loadEmailStudioState();
  const googleClientId = resolveGoogleClientId();

  const emailView = (
    <EmailCampaignAdmin
      customers={customerRecordsForAdmin}
      initialTemplates={emailStudioState.templates}
      initialAutomation={emailStudioState.automation}
      initialSentLogs={emailStudioState.sentLogs}
      initialReviews={emailStudioState.reviews}
      googleClientId={googleClientId}
      siteOrigin={configuredSiteOrigin()}
      adminEmail={user.email || ''}
    />
  );

  const productsView = (
    <ProductManagerAdmin
      initialProducts={enrichedCatalogProducts}
      dodoEnvironment={dodoEnv}
      hasDodoApiKey={hasDodoKey}
    />
  );

  return (
    <DashboardShell
      counts={{
        paidSales: totalPaid,
        productsCount: enrichedCatalogProducts.length,
        abandonedCount: abandonedAttempts.length,
        visitors7d: visitorsLast7,
        customersCount: customerProfiles.length,
        emailBadge: `20 tpl · ★${emailStudioState.reviews.length}`,
        activeWorkspaces: activeStudioWorkspaces
      }}
      overview={overviewView}
      products={productsView}
      email={emailView}
      funnel={funnelView}
      trends={trendsView}
      customers={customersView}
      workspace={workspaceView}
    />
  );
}
