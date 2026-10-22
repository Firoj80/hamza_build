import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, ArrowUpRight, Check, LogIn, ShieldCheck, UserPlus } from 'lucide-react';
import CheckoutButton from '@/app/checkout-button';
import { guide, studio } from '@/lib/catalog';
import { findProductBySlugOrKey, getActiveCatalogProducts } from '@/lib/product-store';
import StudioGallery from './studio-gallery';
import SiteHeader from '@/app/site-header';
import SiteFooter from '@/app/site-footer';
import { currentUser } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await findProductBySlugOrKey(slug);
  if (!product || product.status === 'archived') return { title: 'Product not found' };
  const pageUrl = `/products/${product.slug}`;
  return {
    title: `${product.name} — Hamza Idrishi`,
    description: product.description,
    alternates: {
      canonical: pageUrl
    },
    openGraph: {
      type: 'website',
      siteName: 'Hamza Idrishi · Build_hamza',
      title: product.shareTitle,
      description: product.shareDescription,
      url: pageUrl,
      images: [
        {
          url: product.ogImage,
          width: 1600,
          height: 1100,
          alt: product.imageAlt,
          type: 'image/png'
        }
      ]
    },
    twitter: {
      card: 'summary_large_image',
      site: '@hamza_build',
      creator: '@hamza_build',
      title: product.shareTitle,
      description: product.shareDescription,
      images: [
        {
          url: product.ogImage,
          alt: product.imageAlt
        }
      ]
    }
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const [product, allProducts, user] = await Promise.all([
    findProductBySlugOrKey(slug),
    getActiveCatalogProducts(),
    currentUser()
  ]);
  if (!product || product.status === 'archived') notFound();

  const isGuide = product.key === 'fieldguide';
  const isLightCover = product.coverTheme === 'light';
  const companion =
    allProducts.find((p) => p.key !== product.key) ||
    (isGuide
      ? { name: studio.name, price: studio.price, slug: studio.slug }
      : { name: guide.name, price: guide.price, slug: guide.slug });

  return (
    <div className="product-detail-page">
      <SiteHeader backHref="/#tools" backLabel="All tools" />
      <main>
        <section className="product-detail-hero wrap">
          <div className="product-detail-copy">
            <div className="eyebrow">
              <span />
              {product.eyebrow}
            </div>
            <h1>
              {product.name}
              <br />
              <em>{product.headline}</em>
            </h1>
            <p>{product.description}</p>
            <div className="detail-price">
              {product.compareAtPrice && product.compareAtPrice > product.price && (
                <s style={{ fontSize: '20px', color: '#8a948d', marginRight: '8px' }}>
                  ${product.compareAtPrice}
                </s>
              )}
              <strong>${product.price}</strong>
              <span>
                {product.currency} · pay once
                <br />
                Account access
              </span>
            </div>
            <CheckoutButton product={product.key} className="button dark">
              {product.ctaLabel || `Get ${product.name} access · $${product.price}`}
            </CheckoutButton>
            <div className="detail-access">
              <ShieldCheck size={16} />
              {product.access}
            </div>
            <div className="hero-account-bar">
              {user ? (
                <>
                  <span className="hero-account-status">
                    Signed in as <strong>{user.email}</strong>
                  </span>
                  <Link href="/library" className="hero-account-link">
                    Check my library <ArrowUpRight size={14} />
                  </Link>
                </>
              ) : (
                <>
                  <span className="hero-account-status">Already purchased?</span>
                  <div className="hero-account-links">
                    <Link href="/login?mode=login" className="hero-account-link">
                      <LogIn size={14} /> Sign in
                    </Link>
                    <span>·</span>
                    <Link href="/login?mode=signup" className="hero-account-link">
                      <UserPlus size={14} /> Create account
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>
          <div
            className={`product-detail-visual ${isLightCover ? 'is-guide-cover' : 'is-studio-cover'}`}
          >
            <div className="detail-image-label">{product.imageLabel}</div>
            <Image
              src={product.image}
              alt={product.imageAlt}
              width={1600}
              height={1100}
              unoptimized
              priority
            />
            <p className="detail-image-note">
              {isGuide
                ? 'Editorial cover concept. Purchase access to open the interactive seven-page guide in your account library.'
                : product.key === 'studio'
                  ? 'Workspace cover showcase. Explore the five real working app screenshots in the interactive gallery below.'
                  : `${product.name} showcase. Purchase access to unlock this resource inside your personal account library.`}
            </p>
          </div>
        </section>

        <section className="detail-includes wrap">
          <div className="detail-section-heading">
            <div className="eyebrow">WHAT YOU GET</div>
            <h2>
              {isGuide
                ? 'A small plan you can put to work.'
                : 'A calmer way to organise the work.'}
            </h2>
            <p>
              Built to help you take a useful next step, with clear limits and no
              promised sales outcomes.
            </p>
          </div>
          <ul>
            {product.includes.map((item) => (
              <li key={item}>
                <Check size={17} />
                {item}
              </li>
            ))}
          </ul>
        </section>

        {product.key === 'studio' && (
          <div className="wrap">
            <StudioGallery />
          </div>
        )}

        {product.galleryImages && product.galleryImages.length > 0 && (
          <section className="wrap" style={{ marginBottom: '42px' }}>
            <div className="detail-section-heading" style={{ marginBottom: '18px' }}>
              <div className="eyebrow">INSIDE PREVIEW GALLERY</div>
              <h2>Preview screenshots &amp; pages</h2>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '16px'
              }}
            >
              {product.galleryImages.map((imgUrl, idx) => (
                <div
                  key={`${imgUrl}-${idx}`}
                  style={{
                    borderRadius: '14px',
                    overflow: 'hidden',
                    border: '1px solid #dce3d6',
                    background: '#fff'
                  }}
                >
                  <Image
                    src={imgUrl}
                    alt={`${product.name} preview ${idx + 1}`}
                    width={1200}
                    height={800}
                    unoptimized
                    style={{ width: '100%', height: 'auto', display: 'block' }}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="detail-steps wrap">
          {product.sections.map((section, index) => (
            <article key={section.title || index}>
              <span>0{index + 1}</span>
              <h3>{section.title}</h3>
              <p>{section.body}</p>
            </article>
          ))}
        </section>

        <section className="detail-bottom wrap">
          <div>
            <div className="eyebrow">GOOD TO KNOW</div>
            <h2>
              Clear access.
              <br />
              <em>Honest expectations.</em>
            </h2>
            <p>{product.limitation}</p>
          </div>
          <aside>
            <span className="detail-price">
              <strong>${product.price}</strong>
              <small>{product.currency} · one-time purchase</small>
            </span>
            <CheckoutButton product={product.key} className="button lime">
              Get access · ${product.price}
            </CheckoutButton>
            <p>
              Secure checkout · Account access · No monthly product subscription
            </p>
          </aside>
        </section>

        <section className="detail-next wrap">
          <div>
            <div className="eyebrow">THE NEXT USEFUL STEP</div>
            <p>{product.nextStep}</p>
          </div>
          <Link href={product.nextHref || `/products/${companion.slug}`} className="text-link">
            Explore {companion.name} · ${companion.price}
            <ArrowRight size={16} />
          </Link>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
