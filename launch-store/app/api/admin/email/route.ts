import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@/lib/supabase/server';
import { isSalesAdmin } from '@/lib/platform-policy.mjs';
import { trustedRequestOrigin } from '@/lib/payment-policy.mjs';
import {
  DEFAULT_EMAIL_TEMPLATES,
  type EmailSegmentKey,
  type SentEmailLog,
  type TemplateSlot
} from '@/lib/email-campaigns';
import {
  loadEmailStudioState,
  resolveGoogleClientId,
  saveEmailStudioState
} from '@/lib/email-reviews-store';

export const runtime = 'nodejs';

function isValidSegment(seg: unknown): seg is EmailSegmentKey {
  return (
    seg === 'registered_only' ||
    seg === 'buyer_5' ||
    seg === 'buyer_9' ||
    seg === 'review_request'
  );
}

function isValidSlot(slot: unknown): slot is TemplateSlot {
  const n = Number(slot);
  return n === 1 || n === 2 || n === 3 || n === 4 || n === 5;
}

export async function GET() {
  const user = await currentUser();
  if (!user || !isSalesAdmin(user.email, process.env.SALES_DASHBOARD_ADMIN_EMAIL)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const state = await loadEmailStudioState();
  return NextResponse.json({
    ...state,
    googleClientId: resolveGoogleClientId()
  });
}

export async function POST(request: NextRequest) {
  if (!trustedRequestOrigin(request)) {
    return NextResponse.json({ error: 'Untrusted request origin' }, { status: 403 });
  }
  const user = await currentUser();
  if (!user || !isSalesAdmin(user.email, process.env.SALES_DASHBOARD_ADMIN_EMAIL)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const action = typeof body.action === 'string' ? body.action : '';

  if (action === 'save_template') {
    const segment = body.segment;
    const slot = Number(body.slot);
    if (!isValidSegment(segment) || !isValidSlot(slot)) {
      return NextResponse.json({ error: 'Invalid segment or template slot' }, { status: 400 });
    }
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const subject = typeof body.subject === 'string' ? body.subject.trim() : '';
    const templateBody = typeof body.body === 'string' ? body.body : '';
    if (!subject || !templateBody.trim()) {
      return NextResponse.json({ error: 'Subject and email body are required' }, { status: 400 });
    }

    const updated = await saveEmailStudioState((curr) => ({
      ...curr,
      templates: curr.templates.map((t) =>
        t.segment === segment && t.slot === slot
          ? {
              ...t,
              title: title || t.title,
              subject,
              body: templateBody,
              updatedAt: new Date().toISOString()
            }
          : t
      )
    }));

    return NextResponse.json({ ok: true, state: updated });
  }

  if (action === 'reset_template') {
    const segment = body.segment;
    const slot = Number(body.slot);
    if (!isValidSegment(segment) || !isValidSlot(slot)) {
      return NextResponse.json({ error: 'Invalid segment or template slot' }, { status: 400 });
    }
    const def = DEFAULT_EMAIL_TEMPLATES.find((t) => t.segment === segment && t.slot === slot);
    if (!def) {
      return NextResponse.json({ error: 'Default template not found' }, { status: 404 });
    }

    const updated = await saveEmailStudioState((curr) => ({
      ...curr,
      templates: curr.templates.map((t) =>
        t.segment === segment && t.slot === slot ? { ...def, updatedAt: new Date().toISOString() } : t
      )
    }));

    return NextResponse.json({ ok: true, state: updated });
  }

  if (action === 'save_automation') {
    const segment = body.segment;
    const slot = Number(body.activeTemplateSlot);
    if (!isValidSegment(segment) || !isValidSlot(slot)) {
      return NextResponse.json({ error: 'Invalid segment or active template slot' }, { status: 400 });
    }
    const autoSendEnabled = Boolean(body.autoSendEnabled);
    const skipAlreadyEmailed =
      typeof body.skipAlreadyEmailed === 'boolean' ? body.skipAlreadyEmailed : true;

    const updated = await saveEmailStudioState((curr) => ({
      ...curr,
      automation: {
        ...curr.automation,
        [segment]: {
          segment,
          autoSendEnabled,
          activeTemplateSlot: slot,
          skipAlreadyEmailed,
          updatedAt: new Date().toISOString()
        }
      }
    }));

    return NextResponse.json({ ok: true, state: updated });
  }

  if (action === 'log_sent') {
    const entries = Array.isArray(body.entries) ? body.entries : [];
    const validEntries: SentEmailLog[] = entries
      .filter((e: Record<string, unknown>) => e && typeof e.to === 'string' && isValidSegment(e.segment))
      .map((e: Record<string, unknown>, idx: number) => ({
        id:
          typeof e.id === 'string' && e.id
            ? e.id
            : `log_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 7)}`,
        to: String(e.to).trim().toLowerCase(),
        userId: typeof e.userId === 'string' ? e.userId : undefined,
        segment: e.segment as EmailSegmentKey,
        templateSlot: isValidSlot(e.templateSlot) ? (Number(e.templateSlot) as TemplateSlot) : 1,
        subject: typeof e.subject === 'string' ? e.subject : '',
        mode: e.mode === 'auto' ? 'auto' : 'manual',
        status: e.status === 'failed' ? 'failed' : 'sent',
        gmailMessageId: typeof e.gmailMessageId === 'string' ? e.gmailMessageId : undefined,
        error: typeof e.error === 'string' ? e.error : undefined,
        sentAt: typeof e.sentAt === 'string' ? e.sentAt : new Date().toISOString()
      }));

    const updated = await saveEmailStudioState((curr) => ({
      ...curr,
      sentLogs: [...validEntries, ...curr.sentLogs].slice(0, 300)
    }));

    return NextResponse.json({ ok: true, state: updated });
  }

  if (action === 'moderate_review') {
    const reviewId = typeof body.reviewId === 'string' ? body.reviewId : '';
    const subAction = typeof body.subAction === 'string' ? body.subAction : '';
    if (!reviewId) {
      return NextResponse.json({ error: 'Review ID required' }, { status: 400 });
    }

    const updated = await saveEmailStudioState((curr) => {
      if (subAction === 'delete') {
        return {
          ...curr,
          reviews: curr.reviews.filter((r) => r.id !== reviewId)
        };
      }
      return {
        ...curr,
        reviews: curr.reviews.map((r) =>
          r.id === reviewId ? { ...r, published: !r.published } : r
        )
      };
    });

    return NextResponse.json({ ok: true, state: updated });
  }

  return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
}
