import Image from 'next/image';
import {ArrowUpRight,ArrowRight,BookOpen,Check,MousePointer2,FileText,Layers,Compass,ShieldCheck,Plus,LogIn,UserPlus,Star} from 'lucide-react';
import StudioPreview from './studio-preview';
import Link from 'next/link';
import {social} from '@/lib/catalog';
import CheckoutButton from './checkout-button';
import SiteHeader from './site-header';
import SiteFooter from './site-footer';
import {currentUser} from '@/lib/supabase/server';
import {loadEmailStudioState} from '@/lib/email-reviews-store';
import {getActiveCatalogProducts} from '@/lib/product-store';
import {PriceTag,LocalizedCtaText} from './currency-context';

export const dynamic = 'force-dynamic';

export default async function Home(){
 const [user,emailState,catalogProducts]=await Promise.all([
  currentUser(),
  loadEmailStudioState(),
  getActiveCatalogProducts()
 ]);
 const publishedReviews=emailState.reviews.filter(r=>r.published).slice(0,6);
 const avgRating=publishedReviews.length>0?(publishedReviews.reduce((s,r)=>s+r.rating,0)/publishedReviews.length).toFixed(1):'5.0';
 const primaryProduct=catalogProducts.find(p=>p.key==='fieldguide')||catalogProducts[0];
 return <>
  <a className="skip-link" href="#main">Skip to content</a>
  <div className="announcement">
   <span>A small first step can become something useful.</span>
   <a href="#tools">
    <LocalizedCtaText
     label={primaryProduct?`${primaryProduct.ctaLabel||`Get ${primaryProduct.name} · $${primaryProduct.price}`}`:'Get the Fieldguide · $5'}
     usdPrice={primaryProduct?primaryProduct.price:5}
     productKey={primaryProduct?primaryProduct.key:'fieldguide'}
    /> <ArrowRight size={13}/>
   </a>
  </div>
  <SiteHeader/>
  <main id="main">
   <section className="hero wrap">
    <div className="hero-copy">
     <div className="eyebrow"><span/> SMALL TOOLS. REAL PROGRESS.</div>
     <h1>Your first product.<br/>A clearer <em>way<br className="desktop-break"/> forward.</em></h1>
     <p>You don’t need another big idea.<br/>You need a small, useful one—and a plan to bring it to life.</p>
     <div className="hero-actions">
      <CheckoutButton product={primaryProduct?primaryProduct.key:'fieldguide'} usdPrice={primaryProduct?primaryProduct.price:5} className="button dark">
       {primaryProduct?primaryProduct.ctaLabel:`Get the Fieldguide · $5`}
      </CheckoutButton>
      <a className="text-link" href="#tools">Explore the tools <ArrowRight size={16}/></a>
     </div>
     <div className="hero-fine">
      <Check size={14}/> Made for first-time creators <span>·</span> No income promises
     </div>
     <div className="hero-account-bar">
      {user ? (
       <>
        <span className="hero-account-status">Signed in as <strong>{user.email}</strong></span>
        <Link href="/library" className="hero-account-link">
         <BookOpen size={14}/> Open my library <ArrowUpRight size={14}/>
        </Link>
       </>
      ) : (
       <>
        <span className="hero-account-status">Already have an account or ready to start?</span>
        <div className="hero-account-links">
         <Link href="/login?mode=login" className="hero-account-link">
          <LogIn size={14}/> Sign in
         </Link>
         <span>·</span>
         <Link href="/login?mode=signup" className="hero-account-link">
          <UserPlus size={14}/> Create account
         </Link>
        </div>
       </>
      )}
     </div>
    </div>
    <div className="hero-visual">
     <div className="image-label"><span className="mini-dot"/> FROM YOUR FIRST IDEA TO YOUR FIRST LAUNCH</div>
     <div className="hero-cover-frame">
      <Image src={primaryProduct?primaryProduct.image:'/images/idea-to-income-fieldguide-cover.svg'} alt={primaryProduct?primaryProduct.imageAlt:'Idea-to-Income Fieldguide hardcover monograph concept and customer validation scorecard sheet'} width={1600} height={1100} unoptimized priority/>
     </div>
     <div className="visual-caption"><span>01 / {primaryProduct?primaryProduct.name.toUpperCase():'IDEA-TO-INCOME FIELDGUIDE'}</span><span>ACCOUNT ACCESS · NOT A PHYSICAL BOOK</span></div>
     <div className="floating-note"><span className="note-star">✳</span><div>A little less overthinking.<br/><b>A little more making.</b></div></div>
    </div>
   </section>

   <div className="principles wrap">
    <span>Built around what matters.</span>
    <p><Compass size={17}/> Validate before you build</p>
    <p><FileText size={17}/> Show useful work</p>
    <p><Layers size={17}/> Keep the first version small</p>
   </div>

   <section className="tools wrap section-space" id="tools">
    <div className="section-heading">
     <div>
      <div className="eyebrow">PRODUCT CATALOG · DIGITAL STORE</div>
      <h2>{catalogProducts.length===2?'One idea. Two useful companions.':`One idea. ${catalogProducts.length} useful companions.`}</h2>
     </div>
     <p>Start with clarity. Add a workspace when<br/>you’re ready to organise the launch.</p>
    </div>

    <div className="catalog-listing-bar" aria-label="Store catalog summary">
     <div className="catalog-listing-count">
      <strong>{catalogProducts.length} Listed {catalogProducts.length === 1 ? 'Product' : 'Products'}</strong>
      <span>·</span>
      <span>Available for immediate account unlock</span>
     </div>
     <div className="catalog-listing-meta">
      <span>Digital delivery</span>
      <span>·</span>
      <span>One-time payment</span>
      <span>·</span>
      <span>No subscription</span>
     </div>
    </div>

    <div className="product-grid">
     {catalogProducts.map((item, idx) => {
      const href = `/products/${item.slug}`;
      const isDarkCover = item.coverTheme === 'dark';
      const isGreenBadge = item.badgeTheme === 'green';
      const isGuideProduct = item.key === 'fieldguide' || item.deliveryType === 'fieldguide_reader';
      const isStudioProduct = item.key === 'studio' || item.deliveryType === 'studio_workspace';
      const formatLabel = isGuideProduct
       ? '7-Page Interactive Guide'
       : isStudioProduct
         ? '5-Stage Online Workspace'
         : 'Digital Resource & Guide';
      const deliverySpec = isGuideProduct
       ? 'Web Reader'
       : isStudioProduct
         ? 'Web Application'
         : 'Account Reader';

      return (
       <article className={`product-card ${isStudioProduct ? 'is-featured-listing' : ''}`} key={item.key}>
        <div className="product-listing-topbar">
         <span className="product-number">{item.cardTag || `0${idx + 1} / DIGITAL PRODUCT`}</span>
         <span className="product-listing-status">
          {isStudioProduct ? 'FLAGSHIP WORKSPACE' : 'STARTER EDITION'} · IN STOCK
         </span>
        </div>

        <Link href={href} className={`product-photo ${isDarkCover ? 'cover-showcase-dark' : 'cover-showcase-light'}`} aria-label={`View ${item.name} details`}>
         <Image src={item.image} alt={item.imageAlt} width={1600} height={1100} unoptimized/>
         <span className={`product-badge ${isGreenBadge ? 'green' : ''}`}>{item.badge}</span>
         <span className="product-photo-cta">View product page <ArrowUpRight size={14}/></span>
        </Link>

        <div className="product-body">
         <div className="product-title">
          <div className="product-title-group">
           <span className="product-category-kicker">{formatLabel} · Instant Account Access</span>
           <Link href={href} className="product-title-link"><h3>{item.name}</h3></Link>
          </div>
          <div className="product-price-box">
           <PriceTag
            usdPrice={item.price}
            productKey={item.key}
            usdCompareAtPrice={item.compareAtPrice}
            mode="card"
           />
          </div>
         </div>

         <p className="product-listing-summary">{item.shortDescription || item.description}</p>

         <div className="product-includes-panel">
          <div className="product-includes-label">Included in this product</div>
          <ul>
           {item.cardBullets.map((b) => (
            <li key={b}><Check/><span>{b}</span></li>
           ))}
          </ul>
         </div>

         <div className="product-spec-strip" aria-label="Product specifications">
          <div>
           <small>FORMAT</small>
           <strong>{deliverySpec}</strong>
          </div>
          <div>
           <small>DELIVERY</small>
           <strong>Account Library</strong>
          </div>
          <div>
           <small>BILLING</small>
           <strong>One-Time Buy</strong>
          </div>
         </div>

         <div className="product-card-actions">
          <CheckoutButton product={item.key} usdPrice={item.price} className="button dark">
           {item.ctaLabel || `Get ${item.name} · $${item.price}`}
          </CheckoutButton>
          <Link href={href} className="product-detail-link">
           <span>View full product details &amp; preview</span>
           <ArrowUpRight size={15}/>
          </Link>
         </div>
         <small className="format-note">{item.formatNote}</small>
        </div>
       </article>
      );
     })}
    </div>
    <p className="mockup-note">Product covers are editorial concept showcases. Interactive workspace previews and real working app screenshots are shown below and on the product page. All products are separate one-time purchases accessed through your account.</p>
   </section>

   <section className="process-section" id="inside">
    <div className="wrap section-space">
     <div className="section-heading">
      <div>
       <div className="eyebrow">A CALMER WAY TO START</div>
       <h2>From “what if”<br/>to “here’s the first version.”</h2>
      </div>
      <p>Less switching between scattered notes.<br/>More room for the work that matters.</p>
     </div>
     <div className="process-grid">
      {[
       {n:'01',title:'Find the useful problem.',text:'Pick a specific person and a recurring task. Talk to potential users before you invest in the idea.'},
       {n:'02',title:'Make something small.',text:'Use prompts and worked examples to prepare a useful draft. Add your knowledge and check the details.'},
       {n:'03',title:'Launch. Learn. Improve.',text:'Show your work, measure relevant visits and purchases, and use real feedback to decide what comes next.'}
      ].map(s=><div key={s.n}><span>{s.n}</span><h3>{s.title}</h3><p>{s.text}</p></div>)}
     </div>
     <StudioPreview/>
     <div className="preview-caption"><MousePointer2 size={15}/> Choose a step above to explore. Preview fields are view only.</div>
    </div>
   </section>

   {publishedReviews.length>0&&(
    <section className="wrap section-space" id="reviews">
     <div className="section-heading">
      <div>
       <div className="eyebrow">READER &amp; BUILDER NOTES · ★ {avgRating} / 5.0</div>
       <h2>What early creators are saying.</h2>
      </div>
      <div>
       <p style={{marginBottom:'10px'}}>Real notes from readers and Launchpad Studio builders.</p>
       <Link className="text-link" href="/review">Purchased a tool? Leave a rating &amp; review <ArrowUpRight size={16}/></Link>
      </div>
     </div>
     <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:'18px'}}>
      {publishedReviews.slice(0,3).map(rev=>(
       <article key={rev.id} style={{background:'#fff',border:'1px solid #e2e7df',borderRadius:'16px',padding:'22px',display:'flex',flexDirection:'column',gap:'10px'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:'8px'}}>
         <div style={{display:'flex',gap:'3px',color:'#d49b00'}}>
          {Array.from({length:5}).map((_,i)=><Star key={i} size={15} fill={i<rev.rating?'#d49b00':'none'}/>)}
         </div>
         {rev.verifiedBuyer&&(
          <span style={{fontSize:'11px',fontWeight:700,background:'#e7f3ea',color:'#285934',padding:'3px 9px',borderRadius:'999px'}}>
           Verified Buyer
          </span>
         )}
        </div>
        <h3 style={{margin:0,fontSize:'16.5px',lineHeight:1.35,color:'#173b31'}}>{rev.headline}</h3>
        <p style={{margin:0,fontSize:'14px',lineHeight:1.55,color:'#4a5851',flex:1}}>{rev.comment}</p>
        <div style={{fontSize:'12px',color:'#768178',paddingTop:'8px',borderTop:'1px solid #f0f2ee'}}>
         <strong>{rev.name}</strong> · {rev.role}
        </div>
       </article>
      ))}
     </div>
    </section>
   )}

   <section className="honest wrap section-space">
    <div>
     <div className="eyebrow">BUILT BY A CREATOR, FOR THE FIRST STEP</div>
     <h2>Useful tools.<br/><em>Honest expectations.</em></h2>
     <p>I’m Hamza Idrishi. I build simple tools and share the experiments behind them. This collection is designed to make the first version easier to organise—not to sell you a shortcut to guaranteed results.</p>
     <a className="text-link" href={social.threads} target="_blank" rel="noreferrer">Follow the work on Threads <ArrowUpRight size={16}/></a>
    </div>
    <div className="honest-points">
     <div>
      <ShieldCheck/>
      <h3>Your own private workspace.</h3>
      <p>Sign in to your account to open your purchased guide or workspace. Your progress is saved to your account and protected by ownership checks.</p>
     </div>
     <div>
      <FileText/>
      <h3>Templates you make your own.</h3>
      <p>Bring your experience. Replace placeholders, verify claims, and publish work you can stand behind.</p>
     </div>
     <div>
      <Layers/>
      <h3>One clear next step.</h3>
      <p>All tools in our collection are separate one-time purchases; no monthly product subscription or personal AI API key is required.</p>
     </div>
    </div>
   </section>

   <section className="faq wrap section-space" id="questions">
    <div>
     <div className="eyebrow">A FEW THINGS TO KNOW</div>
     <h2>Before you start.</h2>
     <a className="text-link" href="/support">Have another question? <ArrowUpRight size={16}/></a>
    </div>
    <div>
     {[
      ['Which one should I start with?','Start with the Idea-to-Income Fieldguide. It helps you choose and investigate a problem. Launchpad Studio provides an online workspace for prompts, listing drafts and post starters. Each tool is a separate one-time purchase.'],
      ['Does Launchpad Studio include AI?','No. It prepares prompts and uses editable templates; it does not run an AI model. Paste prompts into Gemini or another tool separately. Those services need internet and may have their own account or subscription requirements.'],
      ['How do I access my products?','Sign in to this platform and open your library. Your purchased guides and tools work in your browser with an internet connection and save progress to your account.'],
      ['What happens after I buy?','Create or sign in to your account, complete Dodo checkout, and return to your library. Server-side payment verification unlocks the product for your account. Keep your purchase email. A redirect parameter alone never unlocks access.'],
      ['Will this guarantee sales or followers?','No. These tools help you prepare and organise a launch. Demand, distribution and successful usage need real testing. The calculator shows hypothetical scenarios, not earnings predictions.'],
      ['What about support and refunds?','For a missing file, access issue or a question about the product, use the support page. Refund eligibility is handled according to the terms shown at checkout and applicable consumer rights.']
     ].map(([q,a])=><details key={q}><summary>{q}<Plus size={18}/></summary><p>{a}</p></details>)}
    </div>
   </section>

   <section className="closing wrap">
    <div className="eyebrow">YOUR NEXT SMALL STEP</div>
    <h2>You don’t have to see<br/>the whole path to <em>begin.</em></h2>
    <p>Start with one person. One problem. One useful thing.</p>
    <CheckoutButton product={primaryProduct?primaryProduct.key:'fieldguide'} usdPrice={primaryProduct?primaryProduct.price:5} className="button lime">
     {primaryProduct?primaryProduct.ctaLabel:'Get the Fieldguide · $5'}
    </CheckoutButton>
    <span>
     One-time purchase ·{' '}
     <PriceTag
      usdPrice={primaryProduct?primaryProduct.price:5}
      productKey={primaryProduct?primaryProduct.key:'fieldguide'}
      mode="inline"
     />.
    </span>
   </section>
  </main>
  <SiteFooter/>
 </>;
}
