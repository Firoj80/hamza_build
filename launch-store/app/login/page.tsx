import Link from 'next/link';
import { ArrowLeft, Check, LayoutDashboard, Lock, ShieldCheck } from 'lucide-react';
import LoginForm from './login-form';
import BrandMark from '../brand-mark';
import SiteFooter from '../site-footer';
import { isSalesAdmin, safeNext } from '@/lib/platform-policy.mjs';
import { authConfigured, currentUser } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Admin Sign In — Hamza Idrishi',
  robots: { index: false, follow: false }
};

export default async function Login({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const next = safeNext(params.next);
  const loggedOut = params.logged_out === '1';
  const rawMode = typeof params.mode === 'string' ? params.mode : '';
  const initialMode = rawMode === 'recover' ? 'recover' : 'login';

  const user = await currentUser();
  if (user && isSalesAdmin(user.email, process.env.SALES_DASHBOARD_ADMIN_EMAIL)) {
    redirect(next && next.startsWith('/sales') ? next : '/sales');
  }

  return (
    <div className="page-shell">
      <header className="smart-header-shell">
        <div className="site-header wrap">
          <div className="header-brand-group">
            <BrandMark href="/" className="wordmark" icon />
          </div>
          <div className="header-auth-actions">
            <Link href="/" className="header-btn header-btn-outline">
              <ArrowLeft size={15} /> Back to store
            </Link>
            <Link href="/support" className="header-btn header-btn-ghost">
              Support
            </Link>
          </div>
        </div>
      </header>

      <main className="auth-portal-main wrap">
        <div className="auth-portal-grid">
          <section className="auth-editorial-panel">
            <div className="eyebrow">
              <span /> STORE MANAGEMENT · ADMIN ACCESS ONLY
            </div>
            <h1>
              Admin <em>Dashboard</em> Portal.
            </h1>
            <p className="auth-lead">
              Sign in with your administrator credentials to manage products, sync Dodo Payments
              buyers, view conversion analytics, and run Gmail campaigns.
            </p>

            <div className="auth-feature-list">
              <div className="auth-feature-item">
                <span className="auth-feature-icon">
                  <LayoutDashboard size={16} />
                </span>
                <div>
                  <strong>Live Dodo Payments Buyer Sync</strong>
                  <p>
                    View all $5 Fieldguide, $9 Studio, and $12 Bundle orders and buyer emails
                    fetched directly from Dodo Payments.
                  </p>
                </div>
              </div>
              <div className="auth-feature-item">
                <span className="auth-feature-icon">
                  <Check size={16} />
                </span>
                <div>
                  <strong>No Customer Registration Needed</strong>
                  <p>
                    Customers checkout directly on Dodo without creating an account and receive
                    instant PDF &amp; HTML downloads.
                  </p>
                </div>
              </div>
              <div className="auth-feature-item">
                <span className="auth-feature-icon">
                  <Lock size={16} />
                </span>
                <div>
                  <strong>Restricted to Store Administrator</strong>
                  <p>
                    Only authorized store administrator email addresses can sign in to this portal.
                  </p>
                </div>
              </div>
            </div>

            <div className="auth-trust-bar">
              <ShieldCheck size={16} />
              <span>Protected admin session · Direct Dodo checkout active for all buyers</span>
            </div>
          </section>

          <section className="auth-card-panel">
            <div className="order-box auth-order-box">
              {params.error === 'expired' && (
                <div className="auth-expired-banner" role="alert">
                  This password link has expired or was opened in a different browser. Use{' '}
                  <strong>Reset admin password</strong> below to request a fresh link.
                </div>
              )}
              <LoginForm
                next={next && next.startsWith('/sales') ? next : '/sales'}
                configured={authConfigured()}
                initialMode={initialMode}
                loggedOutInitially={loggedOut}
              />
            </div>
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
