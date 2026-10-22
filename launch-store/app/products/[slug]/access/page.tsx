import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, ArrowUpRight, BookOpen, CheckCircle2, ExternalLink, ShieldCheck } from 'lucide-react';
import { findProductBySlugOrKey } from '@/lib/product-store';
import { ownedProducts } from '@/lib/access';
import { isSalesAdmin } from '@/lib/platform-policy.mjs';
import SiteHeader from '@/app/site-header';
import SiteFooter from '@/app/site-footer';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }> };

export default async function CustomProductAccessPage({ params }: Props) {
  const { slug } = await params;
  const product = await findProductBySlugOrKey(slug);
  if (!product) notFound();

  if (product.key === 'fieldguide') {
    redirect('/fieldguide');
  }
  if (product.key === 'studio') {
    redirect('/studio');
  }

  const { user, products } = await ownedProducts();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/products/${product.slug}/access`)}`);
  }

  const isAdmin = Boolean(user.email && isSalesAdmin(user.email, process.env.SALES_DASHBOARD_ADMIN_EMAIL));
  const hasAccess = isAdmin || products.includes(product.key) || products.includes(product.slug);

  if (!hasAccess) {
    redirect(`/library?locked=${encodeURIComponent(product.key)}`);
  }

  return (
    <div className="page-shell">
      <SiteHeader backHref="/library" backLabel="My library" />
      <main className="editorial-utility-main wrap">
        <div className="order-box" style={{ maxWidth: '820px', margin: '0 auto', padding: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
            <span className="library-status-pill unlocked">
              <CheckCircle2 size={14} /> UNLOCKED IN YOUR LIBRARY
            </span>
            <span style={{ fontSize: '12px', color: '#68736d' }}>
              Signed in as <strong>{user.email}</strong>
            </span>
          </div>

          <div className="eyebrow" style={{ marginBottom: '6px' }}>
            <span /> {product.cardTag || product.eyebrow}
          </div>
          <h1 style={{ margin: '0 0 10px', fontSize: 'clamp(26px, 3.5vw, 38px)', lineHeight: 1.12 }}>
            {product.name}
          </h1>
          <p style={{ fontSize: '16px', color: '#4a5851', lineHeight: 1.6, marginBottom: '24px' }}>
            {product.description}
          </p>

          {product.externalAccessUrl && (
            <div
              style={{
                background: '#f4f8f2',
                border: '1px solid #cfe0c7',
                borderRadius: '14px',
                padding: '20px',
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
                flexWrap: 'wrap'
              }}
            >
              <div>
                <strong style={{ display: 'block', color: '#173b31', fontSize: '15px', marginBottom: '4px' }}>
                  Direct Resource Link &amp; Files
                </strong>
                <span style={{ fontSize: '13px', color: '#4a5851' }}>
                  Open your unlocked template, workspace, or downloadable files in a new tab.
                </span>
              </div>
              <a
                href={product.externalAccessUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="button dark"
              >
                <span>Open {product.name} Resource</span>
                <ExternalLink size={16} />
              </a>
            </div>
          )}

          <div
            style={{
              background: '#fff',
              border: '1px solid #e2e7df',
              borderRadius: '14px',
              padding: '24px',
              marginBottom: '24px'
            }}
          >
            <div className="eyebrow" style={{ marginBottom: '12px' }}>
              <BookOpen size={14} /> GUIDE &amp; INCLUDED DELIVERABLES
            </div>
            {product.hostedContent ? (
              <div
                style={{
                  whiteSpace: 'pre-wrap',
                  fontSize: '15px',
                  lineHeight: 1.7,
                  color: '#1d2925'
                }}
              >
                {product.hostedContent}
              </div>
            ) : (
              <div>
                <p style={{ marginTop: 0, color: '#4a5851', lineHeight: 1.6 }}>
                  Everything included with your <strong>{product.name}</strong> access:
                </p>
                <ul style={{ paddingLeft: '20px', lineHeight: 1.8, color: '#1d2925' }}>
                  {product.includes.map((inc) => (
                    <li key={inc}>{inc}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', paddingTop: '14px', borderTop: '1px solid #edf0eb' }}>
            <Link href="/library" className="button outline">
              <ArrowLeft size={15} /> Back to my library
            </Link>
            <Link href="/review" className="text-link">
              Leave a rating &amp; review <ArrowUpRight size={15} />
            </Link>
          </div>

          <div className="order-security-footnote" style={{ marginTop: '18px' }}>
            <ShieldCheck size={15} />
            <span>Protected by account ownership verification.</span>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
