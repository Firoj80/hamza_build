import Link from 'next/link';
import {ArrowRight,FileText} from 'lucide-react';
import SiteHeader from '../site-header';
import SiteFooter from '../site-footer';

export const metadata={title:'Product terms — Hamza Idrishi'};

export default function Page(){
 return (
  <div className="page-shell">
   <SiteHeader backHref="/" backLabel="Storefront"/>
   <main className="editorial-utility-main wrap">
    <div className="legal-layout-grid">
     <aside className="legal-sidebar">
      <div className="eyebrow"><span/> PRODUCT TERMS</div>
      <h1>Your tools.<br/><em>Your account.</em></h1>
      <p className="legal-updated">Updated 21 October 2026</p>
      <div className="legal-summary-box">
       <FileText size={18}/>
       <p>Clear, one-time pricing with account-based browser access and honest expectations.</p>
      </div>
      <nav className="legal-toc" aria-label="Terms sections">
       <a href="#pricing">01 · Products & prices</a>
       <a href="#access">02 · Account access</a>
       <a href="#permitted">03 · Permitted use</a>
       <a href="#limits">04 · Product limits</a>
       <a href="#refunds">05 · Refunds & disputes</a>
      </nav>
     </aside>

     <div className="legal-content-column">
      <section className="legal-section-card" id="pricing">
       <span className="legal-num">01 / PRODUCTS & PRICING</span>
       <h2>Products and prices</h2>
       <p>Idea-to-Income Fieldguide costs USD 5 and provides access to the seven-page guide through your account. Launchpad Studio costs USD 9 for access to the online planner. Each product is a separate one-time purchase. Taxes and any supported currency conversion are shown before you pay.</p>
      </section>

      <section className="legal-section-card" id="access">
       <span className="legal-num">02 / DELIVERY & OWNERSHIP</span>
       <h2>Access</h2>
       <p>Sign in before checkout; after verified payment, open the Fieldguide or Launchpad Studio workspace in your library using the same account. Both products are accessed on this platform, not distributed as a downloadable HTML app, PDF or ZIP. An internet connection and an active account are required.</p>
       <p>A one-time purchase has no recurring product subscription. It does not promise perpetual hosting or future features. If access is interrupted, contact support. Physical books, software packaging and laptops shown in concept imagery are not included.</p>
      </section>

      <section className="legal-section-card" id="permitted">
       <span className="legal-num">03 / LICENSE</span>
       <h2>Permitted use</h2>
       <p>You may use the tools for your own work and adapt your own generated drafts. Do not share account credentials or redistribute the platform or guide as a competing product. You are responsible for verifying facts, customer claims and rights in the content you publish.</p>
      </section>

      <section className="legal-section-card" id="limits">
       <span className="legal-num">04 / HONEST EXPECTATIONS</span>
       <h2>Limits</h2>
       <p>These tools use templates and prepare prompts. They do not run an AI model, verify demand or guarantee earnings, followers or sales. Account checks control access, but no browser-delivered content can be guaranteed copy-proof.</p>
      </section>

      <section className="legal-section-card" id="refunds">
       <span className="legal-num">05 / SUPPORT & REFUNDS</span>
       <h2>Refunds and disputes</h2>
       <p>Contact support with your purchase reference for access problems or refund requests. Eligibility follows the terms disclosed at checkout and applicable consumer rights. Refunded or disputed purchases may have product access revoked. Nothing here excludes statutory rights.</p>
       <p><Link className="text-link" href="/support">Contact support <ArrowRight size={15}/></Link></p>
      </section>
     </div>
    </div>
   </main>
   <SiteFooter/>
  </div>
 );
}
