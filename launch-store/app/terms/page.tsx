import Link from 'next/link';
import { ArrowRight, FileText } from 'lucide-react';
import SiteHeader from '../site-header';
import SiteFooter from '../site-footer';
import { LocalizedCtaText } from '../currency-context';

export const metadata = { title: 'Product terms — Hamza Idrishi' };

export default function Page() {
  return (
    <div className="page-shell">
      <SiteHeader backHref="/" backLabel="Storefront" />
      <main className="editorial-utility-main wrap">
        <div className="legal-layout-grid">
          <aside className="legal-sidebar">
            <div className="eyebrow">
              <span /> PRODUCT TERMS
            </div>
            <h1>
              Your tools.
              <br />
              <em>Yours to keep.</em>
            </h1>
            <p className="legal-updated">Updated October 2026</p>
            <div className="legal-summary-box">
              <FileText size={18} />
              <p>
                One-time pricing with instant PDF &amp; HTML file delivery and clear expectations.
              </p>
            </div>
            <nav className="legal-toc" aria-label="Terms sections">
              <a href="#pricing">01 · Products &amp; prices</a>
              <a href="#access">02 · Instant file delivery</a>
              <a href="#permitted">03 · Permitted use</a>
              <a href="#limits">04 · Product limits</a>
              <a href="#refunds">05 · Refunds &amp; disputes</a>
            </nav>
          </aside>

          <div className="legal-content-column">
            <section className="legal-section-card" id="pricing">
              <span className="legal-num">01 / PRODUCTS &amp; PRICING</span>
              <h2>Products and launch prices</h2>
              <p>
                <LocalizedCtaText
                  label="Idea-to-Income Fieldguide is available at a launch price of $5 (originally $9) and includes the 7-page downloadable PDF plus online reader access. Launchpad Studio is available at a launch price of $9 (originally $19) and includes the standalone downloadable HTML application plus online workspace access. The Complete Creator Launch Bundle is available for $12 (originally $25) and includes both the Fieldguide PDF and Launchpad Studio HTML application."
                  usdPrice={12}
                  productKey="bundle"
                />
              </p>
              <p>
                Every product is a one-time payment with no recurring subscription. Applicable taxes
                and local currency equivalents are displayed before payment completion on Dodo
                Payments.
              </p>
            </section>

            <section className="legal-section-card" id="access">
              <span className="legal-num">02 / DELIVERY &amp; OWNERSHIP</span>
              <h2>Instant file delivery</h2>
              <p>
                No account creation or login is required to purchase or download your files. Right
                after your Dodo payment is verified, the order confirmation screen unlocks instant
                downloads for your purchased files (<code>Idea-to-Income-Fieldguide.pdf</code>{' '}
                and/or <code>Launchpad-Studio.html</code>) along with browser reader/workspace
                access.
              </p>
              <p>
                We recommend saving your downloaded PDF and HTML files directly to your device and
                bookmarking your confirmation link. If you ever lose your file or switch devices,
                contact support with your checkout email or payment reference for a fresh download
                link.
              </p>
            </section>

            <section className="legal-section-card" id="permitted">
              <span className="legal-num">03 / LICENSE</span>
              <h2>Permitted use</h2>
              <p>
                You receive a personal, commercial-ready license to use the templates, prompts,
                scorecards, and HTML workspace to plan, create, and launch your own products. Do not
                resell, redistribute, or republish the raw Fieldguide PDF or Launchpad Studio HTML
                application file itself as a competing template or software product.
              </p>
            </section>

            <section className="legal-section-card" id="limits">
              <span className="legal-num">04 / HONEST EXPECTATIONS</span>
              <h2>Limits</h2>
              <p>
                These tools provide structured validation frameworks, niche blueprints, AI prompt
                builders, post starters, and financial scenario calculators. They do not require an
                AI API key, run an automated AI model on your behalf, or guarantee specific revenue
                or sales outcomes.
              </p>
            </section>

            <section className="legal-section-card" id="refunds">
              <span className="legal-num">05 / SUPPORT &amp; REFUNDS</span>
              <h2>Refunds and disputes</h2>
              <p>
                Contact support with your checkout email or Dodo payment reference (
                <code>pay_...</code>) for download help or billing inquiries. Refunded or disputed
                transactions have their download tokens revoked automatically.
              </p>
              <p>
                <Link className="text-link" href="/support">
                  Contact support <ArrowRight size={15} />
                </Link>
              </p>
            </section>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
