import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { currentUser, authClient } from '@/lib/supabase/server';
import { ownedProducts } from '@/lib/access';
import { hasGuestProductAccess } from '@/lib/delivery-token';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { cleanWorkspace } from '@/lib/platform-policy.mjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const tokenParam = request.nextUrl.searchParams.get('token');
  const [user, cookieStore] = await Promise.all([
    currentUser().catch(() => null),
    cookies()
  ]);

  const guestAccess = hasGuestProductAccess('studio', {
    tokenParam,
    cookieStore
  });

  let state = cleanWorkspace({});

  if (!guestAccess.allowed) {
    if (!user) return new NextResponse('Sign in to use your workspace.', { status: 401 });
    const { products } = await ownedProducts(user);
    if (!products.includes('studio')) {
      return new NextResponse('Studio purchase required.', { status: 403 });
    }
    const db = await authClient();
    const { data: workspace, error: loadError } = await db
      .from('platform_workspace')
      .select('state')
      .eq('user_id', user.id)
      .maybeSingle();
    if (loadError) {
      return new NextResponse('Could not load your saved workspace. Please retry.', {
        status: 503
      });
    }
    state = cleanWorkspace(workspace?.state || {});
  } else if (user) {
    const db = await authClient();
    const { data: workspace } = await db
      .from('platform_workspace')
      .select('state')
      .eq('user_id', user.id)
      .maybeSingle();
    state = cleanWorkspace(workspace?.state || {});
  }

  let html = await readFile(
    path.join(process.cwd(), 'private/Launchpad_Platform.html'),
    'utf8'
  );
  html = html.replace(
    '<script>',
    '<script>const PLATFORM_INITIAL_STATE=' +
      JSON.stringify(state).replace(/</g, '\\u003c') +
      ';'
  );
  const onVercel = process.env.VERCEL === '1';
  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'private, no-store, max-age=0',
      ...(onVercel ? { 'X-Frame-Options': 'SAMEORIGIN' } : {}),
      'Content-Security-Policy': `default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; font-src data:; connect-src 'self'; ${onVercel ? "frame-ancestors 'self'; " : ''}base-uri 'none'; form-action 'none'`
    }
  });
}
