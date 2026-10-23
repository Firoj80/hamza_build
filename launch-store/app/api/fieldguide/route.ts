import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { currentUser } from '@/lib/supabase/server';
import { ownedProducts } from '@/lib/access';
import { hasGuestProductAccess } from '@/lib/delivery-token';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const tokenParam = request.nextUrl.searchParams.get('token');
  const [user, cookieStore] = await Promise.all([
    currentUser().catch(() => null),
    cookies()
  ]);

  const guestAccess = hasGuestProductAccess('fieldguide', {
    tokenParam,
    cookieStore
  });

  if (!guestAccess.allowed) {
    if (!user) return new NextResponse(null, { status: 401 });
    const { products } = await ownedProducts(user);
    if (!products.includes('fieldguide')) {
      return new NextResponse('Fieldguide purchase required.', { status: 403 });
    }
  }

  const bytes = await readFile(
    path.join(process.cwd(), 'private/first-product-fieldguide.pdf')
  );
  const onVercel = process.env.VERCEL === '1';
  return new NextResponse(bytes, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="Idea-to-Income-Fieldguide.pdf"',
      'Cache-Control': 'private, no-store',
      ...(onVercel ? { 'X-Frame-Options': 'SAMEORIGIN' } : {})
    }
  });
}
