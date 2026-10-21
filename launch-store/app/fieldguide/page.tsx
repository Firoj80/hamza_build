import Link from 'next/link';
import {ArrowLeft,ArrowUpRight,BookOpen,Layers,LogOut,ShieldCheck} from 'lucide-react';
import {requireProduct} from '@/lib/access';
import BrandMark from '@/app/brand-mark';
import SiteFooter from '@/app/site-footer';

export const dynamic='force-dynamic';
export const metadata={title:'Idea-to-Income Fieldguide — Your library',robots:{index:false,follow:false}};

export default async function Fieldguide(){
 await requireProduct('fieldguide');
 return (
  <div className="page-shell">
   <header className="smart-header-shell">
    <div className="site-header wrap">
     <div className="header-brand-group">
      <BrandMark href="/" className="wordmark" icon/>
      <Link href="/library" className="header-back-pill">
       <ArrowLeft size={14}/> Back to library
      </Link>
     </div>
     <div className="header-auth-actions">
      <Link href="/studio" className="header-btn header-btn-ghost">
       <Layers size={15}/> Launchpad Studio
      </Link>
      <form action="/auth/logout" method="post" className="header-logout-form">
       <button type="submit" className="header-btn header-btn-outline">
        <LogOut size={15}/> Sign out
       </button>
      </form>
     </div>
    </div>
   </header>

   <main className="fieldguide-reader-shell wrap">
    <div className="reader-header-card">
     <div>
      <div className="eyebrow"><span/> IDEA-TO-INCOME FIELDGUIDE · ACCOUNT READER</div>
      <h1>One problem.<br/>One useful <em>first version.</em></h1>
      <p>Your seven-page practical fieldguide. Read through the validation questions and worksheet below, or step into Launchpad Studio ($9) when you want an interactive online workspace.</p>
     </div>
     <div className="reader-companion-box">
      <span>NEXT STEP COMPANION</span>
      <strong>Launchpad Studio</strong>
      <p>Turn your chosen problem into 30 post starters, listing drafts, and a saved launch checklist.</p>
      <Link href="/products/launchpad-studio" className="text-link">
       Explore Launchpad Studio <ArrowUpRight size={15}/>
      </Link>
     </div>
    </div>

    <div className="reader-frame-container">
     <div className="reader-frame-bar">
      <span><BookOpen size={14}/> IDEA-TO-INCOME FIELDGUIDE (7 PAGES)</span>
      <span>PROTECTED ACCOUNT VIEW</span>
     </div>
     <iframe className="guide-reader" title="Idea-to-Income Fieldguide reader" src="/api/fieldguide#toolbar=0"/>
    </div>

    <div className="reader-footer-note">
     <ShieldCheck size={16}/>
     <span>This is an account-protected reader. Like all browser content, it cannot be made completely copy-proof.</span>
    </div>
   </main>

   <SiteFooter/>
  </div>
 );
}
