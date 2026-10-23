import Link from 'next/link';
import { ArrowLeft, BookOpen, Download, KeyRound, LogOut } from 'lucide-react';
import { requireProduct } from '@/lib/access';

import type { Metadata } from 'next';
import { productDetails } from '@/lib/catalog';

const studioMeta = productDetails['launchpad-studio'];
export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Launchpad Studio — Workspace & HTML App Download',
  description: studioMeta.description,
  robots: { index: false, follow: false },
  openGraph: {
    type: 'website',
    siteName: 'Hamza Idrishi · Build_hamza',
    title: studioMeta.shareTitle,
    description: studioMeta.shareDescription,
    url: '/products/launchpad-studio',
    images: [
      {
        url: studioMeta.ogImage,
        width: 1600,
        height: 1100,
        alt: studioMeta.imageAlt,
        type: 'image/png'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    site: '@hamza_build',
    creator: '@hamza_build',
    title: studioMeta.shareTitle,
    description: studioMeta.shareDescription,
    images: [{ url: studioMeta.ogImage, alt: studioMeta.imageAlt }]
  }
};

export default async function Studio({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = searchParams ? await searchParams : {};
  const tokenParam = typeof params?.token === 'string' ? params.token : null;
  const access = await requireProduct('studio', { tokenParam });
  const activeToken = access.deliveryToken || tokenParam;
  const tokenQuery = activeToken ? `&token=${encodeURIComponent(activeToken)}` : '';
  const iframeSrc = activeToken
    ? `/api/workspace?token=${encodeURIComponent(activeToken)}`
    : '/api/workspace';

  return (
    <main className="hosted-studio">
      <div className="platform-top">
        <div className="platform-top-left">
          <Link href={access.user ? '/library' : '/'} className="platform-nav-pill">
            <ArrowLeft size={14} /> {access.user ? 'Your library' : 'Storefront'}
          </Link>
          <a
            href={`/api/download?product=studio${tokenQuery}`}
            download="Launchpad-Studio.html"
            className="platform-nav-pill"
            style={{ background: '#d8e4a5', color: '#173b31', fontWeight: 700 }}
          >
            <Download size={14} /> Download Offline HTML App
          </a>
          <Link href="/fieldguide" className="platform-nav-link">
            <BookOpen size={14} /> Fieldguide
          </Link>
        </div>
        <span className="platform-top-badge">
          LAUNCHPAD STUDIO · CLOUD WORKSPACE + OFFLINE HTML DOWNLOAD
        </span>
        <div className="platform-top-right">
          {access.user && (
            <>
              <Link href="/account/password" className="platform-nav-link">
                <KeyRound size={14} /> Password
              </Link>
              <form action="/auth/logout" method="post">
                <button type="submit" className="platform-logout-btn">
                  <LogOut size={14} /> Sign out
                </button>
              </form>
            </>
          )}
        </div>
      </div>
      <iframe
        title="Your Launchpad Studio workspace"
        src={iframeSrc}
        sandbox="allow-scripts allow-same-origin allow-downloads"
        allow="clipboard-write"
      />
    </main>
  );
}
