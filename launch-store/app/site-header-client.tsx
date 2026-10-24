'use client';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, LayoutDashboard, LogOut } from 'lucide-react';

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
  return (
    <header className="smart-header-shell">
      <div className="wrap centered-site-header">
        {backHref && (
          <div className="centered-header-back-row">
            <Link href={backHref} className="header-back-pill">
              <ArrowLeft size={14} /> {backLabel || 'All tools'}
            </Link>
          </div>
        )}

        <Link href="/" className="centered-brand-lockup" aria-label="Hamza Idrishi Home">
          <div className="centered-title-row">
            <Image
              className="brand-icon"
              src="/assets/aistudio/ik_Vm6tn_d1cf175a.jpg"
              alt="Hamza Idrishi"
              width={40}
              height={40}
              unoptimized
            />
            <span className="centered-site-title">Hamza Idrishi</span>
          </div>
          <p className="centered-site-tagline">
            Threads + AIs + Digital Products= Money Machine 💵
          </p>
        </Link>

        {isAdmin && (
          <div className="header-auth-actions centered-admin-actions">
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
          </div>
        )}
      </div>
    </header>
  );
}
