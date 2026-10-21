import Link from 'next/link';
import {ArrowUpRight,BookOpen,Check,CreditCard,HelpCircle,KeyRound,Layers,Mail,MessageSquare,ShieldAlert} from 'lucide-react';
import SiteHeader from '../site-header';
import SiteFooter from '../site-footer';

export const metadata={title:'Support — Hamza Idrishi'};

export default function Page(){
 const email=process.env.SUPPORT_EMAIL;
 return (
  <div className="page-shell">
   <SiteHeader backHref="/" backLabel="Storefront"/>
   <main className="editorial-utility-main wrap">
    <section className="utility-hero">
     <div className="eyebrow"><span/> HELP & CUSTOMER SUPPORT</div>
     <h1>Help with your account<br/>or <em>purchase.</em></h1>
     <p className="utility-lead">
      For a sign-in issue, product question, or refund request, contact the creator directly. We review every support message personally.
     </p>
     <div className="utility-hero-actions">
      {email ? (
       <a className="button dark" href={'mailto:'+email}>
        <Mail size={16}/> Email support ({email})
       </a>
      ) : (
       <a className="button dark" href="https://www.threads.com/@build_hamza" target="_blank" rel="noreferrer">
        <MessageSquare size={16}/> Contact Hamza on Threads <ArrowUpRight size={16}/>
       </a>
      )}
      <Link className="button outline" href="/library">
       <BookOpen size={16}/> Open my library
      </Link>
      <Link className="button outline" href="/login?mode=login">
       <KeyRound size={16}/> Sign in / Reset password
      </Link>
     </div>
    </section>

    <section className="support-cards-grid">
     <article className="support-topic-card">
      <div className="support-card-icon"><BookOpen size={20}/></div>
      <h2>Access not showing?</h2>
      <p>
       Sign in using the exact same email account you used before checkout, then open your library. If you have just paid, return to the payment confirmation page and allow a moment for server verification. A successful-looking URL alone does not grant access.
      </p>
      <Link href="/library" className="text-link">Check your library <ArrowUpRight size={14}/></Link>
     </article>

     <article className="support-topic-card">
      <div className="support-card-icon"><Layers size={20}/></div>
      <h2>Workspace changes</h2>
      <p>
       Launchpad Studio saves directly to your account while you are online. Wait for the saved confirmation badge before closing the page. If saving fails, keep the page open and check your connection or sign in again.
      </p>
      <Link href="/studio" className="text-link">Open Launchpad Studio <ArrowUpRight size={14}/></Link>
     </article>

     <article className="support-topic-card">
      <div className="support-card-icon"><CreditCard size={20}/></div>
      <h2>Refunds & billing</h2>
      <p>
       Explain the issue and provide your Dodo payment reference so we can review it under the checkout terms and applicable consumer rights. Do not pay a second time if your first payment is still processing.
      </p>
      <Link href="/terms" className="text-link">Read product terms <ArrowUpRight size={14}/></Link>
     </article>
    </section>

    <section className="support-checklist-panel">
     <div>
      <div className="eyebrow"><HelpCircle size={14}/> FASTER RESOLUTION</div>
      <h2>What to include when you reach out</h2>
      <ul className="support-check-items">
       <li><Check size={16}/> The email address used for your platform account</li>
       <li><Check size={16}/> Which product you purchased (Fieldguide $5 or Launchpad Studio $9)</li>
       <li><Check size={16}/> Your purchase date and Dodo payment reference (e.g. <code>pay_...</code>)</li>
      </ul>
     </div>
     <div className="support-security-box">
      <div className="support-security-head">
       <ShieldAlert size={18}/>
       <strong>Security reminder</strong>
      </div>
      <p>Never send full card numbers, account passwords, secret API keys, or one-time password reset links in a support message.</p>
     </div>
    </section>
   </main>
   <SiteFooter/>
  </div>
 );
}
