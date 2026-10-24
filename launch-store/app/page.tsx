import Image from 'next/image';
import {
  ArrowUpRight,
  MousePointer2,
  FileText,
  Layers,
  Compass,
  ShieldCheck,
  Plus,
  Star,
  Download
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
      <SiteHeader />
      <main id="main">
        {/* Gumroad-Style Creator Storefront Header */}
        <header className="gr-storefront-header">
          <div className="wrap gr-storefront-header-inner">
            <div className="gr-storefront-brand">
              <div className="gr-storefront-avatar" aria-hidden="true">
                hi.
              </div>
              <div>
                <h1 className="gr-storefront-title">Digital Products &amp; Creator Tools</h1>
                <p className="gr-storefront-sub">
                  Practical frameworks &amp; offline-ready tools to validate, build, and launch your first digital product.
                </p>
              </div>
            </div>
            <div className="gr-storefront-pill">
              <LocalizedCtaText
                label="Launch Offer: Save up to 53% · Bundle $12 (Was $25)"
                usdPrice={12}
                productKey="bundle"
              />
            </div>
          </div>
        </header>

        {/* Gumroad-Style Product Listing Grid */}
        <section className="wrap gr-catalog-section" id="tools" aria-label="Products">
          <div className="gr-product-grid">
            {catalogProducts.map((item) => {
              const href = `/products/${item.slug}`;
              const isGuideProduct =
                item.key === 'fieldguide' || item.deliveryType === 'fieldguide_reader';
              const isStudioProduct =
                item.key === 'studio' || item.deliveryType === 'studio_workspace';
              const isBundleProduct =
                item.key === 'bundle' || item.deliveryType === 'bundle_both';

              const cardDisplayTitle = isGuideProduct
                ? `${item.name}: 7-Page Validation & First Launch Guide (PDF)`
                : isStudioProduct
                  ? `${item.name}: 5-Stage Interactive Launch System (HTML App)`
                  : isBundleProduct
                    ? `${item.name}: Fieldguide PDF + Launchpad Studio HTML App`
                    : `${item.name}: ${item.headline}`;

              const thumbTag = isBundleProduct
                ? '2-IN-1 BUNDLE'
                : isStudioProduct
                  ? 'HTML APP'
                  : isGuideProduct
                    ? '7-PAGE PDF'
                    : 'DIGITAL TOOL';

              const saveBadge =
                item.compareAtPrice && item.compareAtPrice > item.price
                  ? `SAVE ${Math.round(((item.compareAtPrice - item.price) / item.compareAtPrice) * 100)}%`
                  : null;

              return (
                <article className="gr-product-card" key={item.key}>
                  <Link
                    href={href}
                    className="gr-card-thumb"
                    aria-label={`Open ${item.name} product page`}
                  >
                    <span className="gr-thumb-tag">{thumbTag}</span>
                    {saveBadge && <span className="gr-thumb-save">{saveBadge}</span>}
                    <Image
                      src={item.image}
                      alt={item.imageAlt}
                      width={1200}
                      height={1200}
                      unoptimized
                      priority
                    />
                  </Link>

                  <div className="gr-card-body">
                    <div>
                      <Link href={href} className="gr-card-title-link">
                        <h2 className="gr-card-title">{cardDisplayTitle}</h2>
                      </Link>
                      <p className="gr-card-subtitle">
                        <LocalizedCtaText
                          label={item.shortDescription || item.description}
                          usdPrice={item.price}
                          productKey={item.key}
                        />
                      </p>
                    </div>
                  </div>

                  <div className="gr-card-footer">
                    <Link
                      href={href}
                      className="gr-card-price-link"
                      aria-label={`View ${item.name} details and pricing`}
                    >
                      <PriceTag
                        usdPrice={item.price}
                        productKey={item.key}
                        usdCompareAtPrice={item.compareAtPrice}
                        mode="gumroad-ribbon"
                      />
                    </Link>
                  </div>
                </article>
              );
            })}
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
                <div className="eyebrow">VERIFIED CREATOR REVIEWS · ★ {avgRating} / 5.0 RATING</div>
                <h2>
                  Trusted by early creators
                  <br />
                  shipping their <em>first product.</em>
                </h2>
              </div>
              <div>
                <p style={{ marginBottom: '10px' }}>
                  <LocalizedCtaText
                    label="Honest feedback from builders who used the $5 Fieldguide PDF, $9 Launchpad Studio HTML app, and $12 Complete Bundle."
                    usdPrice={12}
                    productKey="bundle"
                  />
                </p>
                <Link className="text-link" href="/review">
                  Purchased a tool? Leave a rating &amp; review <ArrowUpRight size={16} />
                </Link>
              </div>
            </div>
            <div className="reviews-grid">
              {publishedReviews.slice(0, 3).map((rev) => (
                <article key={rev.id} className="review-card">
                  <div className="review-card-top">
                    <div className="review-stars" aria-label={`${rev.rating} out of 5 stars`}>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} size={15} fill={i < rev.rating ? '#d49b00' : 'none'} />
                      ))}
                    </div>
                    {rev.verifiedBuyer && (
                      <span className="review-verified-badge">Verified Buyer</span>
                    )}
                  </div>
                  <h3 className="review-headline">
                    <LocalizedCtaText
                      label={rev.headline}
                      usdPrice={rev.productKey === 'both' ? 12 : rev.productKey === 'studio' ? 9 : 5}
                      productKey={rev.productKey === 'both' ? 'bundle' : rev.productKey}
                    />
                  </h3>
                  <p className="review-comment">
                    <LocalizedCtaText
                      label={rev.comment}
                      usdPrice={rev.productKey === 'both' ? 12 : rev.productKey === 'studio' ? 9 : 5}
                      productKey={rev.productKey === 'both' ? 'bundle' : rev.productKey}
                    />
                  </p>
                  <div className="review-author-footer">
                    <strong>{rev.name}</strong>
                    <span>
                      <LocalizedCtaText
                        label={rev.role}
                        usdPrice={rev.productKey === 'both' ? 12 : rev.productKey === 'studio' ? 9 : 5}
                        productKey={rev.productKey === 'both' ? 'bundle' : rev.productKey}
                      />
                    </span>
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
