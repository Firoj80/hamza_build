'use client';
import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowUpRight,
  LayoutDashboard,
  LogOut,
  Menu,
  Sparkles,
  X
} from 'lucide-react';
import BrandMark from './brand-mark';
import { LocalizedCtaText } from './currency-context';

type Props = {
  email?: string | null;
  isAdmin?: boolean;
  backHref?: string;
  backLabel?: string;
};

export default function SiteHeaderClient({
  email,
  isAdmin = false,
  backHref,
  backLabel
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="smart-header-shell">
      <div className="site-header wrap">
        <div className="header-brand-group">
          <BrandMark href="/" className="wordmark" icon />
          {backHref && (
            <Link href={backHref} className="header-back-pill">
              <ArrowLeft size={14} /> {backLabel || 'All tools'}
            </Link>
          )}
        </div>

        <nav className="desktop-nav" aria-label="Main navigation">
          <Link href="/#tools">Products</Link>
          <Link href="/products/complete-creator-bundle">
            <LocalizedCtaText label="Bundle ($12, Was $25)" usdPrice={12} productKey="bundle" />
          </Link>
          <Link href="/#inside">How it works</Link>
          <Link href="/#questions">FAQ</Link>
          <Link href="/support">Support</Link>
        </nav>

        <div className="header-auth-actions">
          {isAdmin ? (
            <>
              <span className="header-user-pill" title={email || ''}>
                <span className="header-user-dot" aria-hidden="true" />
                <span className="header-user-email">Admin · {email}</span>
              </span>
              <Link href="/sales" className="header-btn header-btn-primary">
                <LayoutDashboard size={15} /> Dashboard <ArrowUpRight size={15} />
              </Link>
              <form action="/auth/logout" method="post" className="header-logout-form">
                <button type="submit" className="header-btn header-btn-outline">
                  <LogOut size={15} /> Sign out
                </button>
              </form>
            </>
          ) : (
            <Link href="/#tools" className="header-btn header-btn-primary">
              <Sparkles size={15} /> Explore tools <ArrowUpRight size={15} />
            </Link>
          )}

          <button
            type="button"
            className="mobile-menu-toggle"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="mobile-nav-drawer wrap" role="dialog" aria-label="Mobile navigation">
          <div className="mobile-nav-links">
            <Link href="/#tools" onClick={() => setMenuOpen(false)}>
              <LocalizedCtaText
                label="Products ($5 · $9 · $12 Bundle)"
                usdPrice={12}
                productKey="bundle"
              />
            </Link>
            <Link href="/products/complete-creator-bundle" onClick={() => setMenuOpen(false)}>
              <LocalizedCtaText
                label="Complete Creator Bundle ($12, Was $25)"
                usdPrice={12}
                productKey="bundle"
              />
            </Link>
            <Link href="/#inside" onClick={() => setMenuOpen(false)}>
              How it works
            </Link>
            <Link href="/#questions" onClick={() => setMenuOpen(false)}>
              Questions
            </Link>
            <Link href="/support" onClick={() => setMenuOpen(false)}>
              Support
            </Link>
          </div>

          <div className="mobile-nav-auth">
            {isAdmin ? (
              <>
                <div className="mobile-user-summary">
                  <span className="header-user-dot" aria-hidden="true" />
                  <div>
                    <small>ADMIN SESSION</small>
                    <strong>{email}</strong>
                  </div>
                </div>
                <div className="mobile-auth-grid">
                  <Link
                    href="/sales"
                    className="button dark"
                    onClick={() => setMenuOpen(false)}
                  >
                    <LayoutDashboard size={15} /> Open Sales Dashboard
                  </Link>
                  <form action="/auth/logout" method="post" className="mobile-logout-form">
                    <button type="submit" className="button outline mobile-logout-btn">
                      <LogOut size={15} /> Sign out
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <div className="mobile-auth-grid">
                <Link
                  href="/#tools"
                  className="button dark"
                  onClick={() => setMenuOpen(false)}
                >
                  <Sparkles size={16} /> Browse tools &amp; bundles
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
