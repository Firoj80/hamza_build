import Image from 'next/image';
import {
  ArrowUpRight,
  ArrowRight,
  Check,
  MousePointer2,
  FileText,
  Layers,
  Compass,
  ShieldCheck,
  Plus,
  Star,
  Download,
  Package
} from 'lucide-react';
import StudioPreview from './studio-preview';
import Link from 'next/link';
import { social } from '@/lib/catalog';
import CheckoutButton from './checkout-button';
import SiteHeader from './site-header';
import SiteFooter from './site-footer';
import { loadEmailStudioState } from '@/lib/email-reviews-store';
import { getActiveCatalogProducts } from '@/lib/product-store';
import { PriceTag, LocalizedCtaText } from './currency-context';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const [emailState, catalogProducts] = await Promise.all([
    loadEmailStudioState(),
    getActiveCatalogProducts()
  ]);
  const publishedReviews = emailState.reviews.filter((r) => r.published).slice(0, 6);
  const avgRating =
    publishedReviews.length > 0
      ? (
          publishedReviews.reduce((s, r) => s + r.rating, 0) / publishedReviews.length
        ).toFixed(1)
      : '5.0';
  const primaryProduct =
    catalogProducts.find((p) => p.key === 'fieldguide') || catalogProducts[0];
  const bundleProduct = catalogProducts.find((p) => p.key === 'bundle');

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <div className="announcement">
        <span>
          <LocalizedCtaText
            label="Launch Discount Active: Fieldguide $5 (Was $9) · Launchpad Studio $9 (Was $19) · Complete Bundle $12 (Was $25)"
            usdPrice={12}
            productKey="bundle"
          />
        </span>
        <a href="#tools">
          <LocalizedCtaText
            label={
              bundleProduct
                ? 'Claim the $12 Bundle & Save $13 (52% Off)'
                : primaryProduct
                  ? `${primaryProduct.ctaLabel || `Get ${primaryProduct.name} · $${primaryProduct.price}`}`
                  : 'Get the Fieldguide · $5 (Was $9)'
            }
            usdPrice={bundleProduct ? bundleProduct.price : primaryProduct ? primaryProduct.price : 5}
            productKey={bundleProduct ? bundleProduct.key : primaryProduct ? primaryProduct.key : 'fieldguide'}
          />{' '}
          <ArrowRight size={13} />
        </a>
      </div>
      <SiteHeader />
      <main id="main">
        <section className="hero wrap">
          <div className="hero-copy">
            <div className="eyebrow">
              <span /> SMALL TOOLS. REAL PROGRESS.
            </div>
            <h1>
              Your first product.
              <br />A clearer{' '}
              <em>
                way
                <br className="desktop-break" /> forward.
              </em>
            </h1>
            <p>
              You don’t need a 40-hour course or another blank page.
              <br />
              Start with our 7-page{' '}
              <strong>
                <LocalizedCtaText
                  label="Idea-to-Income Fieldguide PDF ($5, was $9)"
                  usdPrice={5}
                  productKey="fieldguide"
                />
              </strong>
              , the complete{' '}
              <strong>
                <LocalizedCtaText
                  label="Launchpad Studio HTML App ($9, was $19)"
                  usdPrice={9}
                  productKey="studio"
                />
              </strong>
              , or grab the{' '}
              <strong>
                <LocalizedCtaText
                  label="Complete Creator Bundle ($12, was $25)"
                  usdPrice={12}
                  productKey="bundle"
                />
              </strong>{' '}
              and start shipping your first product today.
            </p>
            <div className="hero-actions">
              <CheckoutButton
                product={primaryProduct ? primaryProduct.key : 'fieldguide'}
                usdPrice={primaryProduct ? primaryProduct.price : 5}
                className="button dark"
              >
                {primaryProduct
                  ? primaryProduct.ctaLabel
                  : 'Get the Fieldguide · $5 (Was $9)'}
              </CheckoutButton>
              <a className="text-link" href="#tools">
                <LocalizedCtaText
                  label="Explore the $12 Bundle (Save $13)"
                  usdPrice={12}
                  productKey="bundle"
                />{' '}
                <ArrowRight size={16} />
              </a>
            </div>
            <div className="hero-fine">
              <Check size={14} />{' '}
              <LocalizedCtaText
                label="Limited-time launch pricing · Save up to 52% ($13 off the $25 Bundle)"
                usdPrice={12}
                productKey="bundle"
              />
            </div>
            {bundleProduct && (
              <div className="hero-account-bar">
                <span className="hero-account-status">
                  <Package
                    size={14}
                    style={{ verticalAlign: 'text-bottom', marginRight: '5px', color: '#173b31' }}
                  />
                  <strong>
                    <LocalizedCtaText
                      label="Best Value — $12 (Was $25):"
                      usdPrice={12}
                      productKey="bundle"
                    />
                  </strong>{' '}
                  <LocalizedCtaText
                    label="Get both the Fieldguide PDF ($5) + Launchpad Studio HTML App ($9) & save $13:"
                    usdPrice={12}
                    productKey="bundle"
                  />
                </span>
                <div className="hero-account-links">
                  <Link href={`/products/${bundleProduct.slug}`} className="hero-account-link">
                    <LocalizedCtaText
                      label="Claim $12 Bundle (Save $13)"
                      usdPrice={12}
                      productKey="bundle"
                    />{' '}
                    <ArrowUpRight size={14} />
                  </Link>
                </div>
              </div>
            )}
          </div>
          <div className="hero-visual">
            <div className="image-label">
              <span className="mini-dot" /> INSTANT DOWNLOAD · USE ANYTIME ON ANY DEVICE
            </div>
            <div className="hero-cover-frame">
              <Image
                src={
                  primaryProduct
                    ? primaryProduct.image
                    : '/images/idea-to-income-fieldguide-cover.svg'
                }
                alt={
                  primaryProduct
                    ? primaryProduct.imageAlt
                    : 'Idea-to-Income Fieldguide hardcover monograph concept and customer validation scorecard sheet'
                }
                width={1600}
                height={1100}
                unoptimized
                priority
              />
            </div>
            <div className="visual-caption">
              <span>
                01 /{' '}
                {primaryProduct
                  ? primaryProduct.name.toUpperCase()
                  : 'IDEA-TO-INCOME FIELDGUIDE'}
              </span>
              <span>INSTANT PDF DOWNLOAD + WEB READER</span>
            </div>
            <div className="floating-note">
              <span className="note-star">✳</span>
              <div>
                A little less overthinking.
                <br />
                <b>A little more making.</b>
              </div>
            </div>
          </div>
        </section>

        <div className="principles wrap">
          <span>Built around what matters.</span>
          <p>
            <Compass size={17} /> Validate before you build
          </p>
          <p>
            <Download size={17} /> Instant PDF &amp; HTML file delivery
          </p>
          <p>
            <Layers size={17} /> One-time purchase · Own it forever
          </p>
        </div>

        <section className="tools wrap section-space" id="tools">
          <div className="section-heading">
            <div>
              <div className="eyebrow">PRODUCT CATALOG · LAUNCH DISCOUNT</div>
              <h2>
                {catalogProducts.length === 3
                  ? 'Pick your starting tool. Or save 52% with the complete bundle.'
                  : `One idea. ${catalogProducts.length} practical companions.`}
              </h2>
            </div>
            <p>
              Lock in our launch discount today and download your
              <br />
              tactical PDF or standalone offline HTML workspace immediately.
            </p>
          </div>

          <div className="catalog-listing-bar" aria-label="Store catalog summary">
            <div className="catalog-listing-count">
              <strong>
                {catalogProducts.length} Launch{' '}
                {catalogProducts.length === 1 ? 'Offer' : 'Offers'}
              </strong>
              <span>·</span>
              <span>Save up to 53% off original prices</span>
            </div>
            <div className="catalog-listing-meta">
              <span>
                <LocalizedCtaText
                  label="Fieldguide $5 (Was $9)"
                  usdPrice={5}
                  productKey="fieldguide"
                />
              </span>
              <span>·</span>
              <span>
                <LocalizedCtaText
                  label="Studio $9 (Was $19)"
                  usdPrice={9}
                  productKey="studio"
                />
              </span>
              <span>·</span>
              <span>
                <LocalizedCtaText
                  label="Bundle $12 (Was $25)"
                  usdPrice={12}
                  productKey="bundle"
                />
              </span>
            </div>
          </div>

          <div className="product-grid">
            {catalogProducts.map((item, idx) => {
              const href = `/products/${item.slug}`;
              const isDarkCover = item.coverTheme === 'dark';
              const isGreenBadge = item.badgeTheme === 'green' || item.badgeTheme === 'amber';
              const isGuideProduct =
                item.key === 'fieldguide' || item.deliveryType === 'fieldguide_reader';
              const isStudioProduct =
                item.key === 'studio' || item.deliveryType === 'studio_workspace';
              const isBundleProduct =
                item.key === 'bundle' || item.deliveryType === 'bundle_both';

              const formatLabel = isBundleProduct
                ? 'Complete 2-in-1 Bundle: PDF Guide + Offline HTML App'
                : isGuideProduct
                  ? '7-Page Tactical PDF + Web Reader'
                  : isStudioProduct
                    ? 'Standalone Offline HTML App + Workspace'
                    : 'Digital Resource & Guide';
              const deliverySpec = isBundleProduct
                ? 'Both .PDF + .HTML'
                : isGuideProduct
                  ? 'PDF File + Reader'
                  : isStudioProduct
                    ? '.HTML App + Studio'
                    : 'Instant Download';
              const originalValueLabel = isBundleProduct
                ? 'Was $25 · Now $12'
                : isGuideProduct
                  ? 'Was $9 · Now $5'
                  : isStudioProduct
                    ? 'Was $19 · Now $9'
                    : `$${item.price}`;
              const savingsLabel = isBundleProduct
                ? 'Save $13 (52% Off)'
                : isGuideProduct
                  ? 'Save $4 (44% Off)'
                  : isStudioProduct
                    ? 'Save $10 (53% Off)'
                    : 'Instant Access';

              return (
                <article
                  className={`product-card ${
                    isStudioProduct || isBundleProduct ? 'is-featured-listing' : ''
                  }`}
                  key={item.key}
                >
                  <div className="product-listing-topbar">
                    <span className="product-number">
                      {item.cardTag || `0${idx + 1} / DIGITAL PRODUCT`}
                    </span>
                    <span className="product-listing-status">
                      <LocalizedCtaText
                        label={
                          isBundleProduct
                            ? 'BEST VALUE · $12 (WAS $25 · SAVE $13)'
                            : isStudioProduct
                              ? 'LAUNCH OFFER · $9 (WAS $19 · SAVE $10)'
                              : 'STARTER OFFER · $5 (WAS $9 · SAVE $4)'
                        }
                        usdPrice={item.price}
                        productKey={item.key}
                      />
                    </span>
                  </div>

                  <Link
                    href={href}
                    className={`product-photo ${
                      isDarkCover ? 'cover-showcase-dark' : 'cover-showcase-light'
                    }`}
                    aria-label={`View ${item.name} details`}
                  >
                    <Image
                      src={item.image}
                      alt={item.imageAlt}
                      width={1600}
                      height={1100}
                      unoptimized
                    />
                    <span className={`product-badge ${isGreenBadge ? 'green' : ''}`}>
                      <LocalizedCtaText
                        label={item.badge}
                        usdPrice={item.price}
                        productKey={item.key}
                      />
                    </span>
                    <span className="product-photo-cta">
                      View product page <ArrowUpRight size={14} />
                    </span>
                  </Link>

                  <div className="product-body">
                    <div className="product-title">
                      <div className="product-title-group">
                        <span className="product-category-kicker">{formatLabel}</span>
                        <Link href={href} className="product-title-link">
                          <h3>{item.name}</h3>
                        </Link>
                      </div>
                      <div className="product-price-box">
                        <PriceTag
                          usdPrice={item.price}
                          productKey={item.key}
                          usdCompareAtPrice={item.compareAtPrice}
                          mode="card"
                        />
                      </div>
                    </div>

                    <p className="product-listing-summary">
                      <LocalizedCtaText
                        label={item.shortDescription || item.description}
                        usdPrice={item.price}
                        productKey={item.key}
                      />
                    </p>

                    <div className="product-includes-panel">
                      <div className="product-includes-label">
                        Included with your instant download
                      </div>
                      <ul>
                        {item.cardBullets.map((b) => (
                          <li key={b}>
                            <Check />
                            <span>
                              <LocalizedCtaText
                                label={b}
                                usdPrice={item.price}
                                productKey={item.key}
                              />
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="product-spec-strip" aria-label="Product specifications">
                      <div>
                        <small>FORMAT</small>
                        <strong>{deliverySpec}</strong>
                      </div>
                      <div>
                        <small>LAUNCH PRICE</small>
                        <strong>
                          <LocalizedCtaText
                            label={originalValueLabel}
                            usdPrice={item.price}
                            productKey={item.key}
                          />
                        </strong>
                      </div>
                      <div>
                        <small>YOUR DISCOUNT</small>
                        <strong>
                          <LocalizedCtaText
                            label={savingsLabel}
                            usdPrice={item.price}
                            productKey={item.key}
                          />
                        </strong>
                      </div>
                    </div>

                    <div className="product-card-actions">
                      <CheckoutButton
                        product={item.key}
                        usdPrice={item.price}
                        className="button dark"
                      >
                        {item.ctaLabel || `Get ${item.name} · $${item.price}`}
                      </CheckoutButton>
                      <Link href={href} className="product-detail-link">
                        <span>View full product details &amp; preview</span>
                        <ArrowUpRight size={15} />
                      </Link>
                    </div>
                    <small className="format-note">
                      <LocalizedCtaText
                        label={item.formatNote}
                        usdPrice={item.price}
                        productKey={item.key}
                      />
                    </small>
                  </div>
                </article>
              );
            })}
          </div>
          <p className="mockup-note">
            <LocalizedCtaText
              label="Special launch pricing: Get the 7-page Fieldguide PDF for $5 (was $9), the standalone Launchpad Studio HTML app for $9 (was $19), or grab both together in the Complete Creator Bundle for $12 (was $25 — save $13)."
              usdPrice={12}
              productKey="bundle"
            />
          </p>
        </section>

        <section className="process-section" id="inside">
          <div className="wrap section-space">
            <div className="section-heading">
              <div>
                <div className="eyebrow">INSIDE LAUNCHPAD STUDIO ($9 OR $12 BUNDLE)</div>
                <h2>
                  From “what if”
                  <br />
                  to “here’s the first version.”
                </h2>
              </div>
              <p>
                Download the standalone HTML app to use anytime offline,
                <br />
                or work right inside your browser studio.
              </p>
            </div>
            <div className="process-grid">
              {[
                {
                  n: '01',
                  title: 'Score & validate your idea.',
                  text: 'Pick from 24 niche product blueprints, run the 15-Point Conviction Scorecard, and auto-generate your 1-sentence offer pitch.'
                },
                {
                  n: '02',
                  title: 'Generate copy & 30 Threads posts.',
                  text: 'Use the 8-mode AI Master Prompt Studio and customize 30 daily Threads post starters with 1-click opening hooks and CTAs.'
                },
                {
                  n: '03',
                  title: 'Model revenue & export your plan.',
                  text: 'Reverse-engineer your monthly income target across $5, $9, and $19 tiers, then export your full plan as a Markdown or JSON file.'
                }
              ].map((s) => (
                <div key={s.n}>
                  <span>{s.n}</span>
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                </div>
              ))}
            </div>
            <StudioPreview />
            <div className="preview-caption">
              <MousePointer2 size={15} /> Interactive preview above. When you purchase Launchpad
              Studio ($9) or the Complete Creator Bundle ($12), you receive the full downloadable{' '}
              <code>Launchpad-Studio.html</code> file immediately after checkout.
            </div>
          </div>
        </section>

        {publishedReviews.length > 0 && (
          <section className="wrap section-space" id="reviews">
            <div className="section-heading">
              <div>
                <div className="eyebrow">READER &amp; BUILDER NOTES · ★ {avgRating} / 5.0</div>
                <h2>What early creators are saying.</h2>
              </div>
              <div>
                <p style={{ marginBottom: '10px' }}>
                  Real notes from readers and Launchpad Studio builders.
                </p>
                <Link className="text-link" href="/review">
                  Purchased a tool? Leave a rating &amp; review <ArrowUpRight size={16} />
                </Link>
              </div>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))',
                gap: '18px'
              }}
            >
              {publishedReviews.slice(0, 3).map((rev) => (
                <article
                  key={rev.id}
                  style={{
                    background: '#fff',
                    border: '1px solid #e2e7df',
                    borderRadius: '16px',
                    padding: '22px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', gap: '3px', color: '#d49b00' }}>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} size={15} fill={i < rev.rating ? '#d49b00' : 'none'} />
                      ))}
                    </div>
                    {rev.verifiedBuyer && (
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          background: '#e7f3ea',
                          color: '#285934',
                          padding: '3px 9px',
                          borderRadius: '999px'
                        }}
                      >
                        Verified Buyer
                      </span>
                    )}
                  </div>
                  <h3 style={{ margin: 0, fontSize: '16.5px', lineHeight: 1.35, color: '#173b31' }}>
                    {rev.headline}
                  </h3>
                  <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.55, color: '#4a5851', flex: 1 }}>
                    {rev.comment}
                  </p>
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#768178',
                      paddingTop: '8px',
                      borderTop: '1px solid #f0f2ee'
                    }}
                  >
                    <strong>{rev.name}</strong> · {rev.role}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        <section className="honest wrap section-space">
          <div>
            <div className="eyebrow">BUILT BY A CREATOR, FOR THE FIRST STEP</div>
            <h2>
              Useful tools.
              <br />
              <em>Yours to keep.</em>
            </h2>
            <p>
              I’m Hamza Idrishi. I build simple, practical tools and share the experiments behind
              them. Every tool here is a one-time purchase with instant file delivery and no monthly
              subscription.
            </p>
            <a className="text-link" href={social.threads} target="_blank" rel="noreferrer">
              Follow the work on Threads <ArrowUpRight size={16} />
            </a>
          </div>
          <div className="honest-points">
            <div>
              <Download />
              <h3>Instant PDF &amp; HTML downloads.</h3>
              <p>
                Immediately after checkout, download the 7-page Fieldguide PDF or the standalone
                Launchpad Studio HTML file directly to your device.
              </p>
            </div>
            <div>
              <FileText />
              <h3>Works offline &amp; online forever.</h3>
              <p>
                Open your downloaded Launchpad-Studio.html file in any browser on laptop or mobile—it
                auto-saves locally and works 100% offline anytime.
              </p>
            </div>
            <div>
              <ShieldCheck />
              <h3>
                <LocalizedCtaText
                  label="Save $13 with the $12 Bundle (Was $25)."
                  usdPrice={12}
                  productKey="bundle"
                />
              </h3>
              <p>
                <LocalizedCtaText
                  label="Get both the 7-page Idea-to-Income Fieldguide PDF ($5, was $9) and the Launchpad Studio HTML App ($9, was $19) together for a single $12 one-time payment."
                  usdPrice={12}
                  productKey="bundle"
                />
              </p>
            </div>
          </div>
        </section>

        <section className="faq wrap section-space" id="questions">
          <div>
            <div className="eyebrow">A FEW THINGS TO KNOW</div>
            <h2>Before you start.</h2>
            <a className="text-link" href="/support">
              Have another question? <ArrowUpRight size={16} />
            </a>
          </div>
          <div>
            {[
              [
                'How are the Fieldguide ($5), Launchpad Studio ($9), and Bundle ($12) delivered?',
                'Immediately after checkout: the Fieldguide ($5, originally $9) gives you an instant download of Idea-to-Income-Fieldguide.pdf plus online reader access; Launchpad Studio ($9, originally $19) gives you the standalone offline-ready Launchpad-Studio.html app plus online workspace access; and the Complete Creator Bundle ($12, originally $25) unlocks both files immediately.'
              ],
              [
                'What makes Launchpad Studio worth $9 (originally $19)?',
                'Launchpad Studio is a complete 5-stage launch system: 24 niche product blueprints, an interactive 15-Point Idea Conviction Scorecard, a 1-Sentence Offer & Bio Generator, an 8-Mode AI Master Prompt Studio, 30 editable Threads post starters with 1-click Hook & CTA swappers, a Multi-Tier Revenue & Goal Reverse-Calculator, and 1-click Markdown (.md) and JSON backup exports.'
              ],
              [
                'Does Launchpad Studio require an AI subscription or API key?',
                'No API key or subscription is required. Launchpad Studio runs locally in your browser and generates structured, context-rich prompts that you can paste into free Gemini, ChatGPT, or Claude accounts.'
              ],
              [
                'What if I need to re-download my PDF or HTML file later?',
                'You can bookmark your order confirmation page or use your Dodo payment receipt ID anytime—or reach out on the support page with your checkout email and we will send a fresh download link right away.'
              ],
              [
                'What about support and refunds?',
                'If you ever need help downloading your file or using your workspace, use the support page and we will resolve it promptly.'
              ]
            ].map(([q, a]) => (
              <details key={q}>
                <summary>
                  <LocalizedCtaText label={q} usdPrice={12} productKey="bundle" />
                  <Plus size={18} />
                </summary>
                <p>
                  <LocalizedCtaText label={a} usdPrice={12} productKey="bundle" />
                </p>
              </details>
            ))}
          </div>
        </section>

        <section className="closing wrap">
          <div className="eyebrow">YOUR NEXT SMALL STEP</div>
          <h2>
            You don’t have to see
            <br />
            the whole path to <em>begin.</em>
          </h2>
          <p>Start with one person. One problem. One useful thing.</p>
          <CheckoutButton
            product={bundleProduct ? bundleProduct.key : primaryProduct ? primaryProduct.key : 'fieldguide'}
            usdPrice={bundleProduct ? bundleProduct.price : primaryProduct ? primaryProduct.price : 5}
            className="button lime"
          >
            {bundleProduct
              ? bundleProduct.ctaLabel || 'Get Complete Bundle · $12 (Was $25)'
              : primaryProduct
                ? primaryProduct.ctaLabel
                : 'Get the Fieldguide · $5 (Was $9)'}
          </CheckoutButton>
          <span>
            <LocalizedCtaText
              label="Save $13 (52% Off $25) · Instant PDF + HTML Download · "
              usdPrice={bundleProduct ? bundleProduct.price : primaryProduct ? primaryProduct.price : 5}
              productKey={bundleProduct ? bundleProduct.key : primaryProduct ? primaryProduct.key : 'fieldguide'}
            />
            <PriceTag
              usdPrice={bundleProduct ? bundleProduct.price : primaryProduct ? primaryProduct.price : 5}
              productKey={bundleProduct ? bundleProduct.key : primaryProduct ? primaryProduct.key : 'fieldguide'}
              mode="inline"
            />
            .
          </span>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
