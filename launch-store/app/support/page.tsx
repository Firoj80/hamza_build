import Link from 'next/link';
import {
  ArrowUpRight,
  Check,
  CreditCard,
  Download,
  HelpCircle,
  Layers,
  Mail,
  MessageSquare,
  ShieldAlert
} from 'lucide-react';
import SiteHeader from '../site-header';
import SiteFooter from '../site-footer';

export const metadata = { title: 'Support — Hamza Idrishi' };

export default function Page() {
  const email = process.env.SUPPORT_EMAIL;
  return (
    <div className="page-shell">
      <SiteHeader backHref="/" backLabel="Storefront" />
      <main className="editorial-utility-main wrap">
        <section className="utility-hero">
          <div className="eyebrow">
            <span /> HELP &amp; CUSTOMER SUPPORT
          </div>
          <h1>
            Help with your download
            <br />
            or <em>purchase.</em>
          </h1>
          <p className="utility-lead">
            Need a fresh download link for your PDF or HTML file, have a product question, or need
            billing help? Contact the creator directly—every message is reviewed personally.
          </p>
          <div className="utility-hero-actions">
            {email ? (
              <a className="button dark" href={'mailto:' + email}>
                <Mail size={16} /> Email support ({email})
              </a>
            ) : (
              <a
                className="button dark"
                href="https://www.threads.com/@build_hamza"
                target="_blank"
                rel="noreferrer"
              >
                <MessageSquare size={16} /> Contact Hamza on Threads <ArrowUpRight size={16} />
              </a>
            )}
            <Link className="button outline" href="/#tools">
              <Download size={16} /> View products &amp; $12 Bundle
            </Link>
          </div>
        </section>

        <section className="support-cards-grid">
          <article className="support-topic-card">
            <div className="support-card-icon">
              <Download size={20} />
            </div>
            <h2>Need to re-download your file?</h2>
            <p>
              All products are delivered immediately on the confirmation page right after Dodo
              checkout—no account login required. If you closed your tab or switched devices, reopen
              your confirmation link (`?payment_id=pay_...`) or message us with your checkout email
              for an instant download link.
            </p>
            <Link href="/#tools" className="text-link">
              Browse store tools <ArrowUpRight size={14} />
            </Link>
          </article>

          <article className="support-topic-card">
            <div className="support-card-icon">
              <Layers size={20} />
            </div>
            <h2>Using Launchpad Studio (.HTML)</h2>
            <p>
              Your downloaded <code>Launchpad-Studio.html</code> file runs 100% offline in Chrome,
              Safari, Edge, or Firefox and auto-saves your progress in your browser. Use the built-in{' '}
              <strong>Export .JSON Backup</strong> button inside Stage 5 to back up or move your
              project between devices.
            </p>
            <Link href="/products/launchpad-studio" className="text-link">
              View Launchpad Studio details <ArrowUpRight size={14} />
            </Link>
          </article>

          <article className="support-topic-card">
            <div className="support-card-icon">
              <CreditCard size={20} />
            </div>
            <h2>Refunds &amp; Dodo billing</h2>
            <p>
              Explain the issue and provide the email address used at Dodo checkout or your payment
              reference (`pay_...`) so we can review it promptly. Do not pay a second time if your
              first payment is still processing.
            </p>
            <Link href="/terms" className="text-link">
              Read product terms <ArrowUpRight size={14} />
            </Link>
          </article>
        </section>

        <section className="support-checklist-panel">
          <div>
            <div className="eyebrow">
              <HelpCircle size={14} /> FASTER RESOLUTION
            </div>
            <h2>What to include when you reach out</h2>
            <ul className="support-check-items">
              <li>
                <Check size={16} /> The email address you entered during Dodo checkout
              </li>
              <li>
                <Check size={16} /> Which product you purchased (Fieldguide $5, Launchpad Studio $9,
                or Complete Bundle $12)
              </li>
              <li>
                <Check size={16} /> Your purchase date and Dodo payment reference (e.g.{' '}
                <code>pay_...</code>)
              </li>
            </ul>
          </div>
          <div className="support-security-box">
            <div className="support-security-head">
              <ShieldAlert size={18} />
              <strong>Security reminder</strong>
            </div>
            <p>
              Never send full card numbers, passwords, or secret API keys in a support message.
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
