import Link from 'next/link';
import {ArrowRight,Lock,ShieldCheck} from 'lucide-react';
import SiteHeader from '../site-header';
import SiteFooter from '../site-footer';

export const metadata={title:'Privacy — Hamza Idrishi'};

export default function Page(){
 return (
  <div className="page-shell">
   <SiteHeader backHref="/" backLabel="Storefront"/>
   <main className="editorial-utility-main wrap">
    <div className="legal-layout-grid">
     <aside className="legal-sidebar">
      <div className="eyebrow"><span/> PRIVACY POLICY</div>
      <h1>Privacy, in<br/><em>plain English.</em></h1>
      <p className="legal-updated">Updated 20 October 2026</p>
      <div className="legal-summary-box">
       <ShieldCheck size={18}/>
       <p>We store only what is required to run your account, verify purchases, and save your workspace notes.</p>
      </div>
      <nav className="legal-toc" aria-label="Privacy sections">
       <a href="#account">01 · Your account</a>
       <a href="#payments">02 · Payments</a>
       <a href="#analytics">03 · Usage analytics</a>
       <a href="#sessions">04 · Sessions & hosting</a>
       <a href="#workspace">05 · Your workspace</a>
       <a href="#contact">06 · Contact & deletion</a>
      </nav>
     </aside>

     <div className="legal-content-column">
      <section className="legal-section-card" id="account">
       <span className="legal-num">01 / ACCOUNT & AUTHENTICATION</span>
       <h2>Your account</h2>
       <p>Supabase provides account authentication and database storage. We store your email account identifier, purchase access records and the workspace notes you choose to save. Your notes are restricted to your account using database ownership policies.</p>
       <p>Supabase Auth securely manages email/password sign-in. Passwords are not stored in workspace notes or purchase records. Password recovery uses an email link.</p>
      </section>

      <section className="legal-section-card" id="payments">
       <span className="legal-num">02 / CHECKOUT & BILLING</span>
       <h2>Payments</h2>
       <p>Dodo Payments hosts checkout and processes payment information. We associate a server-created checkout with your account, verify payment status and store the product, payment reference and access status. This site does not collect card information.</p>
      </section>

      <section className="legal-section-card" id="analytics">
       <span className="legal-num">03 / PRIVACY-PRESERVING METRICS</span>
       <h2>Usage analytics</h2>
       <p>We count visits to the landing page, product pages and online tools to understand overall interest. The server turns the request IP address and browser user-agent into a keyed, one-way identifier that is deduplicated by day and stores only that identifier, the page path and date. We do not store raw IP addresses or user-agent strings in the analytics table. If PostHog is configured, it also receives anonymous page-view, product-view and checkout-attempt events; automatic form/click capture and session replay are disabled. Counts are approximate and used for basic product analytics.</p>
      </section>

      <section className="legal-section-card" id="sessions">
       <span className="legal-num">04 / INFRASTRUCTURE</span>
       <h2>Sessions and hosting</h2>
       <p>Essential authentication cookies keep you signed in. The hosting provider may process normal request information to operate the website.</p>
      </section>

      <section className="legal-section-card" id="workspace">
       <span className="legal-num">05 / CLOUD STORAGE & AI BOUNDARIES</span>
       <h2>Your workspace</h2>
       <p>Launchpad Studio is an online service. Your edits are sent to the platform and saved to your account. AI prompts are prepared here but no AI model runs in the workspace. If you paste content into an external AI service, that service&apos;s policies apply.</p>
      </section>

      <section className="legal-section-card" id="contact">
       <span className="legal-num">06 / YOUR RIGHTS</span>
       <h2>Contact and deletion requests</h2>
       <p>Contact support for questions about your account or to request access, correction or deletion of personal data. Purchase records may need to be retained to meet legal obligations.</p>
       <p><Link className="text-link" href="/support">Contact support <ArrowRight size={15}/></Link></p>
      </section>
     </div>
    </div>
   </main>
   <SiteFooter/>
  </div>
 );
}
