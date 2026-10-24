import Link from 'next/link';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import SiteHeader from '../site-header';
import SiteFooter from '../site-footer';

export const metadata = { title: 'Privacy — Hamza Idrishi' };

export default function Page() {
  return (
    <div className="page-shell">
      <SiteHeader backHref="/" backLabel="Storefront" />
      <main className="editorial-utility-main wrap">
        <div className="legal-layout-grid">
          <aside className="legal-sidebar">
            <div className="eyebrow">
              <span /> PRIVACY POLICY
            </div>
            <h1>
              Privacy, in
              <br />
              <em>plain English.</em>
            </h1>
            <p className="legal-updated">Updated October 2026</p>
            <div className="legal-summary-box">
              <ShieldCheck size={18} />
              <p>
                We collect only what is needed to verify your Dodo checkout and deliver your
                downloaded PDF and HTML tools.
              </p>
            </div>
            <nav className="legal-toc" aria-label="Privacy sections">
              <a href="#checkout">01 · Checkout &amp; delivery</a>
              <a href="#payments">02 · Payment processing</a>
              <a href="#workspace">03 · Offline HTML app &amp; storage</a>
              <a href="#analytics">04 · Usage analytics</a>
              <a href="#contact">05 · Contact &amp; deletion</a>
            </nav>
          </aside>

          <div className="legal-content-column">
            <section className="legal-section-card" id="checkout">
              <span className="legal-num">01 / CHECKOUT &amp; FILE DELIVERY</span>
              <h2>Direct checkout without forced accounts</h2>
              <p>
                Buyers can purchase and download the Idea-to-Income Fieldguide PDF, Launchpad Studio
                HTML app, and Complete Creator Launch Bundle directly without creating a password or
                user account. We store your checkout email, product key, and payment reference so we
                can verify your purchase and provide download access or customer support.
              </p>
            </section>

            <section className="legal-section-card" id="payments">
              <span className="legal-num">02 / CHECKOUT &amp; BILLING</span>
              <h2>Payments</h2>
              <p>
                Dodo Payments hosts checkout and processes payment details securely. We verify
                payment status with Dodo Payments and store the purchased product, payment
                identifier, and fulfillment status. This storefront never collects or stores your
                credit card numbers.
              </p>
            </section>

            <section className="legal-section-card" id="workspace">
              <span className="legal-num">03 / LOCAL STORAGE &amp; AI BOUNDARIES</span>
              <h2>Your downloaded HTML workspace</h2>
              <p>
                When you use the downloaded <code>Launchpad-Studio.html</code> application on your
                device, your notes, scorecards, and post drafts save locally inside your own
                browser&apos;s storage (<code>localStorage</code>) and in any Markdown or JSON backup
                files you export. If you copy generated prompts into an external AI service (such as
                ChatGPT, Claude, or Gemini), that service&apos;s privacy policy applies.
              </p>
            </section>

            <section className="legal-section-card" id="analytics">
              <span className="legal-num">04 / PRIVACY-PRESERVING METRICS</span>
              <h2>Usage analytics</h2>
              <p>
                We count aggregate visits to the storefront and product pages to understand overall
                interest. The server converts the request IP and user-agent into a keyed, one-way
                daily hash and does not store raw IP addresses in the analytics table.
              </p>
            </section>

            <section className="legal-section-card" id="contact">
              <span className="legal-num">05 / YOUR RIGHTS</span>
              <h2>Contact and deletion requests</h2>
              <p>
                Contact support anytime for questions about your purchase data or to request
                correction or deletion of personal information. Tax and billing records may be
                retained as required by applicable law.
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
