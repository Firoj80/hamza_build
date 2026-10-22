import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { trustedRequestOrigin } from '@/lib/payment-policy.mjs';
import { friendlyNameFromEmail, type ProductReview } from '@/lib/email-campaigns';
import { loadEmailStudioState, saveEmailStudioState } from '@/lib/email-reviews-store';

export const runtime = 'nodejs';

export async function GET() {
  const state = await loadEmailStudioState();
  const published = state.reviews.filter((r) => r.published);
  return NextResponse.json({
    reviews: published,
    totalCount: published.length
  });
}

export async function POST(request: NextRequest) {
  if (!trustedRequestOrigin(request)) {
    return NextResponse.json({ error: 'Untrusted request origin' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const authUser = await currentUser().catch(() => null);

  const rawEmail =
    typeof body.email === 'string' && body.email.trim()
      ? body.email.trim().toLowerCase()
      : (authUser?.email || '').trim().toLowerCase();

  if (!rawEmail || !rawEmail.includes('@')) {
    return NextResponse.json({ error: 'Please enter the email address associated with your account.' }, { status: 400 });
  }

  const ratingNum = Math.round(Number(body.rating));
  if (!Number.isFinite(ratingNum) || ratingNum < 1 || ratingNum > 5) {
    return NextResponse.json({ error: 'Please select a star rating between 1 and 5.' }, { status: 400 });
  }

  const comment = typeof body.comment === 'string' ? body.comment.trim() : '';
  if (comment.length < 8) {
    return NextResponse.json({ error: 'Please write a short review (at least a few words).' }, { status: 400 });
  }

  const rawProduct = body.productKey;
  const productKey: 'fieldguide' | 'studio' | 'both' =
    rawProduct === 'studio' || rawProduct === 'both' ? rawProduct : 'fieldguide';

  const rawName = typeof body.name === 'string' ? body.name.trim() : '';
  const name = rawName || friendlyNameFromEmail(rawEmail);

  const defaultRole =
    productKey === 'both'
      ? 'Fieldguide + Studio Buyer'
      : productKey === 'studio'
        ? 'Launchpad Studio ($9)'
        : 'Idea-to-Income Fieldguide ($5)';
  const rawRole = typeof body.role === 'string' ? body.role.trim() : '';
  const role = rawRole || defaultRole;

  const rawHeadline = typeof body.headline === 'string' ? body.headline.trim() : '';
  const headline =
    rawHeadline ||
    (ratingNum >= 5
      ? 'Practical and easy to put into action.'
      : 'Helpful resource for planning my first launch.');

  // Check if this email corresponds to a verified buyer in Supabase
  let verifiedBuyer = false;
  try {
    const db = adminClient();
    const { data: usersData } = await db.auth.admin
      .listUsers({ page: 1, perPage: 1000 })
      .catch(() => ({ data: { users: [] } }));
    const matchedUser = (usersData?.users || []).find(
      (u) => (u.email || '').toLowerCase() === rawEmail
    );
    if (matchedUser?.id) {
      const { data: purchases } = await db
        .from('platform_purchases')
        .select('product_key')
        .eq('user_id', matchedUser.id)
        .eq('access_status', 'active')
        .limit(5);
      if (purchases && purchases.length > 0) {
        verifiedBuyer = true;
      }
    }
  } catch {
    // Ignore verification lookup error if offline
  }

  const newReview: ProductReview = {
    id: `rev_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    email: rawEmail,
    name: name.slice(0, 60),
    role: role.slice(0, 80),
    productKey,
    rating: ratingNum,
    headline: headline.slice(0, 120),
    comment: comment.slice(0, 1000),
    verifiedBuyer,
    published: true,
    createdAt: new Date().toISOString()
  };

  await saveEmailStudioState((curr) => ({
    ...curr,
    reviews: [newReview, ...curr.reviews].slice(0, 200)
  }));

  return NextResponse.json({
    ok: true,
    review: newReview
  });
}
