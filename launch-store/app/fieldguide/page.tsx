import Link from 'next/link';
import {
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  Download,
  Layers,
  LogOut,
  ShieldCheck
} from 'lucide-react';
import { requireProduct } from '@/lib/access';
import BrandMark from '@/app/brand-mark';
import SiteFooter from '@/app/site-footer';

import type { Metadata } from 'next';
import { productDetails } from '@/lib/catalog';

const fieldguideMeta = productDetails['first-product-fieldguide'];
export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Idea-to-Income Fieldguide — Reader & PDF Download',
  description: fieldguideMeta.description,
  robots: { index: false, follow: false },
  openGraph: {
    type: 'website',
    siteName: 'Hamza Idrishi · Build_hamza',
    title: fieldguideMeta.shareTitle,
    description: fieldguideMeta.shareDescription,
    url: '/products/first-product-fieldguide',
    images: [
      {
        url: fieldguideMeta.ogImage,
        width: 1600,
        height: 1100,
        alt: fieldguideMeta.imageAlt,
        type: 'image/png'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    site: '@hamza_build',
    creator: '@hamza_build',
    title: fieldguideMeta.shareTitle,
    description: fieldguideMeta.shareDescription,
    images: [{ url: fieldguideMeta.ogImage, alt: fieldguideMeta.imageAlt }]
  }
};

export default async function Fieldguide({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = searchParams ? await searchParams : {};
  const tokenParam = typeof params?.token === 'string' ? params.token : null;
  const access = await requireProduct('fieldguide', { tokenParam });
  const activeToken = access.deliveryToken || tokenParam;
  const tokenQuery = activeToken ? `&token=${encodeURIComponent(activeToken)}` : '';
  const iframeSrc = activeToken
    ? `/api/fieldguide?token=${encodeURIComponent(activeToken)}#toolbar=0`
    : '/api/fieldguide#toolbar=0';

  return (
    <div className="page-shell">
      <header className="smart-header-shell">
        <div className="site-header wrap">
          <div className="header-brand-group">
            <BrandMark href="/" className="wordmark" icon />
            <Link href={access.user ? '/library' : '/'} className="header-back-pill">
              <ArrowLeft size={14} /> {access.user ? 'Back to library' : 'Storefront'}
            </Link>
          </div>
          <div className="header-auth-actions">
            <a
              href={`/api/download?product=fieldguide${tokenQuery}`}
              download="Idea-to-Income-Fieldguide.pdf"
              className="header-btn header-btn-primary"
            >
              <Download size={15} /> Download PDF
            </a>
            <Link href="/products/launchpad-studio" className="header-btn header-btn-ghost">
              <Layers size={15} /> Launchpad Studio ($9)
            </Link>
            {access.user && (
              <form action="/auth/logout" method="post" className="header-logout-form">
                <button type="submit" className="header-btn header-btn-outline">
                  <LogOut size={15} /> Sign out
                </button>
              </form>
            )}
          </div>
        </div>
      </header>

      <main className="fieldguide-reader-shell wrap">
        <div className="reader-header-card">
          <div>
            <div className="eyebrow">
              <span /> IDEA-TO-INCOME FIELDGUIDE · PDF DOWNLOAD &amp; READER
            </div>
            <h1>
              One problem.
              <br />
              One useful <em>first version.</em>
            </h1>
            <p>
              Read your seven-page practical fieldguide directly below, or download the{' '}
              <strong>Idea-to-Income-Fieldguide.pdf</strong> file to keep on your phone, tablet, or
              laptop forever.
            </p>
            <div style={{ marginTop: '14px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <a
                href={`/api/download?product=fieldguide${tokenQuery}`}
                download="Idea-to-Income-Fieldguide.pdf"
                className="button dark"
              >
                <Download size={16} />
                <span>Download Fieldguide PDF</span>
              </a>
            </div>
          </div>
          <div className="reader-companion-box">
            <span>NEXT STEP COMPANION</span>
            <strong>Launchpad Studio ($9)</strong>
            <p>
              Get the downloadable offline HTML workspace app + 15-point idea scorecard, 8 AI prompt
              engines, and 30 Threads post starters.
            </p>
            <Link href="/products/launchpad-studio" className="text-link">
              Explore Launchpad Studio <ArrowUpRight size={15} />
            </Link>
          </div>
        </div>

        <div className="reader-frame-container">
          <div className="reader-frame-bar">
            <span>
              <BookOpen size={14} /> IDEA-TO-INCOME FIELDGUIDE (7 PAGES)
            </span>
            <span>INSTANT PDF + BROWSER VIEW</span>
          </div>
          <iframe
            className="guide-reader"
            title="Idea-to-Income Fieldguide reader"
            src={iframeSrc}
          />
        </div>

        <div className="reader-footer-note">
          <ShieldCheck size={16} />
          <span>
            Save your PDF copy anytime using the Download PDF button above.
          </span>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
