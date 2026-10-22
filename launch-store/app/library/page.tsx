import Link from 'next/link';
import Image from 'next/image';
import {ArrowUpRight,BookOpen,Check,CheckCircle2,HelpCircle,KeyRound,Layers,Lock,LogOut,ShieldCheck,Store} from 'lucide-react';
import {ownedProducts} from '@/lib/access';
import {isSalesAdmin} from '@/lib/platform-policy.mjs';
import {redirect} from 'next/navigation';
import CheckoutButton from '../checkout-button';
import BrandMark from '../brand-mark';
import SiteFooter from '../site-footer';

export const dynamic='force-dynamic';
export const metadata={title:'Your library — Hamza Idrishi',robots:{index:false,follow:false}};

export default async function Library({searchParams}:{searchParams?:Promise<Record<string,string|string[]|undefined>>}){
 const {user,products}=await ownedProducts();
 if(!user)redirect('/login?next=/library');
 const isAdmin=Boolean(user.email&&isSalesAdmin(user.email));
 const params=searchParams?await searchParams:{};
 const rawBuy=typeof params?.buy==='string'?params.buy:'';
 const pendingBuyProduct=rawBuy==='fieldguide'||rawBuy==='studio'?rawBuy:null;
 const shouldAutoCheckout=Boolean(pendingBuyProduct&&!products.includes(pendingBuyProduct));

 const catalog=[
  {
   key:'fieldguide' as const,
   name:'Idea-to-Income Fieldguide',
   price:5,
   path:'/fieldguide',
   detailPath:'/products/first-product-fieldguide',
   image:'/images/idea-to-income-fieldguide-cover.svg',
   imageAlt:'Idea-to-Income Fieldguide hardcover monograph and validation scorecard cover',
   tag:'01 / THE FOUNDATION',
   text:'A seven-page guide to choosing a useful problem, checking demand, and planning your first launch.',
   highlights:[
    'Five customer-research questions & validation scorecard',
    'Worked example and printable/fillable idea worksheet',
    'AI prompt templates and first-version launch checklist'
   ]
  },
  {
   key:'studio' as const,
   name:'Launchpad Studio',
   price:9,
   path:'/studio',
   detailPath:'/products/launchpad-studio',
   image:'/images/launchpad-studio-cover.svg',
   imageAlt:'Launchpad Studio 5-stage online workspace cover showcase',
   tag:'02 / THE WORKSPACE',
   text:'Your online workspace for prompts, product drafts, 30 post starters, and cloud-saved launch progress.',
   highlights:[
    'Interactive 5-step launch planner saved to your account',
    '30 editable content & announcement post starters',
    'Listing draft builder and realistic revenue scenario calculator'
   ]
  }
 ];
 const selectedCatalogItem=shouldAutoCheckout?catalog.find(c=>c.key===pendingBuyProduct):null;

 return (
  <div className="page-shell">
   <header className="smart-header-shell">
    <div className="site-header wrap">
     <div className="header-brand-group">
      <BrandMark href="/" className="wordmark" icon/>
     </div>
     <div className="header-auth-actions">
      <Link href="/" className="header-btn header-btn-ghost">
       <Store size={15}/> Storefront
      </Link>
      <Link href="/account/password" className="header-btn header-btn-ghost">
       <KeyRound size={15}/> Password
      </Link>
      {isAdmin && (
       <Link href="/sales" className="header-btn header-btn-outline">
        Sales dashboard
       </Link>
      )}
      <form action="/auth/logout" method="post" className="header-logout-form">
       <button type="submit" className="header-btn header-btn-outline">
        <LogOut size={15}/> Sign out
       </button>
      </form>
     </div>
    </div>
   </header>

   <main className="platform-library wrap">
    {selectedCatalogItem && (
     <section className="order-box" style={{marginBottom:'24px',border:'2px solid #173b31',background:'#f4f8f2',display:'flex',alignItems:'center',justifyContent:'space-between',gap:'18px',flexWrap:'wrap'}}>
      <div>
       <div className="eyebrow" style={{marginBottom:'6px'}}><span/> STEP 2 OF 2 · ACCOUNT CONNECTED</div>
       <h2 style={{margin:'0 0 6px',fontSize:'clamp(20px,2.4vw,26px)'}}>Continuing to your {selectedCatalogItem.name} (${selectedCatalogItem.price}) checkout…</h2>
       <p style={{margin:0,color:'#4a5851',fontSize:'14px'}}>Your account (<strong>{user.email}</strong>) is ready. If Dodo checkout does not open automatically in a moment, click the button to continue.</p>
      </div>
      <CheckoutButton product={selectedCatalogItem.key} autoStart className="button dark">
       Continue to ${selectedCatalogItem.price} checkout
      </CheckoutButton>
     </section>
    )}
    <section className="library-hero-banner">
     <div>
      <div className="eyebrow"><span/> YOUR PERSONAL LIBRARY</div>
      <h1>A clearer place<br/>to make <em>your next move.</em></h1>
      <p>Signed in as <strong>{user.email}</strong>. Your purchased guide and workspace stay together here.</p>
     </div>
     <div className="library-summary-card">
      <div className="library-summary-stat">
       <span>UNLOCKED TOOLS</span>
       <strong>{products.length} / 2</strong>
      </div>
      <div className="library-summary-links">
       <Link href="/account/password"><KeyRound size={14}/> Update password</Link>
       <Link href="/support"><HelpCircle size={14}/> Account & purchase help</Link>
      </div>
     </div>
    </section>

    <div className="library-grid">
     {catalog.map(p=>{
      const unlocked=products.includes(p.key);
      return (
       <article className={`order-box library-product-card ${unlocked?'is-unlocked':'is-locked'}`} key={p.key}>
        <Link href={unlocked ? p.path : p.detailPath} className="library-card-cover" aria-label={p.name}>
         <Image src={p.image} alt={p.imageAlt} width={1600} height={1100} unoptimized/>
        </Link>
        <div className="library-card-top">
         <span className="library-card-tag">{p.tag}</span>
         {unlocked ? (
          <span className="library-status-pill unlocked">
           <CheckCircle2 size={14}/> IN YOUR LIBRARY
          </span>
         ) : (
          <span className="library-status-pill locked">
           <Lock size={13}/> ONE-TIME PURCHASE · ${p.price} USD
          </span>
         )}
        </div>

        <h2>{p.name}</h2>
        <p>{p.text}</p>

        <ul className="library-feature-list">
         {p.highlights.map(item=>(
          <li key={item}><Check size={15}/> {item}</li>
         ))}
        </ul>

        <div className="library-card-actions">
         {unlocked ? (
          <Link className="button dark" href={p.path}>
           <span>{p.key==='studio'?'Open Launchpad Studio':'Open Fieldguide Reader'}</span>
           <ArrowUpRight size={17}/>
          </Link>
         ) : (
          <>
           <CheckoutButton product={p.key} className="button dark">
            Unlock {p.name} · ${p.price}
           </CheckoutButton>
           <Link href={p.detailPath} className="library-detail-link">
            Preview what’s inside first <ArrowUpRight size={14}/>
          </Link>
          </>
         )}
        </div>
       </article>
      );
     })}
    </div>

    <section className="library-help-strip">
     <div className="library-help-copy">
      <ShieldCheck size={20}/>
      <div>
       <strong>Idea-to-Income Fieldguide ($5) and Launchpad Studio ($9) are separate one-time purchases linked to your account.</strong>
       <p>Just completed a purchase? Server verification unlocks your product automatically within moments.</p>
      </div>
     </div>
     <div className="library-help-actions">
      <Link href="/support" className="button outline">Need help with an order?</Link>
     </div>
    </section>
   </main>

   <SiteFooter/>
  </div>
 );
}
