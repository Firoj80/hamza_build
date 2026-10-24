import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, ArrowUpRight, Check, Download, Package } from 'lucide-react';
import CheckoutButton from '@/app/checkout-button';
import { bundle, guide, studio } from '@/lib/catalog';
import { findProductBySlugOrKey, getActiveCatalogProducts } from '@/lib/product-store';
import StudioGallery from './studio-gallery';
import SiteHeader from '@/app/site-header';
import SiteFooter from '@/app/site-footer';
import { PriceTag, LocalizedCtaText } from '@/app/currency-context';

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
  const [product, allProducts] = await Promise.all([
    findProductBySlugOrKey(slug),
    getActiveCatalogProducts()
  ]);
  if (!product || product.status === 'archived') notFound();

  const isGuide = product.key === 'fieldguide';
  const isStudio = product.key === 'studio';
  const isBundle = product.key === 'bundle' || product.deliveryType === 'bundle_both';
  const isLightCover = product.coverTheme === 'light';

  const bundleCompanion = allProducts.find((p) => p.key === 'bundle');
  const companion =
    (!isBundle && bundleCompanion) ||
    allProducts.find((p) => p.key !== product.key) ||
    (isGuide
      ? { name: bundle.name, price: bundle.price, slug: bundle.slug, key: 'bundle' }
      : { name: guide.name, price: guide.price, slug: guide.slug, key: 'fieldguide' });

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
            <p>
              <LocalizedCtaText
                label={product.description}
                usdPrice={product.price}
                productKey={product.key}
              />
            </p>
            <PriceTag
              usdPrice={product.price}
              productKey={product.key}
              usdCompareAtPrice={product.compareAtPrice}
              mode="detail-hero"
            />
            <CheckoutButton product={product.key} usdPrice={product.price} className="button dark">
              {product.ctaLabel || `Get ${product.name} · $${product.price}`}
            </CheckoutButton>
            <div className="detail-access">
              <Download size={16} />
              <span>
                <LocalizedCtaText
                  label={
                    isBundle
                      ? 'Instant Dual Download: Fieldguide PDF ($9 value) + Launchpad Studio HTML ($19 value) · Save $13 Today'
                      : isGuide
                        ? 'Instant PDF Download (Idea-to-Income-Fieldguide.pdf) + Web Reader · Save $4 Off $9 Today'
                        : isStudio
                          ? 'Instant HTML File Download (Launchpad-Studio.html) + Online Workspace · Save $10 Off $19 Today'
                          : product.access
                  }
                  usdPrice={product.price}
                  productKey={product.key}
                />
              </span>
            </div>

            {!isBundle && bundleCompanion ? (
              <div className="hero-account-bar">
                <span className="hero-account-status">
                  <Package
                    size={14}
                    style={{ verticalAlign: 'text-bottom', marginRight: '5px', color: '#173b31' }}
                  />
                  <LocalizedCtaText
                    label="Want both the Fieldguide PDF ($5, was $9) and Launchpad Studio HTML App ($9, was $19) together?"
                    usdPrice={bundleCompanion.price}
                    productKey={bundleCompanion.key}
                  />
                </span>
                <div className="hero-account-links">
                  <Link href={`/products/${bundleCompanion.slug}`} className="hero-account-link">
                    <LocalizedCtaText
                      label="Claim $12 Bundle (Was $25 · Save $13)"
                      usdPrice={bundleCompanion.price}
                      productKey={bundleCompanion.key}
                    />{' '}
                    <ArrowUpRight size={14} />
                  </Link>
                </div>
              </div>
            ) : isBundle ? (
              <div className="hero-account-bar">
                <span className="hero-account-status">
                  <Check
                    size={14}
                    style={{ verticalAlign: 'text-bottom', marginRight: '5px', color: '#173b31' }}
                  />
                  <strong>
                    <LocalizedCtaText
                      label="Best Value ($12 vs $25):"
                      usdPrice={product.price}
                      productKey={product.key}
                    />
                  </strong>{' '}
                  <LocalizedCtaText
                    label="Save $13 (52% off) and unlock both the PDF guide and standalone HTML app immediately."
                    usdPrice={product.price}
                    productKey={product.key}
                  />
                </span>
              </div>
            ) : null}
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
              {isBundle
                ? 'Instant delivery after checkout: download both the 7-page Fieldguide PDF and the standalone Launchpad-Studio.html app immediately.'
                : isGuide
                  ? 'Instant delivery after checkout: download the 7-page PDF file directly to your device or read online in your browser.'
                  : isStudio
                    ? 'Instant delivery after checkout: download the standalone Launchpad-Studio.html app to use offline anytime, plus access the online workspace.'
                    : `${product.name} showcase. Purchase to unlock instant access.`}
            </p>
          </div>
        </section>

        <section className="detail-includes wrap">
          <div className="detail-section-heading">
            <div className="eyebrow">
              <span /> WHAT YOU RECEIVE IMMEDIATELY
            </div>
            <h2>
              {isBundle
                ? 'Both the 7-page tactical PDF and the 5-stage HTML launch app.'
                : isGuide
                  ? 'A 7-page tactical PDF you can put to work today.'
                  : 'A standalone HTML launch system you own forever.'}
            </h2>
            <p>
              Lock in your launch discount today and download your{' '}
              {isBundle
                ? 'PDF guide and HTML application files'
                : isGuide
                  ? 'PDF guide'
                  : 'HTML application file'}{' '}
              immediately on the confirmation screen.
            </p>
          </div>
          <ul>
            {product.includes.map((item) => (
              <li key={item}>
                <Check size={17} />
                <span>
                  <LocalizedCtaText
                    label={item}
                    usdPrice={product.price}
                    productKey={product.key}
                  />
                </span>
              </li>
            ))}
          </ul>
        </section>

        {(isStudio || isBundle) && (
          <div className="wrap">
            <StudioGallery />
          </div>
        )}

        {product.galleryImages && product.galleryImages.length > 0 && (
          <section className="wrap" style={{ marginBottom: '42px' }}>
            <div className="detail-section-heading" style={{ marginBottom: '18px' }}>
              <div className="eyebrow">
                <span /> INSIDE PREVIEW GALLERY
              </div>
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
            <div className="eyebrow">
              <span /> GOOD TO KNOW
            </div>
            <h2>
              Instant download.
              <br />
              <em>Honest expectations.</em>
            </h2>
            <p>{product.limitation}</p>
          </div>
          <aside>
            <PriceTag
              usdPrice={product.price}
              productKey={product.key}
              usdCompareAtPrice={product.compareAtPrice}
              mode="detail-aside"
            />
            <CheckoutButton product={product.key} usdPrice={product.price} className="button lime">
              {isBundle
                ? `Get Complete Bundle · $12 (Was $25)`
                : isGuide
                  ? `Get the Fieldguide PDF · $5 (Was $9)`
                  : isStudio
                    ? `Get Launchpad Studio · $9 (Was $19)`
                    : `Get instant access · $${product.price}`}
            </CheckoutButton>
            <p>
              <LocalizedCtaText
                label={
                  isBundle
                    ? 'Save $13 (52% off $25) · Instant PDF + HTML download'
                    : isGuide
                       ? 'Save $4 (44% off $9) · Instant PDF download'
                       : 'Save $10 (53% off $19) · Instant HTML app download'
                }
                usdPrice={product.price}
                productKey={product.key}
              />
            </p>
          </aside>
        </section>

        <section className="detail-next wrap">
          <div>
            <div className="eyebrow">
              <span /> THE NEXT USEFUL STEP
            </div>
            <p>
              <LocalizedCtaText
                label={product.nextStep}
                usdPrice={companion.price}
                productKey={'key' in companion ? companion.key : undefined}
              />
            </p>
          </div>
          <Link href={product.nextHref || `/products/${companion.slug}`} className="text-link">
            <LocalizedCtaText
              label={`Explore ${companion.name} · $${companion.price}`}
              usdPrice={companion.price}
              productKey={'key' in companion ? companion.key : undefined}
            />
            <ArrowRight size={16} />
          </Link>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
