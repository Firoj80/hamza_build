import { NextRequest, NextResponse } from 'next/server';
import { authClient } from '@/lib/supabase/server';
import { trustedRequestOrigin } from '@/lib/payment-policy.mjs';
import { isSalesAdmin } from '@/lib/platform-policy.mjs';

export async function POST(req: NextRequest) {
  try {
    const origin = trustedRequestOrigin(req);
    if (!origin) return NextResponse.json({ error: 'Invalid request' }, { status: 403 });
    const input = await req.json();
    if (
      typeof input.email !== 'string' ||
      input.email.length > 254 ||
      !/^\S+@\S+\.\S+$/.test(input.email.trim())
    ) {
      return NextResponse.json({ error: 'Enter a valid admin email address.' }, { status: 400 });
    }
    const email = input.email.trim().toLowerCase();
    const headers = { 'Cache-Control': 'no-store' };

    // Restrict sign-in and password reset exclusively to the store admin
    if (!isSalesAdmin(email, process.env.SALES_DASHBOARD_ADMIN_EMAIL)) {
      return NextResponse.json(
        {
          error:
            'Admin access only. Customers do not need an account—all products download immediately after checkout.'
        },
        { status: 403, headers }
      );
    }

    const db = await authClient();
    if (input.mode === 'recover') {
      const { error } = await db.auth.resetPasswordForEmail(email, {
        redirectTo: origin + '/auth/callback?next=' + encodeURIComponent('/account/password')
      });
      if (error) {
        return NextResponse.json(
          { error: 'Could not send a reset link. Please wait and try again.' },
          { status: 429, headers }
        );
      }
      return NextResponse.json(
        {
          message:
            'If this admin account exists, a password reset link is on its way. Open the newest link in this browser.'
        },
        { headers }
      );
    }

    if (input.mode !== 'login') {
      return NextResponse.json(
        { error: 'Public account registration is disabled. Admin sign-in only.' },
        { status: 400, headers }
      );
    }

    if (
      typeof input.password !== 'string' ||
      input.password.length > 128 ||
      input.password.length < 1
    ) {
      return NextResponse.json({ error: 'Enter your admin password.' }, { status: 400, headers });
    }

    const { data, error } = await db.auth.signInWithPassword({
      email,
      password: input.password
    });

    if (error) {
      const limited = error.status === 429;
      return NextResponse.json(
        {
          error: limited
            ? 'Too many attempts. Please wait before trying again.'
            : 'Admin email or password is incorrect.'
        },
        { status: limited ? 429 : 400, headers }
      );
    }

    if (!data.session) {
      return NextResponse.json(
        { error: 'Sign-in is unavailable right now.' },
        { status: 409, headers }
      );
    }

    return NextResponse.json({ url: '/sales' }, { headers });
  } catch {
    return NextResponse.json(
      { error: 'Sign-in is temporarily unavailable. Please try again.' },
      { status: 503 }
    );
  }
}
