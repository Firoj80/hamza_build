import Link from 'next/link';
import {ArrowUpRight} from 'lucide-react';
import BrandMark from './brand-mark';
import {guide,studio,social} from '@/lib/catalog';

export default function SiteFooter(){
 return (
  <footer className="site-footer-shell">
   <div className="footer wrap">
    <div className="footer-brand-col">
     <BrandMark href="/" className="wordmark" icon/>
     <p>Small, practical tools for people making their first useful digital product. One-time purchases with private account access.</p>
     <div className="footer-trust-pills">
      <span>Pay once · No subscription</span>
      <span>Account-protected library</span>
     </div>
    </div>

    <div className="footer-links-grid">
     <div className="footer-col">
      <h4>The Collection</h4>
      <Link href={guide.href}>Idea-to-Income Fieldguide · $5</Link>
      <Link href={studio.href}>Launchpad Studio · $9</Link>
      <Link href="/#inside">How the workflow fits</Link>
      <Link href="/#questions">Common questions</Link>
     </div>

     <div className="footer-col">
      <h4>Your Account</h4>
      <Link href="/login?mode=login">Sign in</Link>
      <Link href="/login?mode=signup">Create account</Link>
      <Link href="/library">My library</Link>
      <Link href="/account/password">Password settings</Link>
     </div>

     <div className="footer-col">
      <h4>Support & Legal</h4>
      <Link href="/support">Help & Support</Link>
      <Link href="/privacy">Privacy policy</Link>
      <Link href="/terms">Product terms</Link>
      <Link href="/sales">Sales dashboard</Link>
      <a href={social.threads} target="_blank" rel="noreferrer">Threads <ArrowUpRight size={13}/></a>
     </div>
    </div>

    <small className="footer-bottom-bar">
     <span>© {new Date().getFullYear()} Hamza Idrishi · Made for the first step.</span>
     <span>Secure checkout via Dodo Payments · Account auth via Supabase</span>
    </small>
   </div>
  </footer>
 );
}
