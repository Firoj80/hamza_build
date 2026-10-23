import Link from 'next/link';
import { ArrowUpRight, Download, LayoutDashboard, LogOut, ShieldCheck } from 'lucide-react';
import BrandMark from './brand-mark';
import { bundle, guide, studio, social } from '@/lib/catalog';
import { currentUser } from '@/lib/supabase/server';
import { isSalesAdmin } from '@/lib/platform-policy.mjs';
import { LocalizedCtaText } from './currency-context';

export default async function SiteFooter() {
  const user = await currentUser();
  const isAdmin = Boolean(user?.email && isSalesAdmin(user.email));

  return (
    <footer className="site-footer-shell">
      <div className="footer wrap">
        <div className="footer-brand-col">
          <BrandMark href="/" className="wordmark" icon />
          <p>
            Small, practical tools for people making their first useful digital product. Direct
            one-time checkout with instant PDF &amp; HTML file delivery—no account signup required.
          </p>
          <div className="footer-trust-pills">
            <span>Pay once · No subscription</span>
            <span>Instant PDF &amp; HTML download</span>
          </div>
        </div>

        <div className="footer-links-grid">
          <div className="footer-col">
            <h4>The Collection</h4>
            <Link href={guide.href}>
              <LocalizedCtaText
                label={`Idea-to-Income Fieldguide · $${guide.price}`}
                usdPrice={guide.price}
                productKey="fieldguide"
              />
            </Link>
            <Link href={studio.href}>
              <LocalizedCtaText
                label={`Launchpad Studio · $${studio.price}`}
                usdPrice={studio.price}
                productKey="studio"
              />
            </Link>
            <Link href={bundle.href}>
              <LocalizedCtaText
                label={`Complete Creator Bundle · $${bundle.price} (Save $2)`}
                usdPrice={bundle.price}
                productKey="bundle"
              />
            </Link>
            <Link href="/#inside">How the workflow fits</Link>
            <Link href="/#questions">Common questions</Link>
          </div>

          <div className="footer-col">
            <h4>Instant Delivery</h4>
            <Link href={guide.href}>
              <Download size={13} /> Fieldguide (.PDF File)
            </Link>
            <Link href={studio.href}>
              <Download size={13} /> Launchpad Studio (.HTML App)
            </Link>
            <Link href={bundle.href}>
              <Download size={13} /> Complete Bundle (PDF + HTML)
            </Link>
            <Link href="/review">Rate &amp; Review a tool</Link>
            <Link href="/support">Lost your download? Get help</Link>
          </div>

          <div className="footer-col">
            <h4>Support &amp; Legal</h4>
            <Link href="/support">Help &amp; Support</Link>
            <Link href="/privacy">Privacy policy</Link>
            <Link href="/terms">Product terms</Link>
            <a href={social.threads} target="_blank" rel="noreferrer">
              Threads <ArrowUpRight size={13} />
            </a>
            {isAdmin ? (
              <>
                <Link href="/sales">
                  <LayoutDashboard size={13} /> Admin Sales Dashboard
                </Link>
                <form action="/auth/logout" method="post" className="footer-logout-form">
                  <button type="submit" className="footer-logout-btn">
                    <LogOut size={13} /> Admin sign out
                  </button>
                </form>
              </>
            ) : (
              <Link href="/login">
                <ShieldCheck size={13} /> Admin portal
              </Link>
            )}
          </div>
        </div>

        <small className="footer-bottom-bar">
          <span>© {new Date().getFullYear()} Hamza Idrishi · Made for the first step.</span>
          <span>Secure instant checkout via Dodo Payments · Direct PDF &amp; HTML delivery</span>
        </small>
      </div>
    </footer>
  );
}
