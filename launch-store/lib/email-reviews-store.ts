import 'server-only';
import fs from 'node:fs/promises';
import path from 'node:path';
import { adminClient } from './supabase/admin';
import { isSalesAdmin } from './platform-policy.mjs';
import {
  DEFAULT_AUTOMATION_CONFIGS,
  DEFAULT_EMAIL_TEMPLATES,
  INITIAL_PRODUCT_REVIEWS,
  type EmailSegmentKey,
  type EmailTemplate,
  type ProductReview,
  type SegmentAutomationConfig,
  type SentEmailLog,
  type TemplateSlot
} from './email-campaigns';

export type EmailStudioPersistedState = {
  templates: EmailTemplate[];
  automation: Record<EmailSegmentKey, SegmentAutomationConfig>;
  sentLogs: SentEmailLog[];
  reviews: ProductReview[];
  updatedAt: string;
};

const STATE_KEY = '_admin_email_studio';
const LOCAL_FALLBACK_PATH = path.join('/tmp', 'hamza-email-reviews-store.json');

function normalizeState(raw?: Partial<EmailStudioPersistedState> | null): EmailStudioPersistedState {
  const savedTemplates = Array.isArray(raw?.templates) ? raw!.templates : [];
  const mergedTemplates = DEFAULT_EMAIL_TEMPLATES.map((def) => {
    const match = savedTemplates.find(
      (t) => t && t.segment === def.segment && Number(t.slot) === def.slot
    );
    if (!match) return def;
    return {
      ...def,
      title: typeof match.title === 'string' && match.title.trim() ? match.title.trim() : def.title,
      badge: typeof match.badge === 'string' && match.badge.trim() ? match.badge.trim() : def.badge,
      subject:
        typeof match.subject === 'string' && match.subject.trim()
          ? match.subject.trim()
          : def.subject,
      body: typeof match.body === 'string' && match.body.trim() ? match.body : def.body,
      updatedAt: typeof match.updatedAt === 'string' ? match.updatedAt : def.updatedAt
    };
  });

  const savedAuto =
    raw?.automation && typeof raw.automation === 'object'
      ? (raw.automation as Partial<Record<EmailSegmentKey, SegmentAutomationConfig>>)
      : {};

  const segments: EmailSegmentKey[] = ['registered_only', 'buyer_5', 'buyer_9', 'review_request'];
  const automation = { ...DEFAULT_AUTOMATION_CONFIGS };
  for (const seg of segments) {
    const item = savedAuto[seg];
    if (item && typeof item === 'object') {
      const slotNum = Number(item.activeTemplateSlot);
      const validSlot: TemplateSlot =
        slotNum === 1 || slotNum === 2 || slotNum === 3 || slotNum === 4 || slotNum === 5
          ? slotNum
          : 1;
      automation[seg] = {
        segment: seg,
        autoSendEnabled: Boolean(item.autoSendEnabled),
        activeTemplateSlot: validSlot,
        skipAlreadyEmailed:
          typeof item.skipAlreadyEmailed === 'boolean' ? item.skipAlreadyEmailed : true,
        updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : DEFAULT_AUTOMATION_CONFIGS[seg].updatedAt
      };
    }
  }

  const sentLogs = Array.isArray(raw?.sentLogs)
    ? raw!.sentLogs.filter((l) => l && typeof l.to === 'string').slice(0, 300)
    : [];

  const seedMap = new Map(INITIAL_PRODUCT_REVIEWS.map((s) => [s.id, s]));
  let reviews: ProductReview[];
  if (Array.isArray(raw?.reviews) && raw!.reviews.length > 0) {
    const existing = raw!.reviews
      .filter((r) => r && typeof r.comment === 'string')
      .map((r) => (seedMap.has(r.id) ? { ...seedMap.get(r.id)!, published: r.published ?? true } : r));
    const existingIds = new Set(existing.map((r) => r.id));
    const missingSeeds = INITIAL_PRODUCT_REVIEWS.filter((s) => !existingIds.has(s.id));
    reviews = [...existing, ...missingSeeds].slice(0, 200);
  } else {
    reviews = INITIAL_PRODUCT_REVIEWS;
  }

  return {
    templates: mergedTemplates,
    automation,
    sentLogs,
    reviews,
    updatedAt: typeof raw?.updatedAt === 'string' ? raw.updatedAt : new Date().toISOString()
  };
}

async function readLocalFallback(): Promise<Partial<EmailStudioPersistedState> | null> {
  try {
    const txt = await fs.readFile(LOCAL_FALLBACK_PATH, 'utf8');
    return JSON.parse(txt) as Partial<EmailStudioPersistedState>;
  } catch {
    return null;
  }
}

async function writeLocalFallback(state: EmailStudioPersistedState): Promise<void> {
  try {
    await fs.writeFile(LOCAL_FALLBACK_PATH, JSON.stringify(state, null, 2), 'utf8');
  } catch {
    // Ignore local tmp write failure in read-only runtimes
  }
}

async function resolveAdminAnchorUserId(): Promise<{
  db: ReturnType<typeof adminClient>;
  userId: string | null;
  existingWorkspaceState: Record<string, unknown>;
}> {
  const db = adminClient();
  const configuredAdminEmail = process.env.SALES_DASHBOARD_ADMIN_EMAIL;
  const { data: usersData } = await db.auth.admin
    .listUsers({ page: 1, perPage: 1000 })
    .catch(() => ({ data: { users: [] } }));
  const users = usersData?.users || [];
  const adminUser =
    users.find((u) => u.email && isSalesAdmin(u.email, configuredAdminEmail)) || users[0] || null;

  if (!adminUser?.id) {
    return { db, userId: null, existingWorkspaceState: {} };
  }

  const { data: wsRow } = await db
    .from('platform_workspace')
    .select('state')
    .eq('user_id', adminUser.id)
    .maybeSingle();

  const existingWorkspaceState =
    wsRow?.state && typeof wsRow.state === 'object' && !Array.isArray(wsRow.state)
      ? (wsRow.state as Record<string, unknown>)
      : {};

  return {
    db,
    userId: adminUser.id,
    existingWorkspaceState
  };
}

export async function loadEmailStudioState(): Promise<EmailStudioPersistedState> {
  try {
    const { userId, existingWorkspaceState } = await resolveAdminAnchorUserId();
    if (userId && existingWorkspaceState[STATE_KEY] && typeof existingWorkspaceState[STATE_KEY] === 'object') {
      return normalizeState(existingWorkspaceState[STATE_KEY] as Partial<EmailStudioPersistedState>);
    }
  } catch {
    // Fallback to local state if Supabase is not reachable
  }
  const local = await readLocalFallback();
  return normalizeState(local);
}

export async function saveEmailStudioState(
  updater: (current: EmailStudioPersistedState) => EmailStudioPersistedState
): Promise<EmailStudioPersistedState> {
  const current = await loadEmailStudioState();
  const next = normalizeState({
    ...updater(current),
    updatedAt: new Date().toISOString()
  });

  await writeLocalFallback(next);

  try {
    const { db, userId, existingWorkspaceState } = await resolveAdminAnchorUserId();
    if (userId) {
      const mergedWorkspace = {
        ...existingWorkspaceState,
        [STATE_KEY]: next
      };
      await db.from('platform_workspace').upsert(
        {
          user_id: userId,
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

export function resolveGoogleClientId(): string {
  return (
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
    process.env.VITE_GOOGLE_CLIENT_ID ||
    process.env.GOOGLE_CLIENT_ID ||
    ''
  ).trim();
}
