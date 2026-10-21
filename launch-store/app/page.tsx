import Image from 'next/image';
import {ArrowUpRight,ArrowRight,BookOpen,Check,MousePointer2,FileText,Layers,Compass,ShieldCheck,Plus,LogIn,UserPlus} from 'lucide-react';
import StudioPreview from './studio-preview';
import Link from 'next/link';
import {guide,studio,social} from '@/lib/catalog';
import CheckoutButton from './checkout-button';
import SiteHeader from './site-header';
import SiteFooter from './site-footer';
import {currentUser} from '@/lib/supabase/server';

export default async function Home(){
 const user=await currentUser();
 return <>
  <a className="skip-link" href="#main">Skip to content</a>
  <div className="announcement">
   <span>A small first step can become something useful.</span>
   <a href="#tools">Get the Fieldguide · $5 <ArrowRight size={13}/></a>
  </div>
  <SiteHeader/>
  <main id="main">
   <section className="hero wrap">
    <div className="hero-copy">
     <div className="eyebrow"><span/> SMALL TOOLS. REAL PROGRESS.</div>
     <h1>Your first product.<br/>A clearer <em>way<br className="desktop-break"/> forward.</em></h1>
     <p>You don’t need another big idea.<br/>You need a small, useful one—and a plan to bring it to life.</p>
     <div className="hero-actions">
      <CheckoutButton product="fieldguide" className="button dark">Get the Fieldguide · $5</CheckoutButton>
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
     <Image src="/images/first-product-fieldguide.webp" alt="Green workbook concept mockup that still shows the earlier First Product Fieldguide title" width={1536} height={1024} priority/>
     <div className="visual-caption"><span>01 / IDEA-TO-INCOME FIELDGUIDE</span><span>ACCOUNT ACCESS · NOT A PHYSICAL BOOK</span></div>
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
      <div className="eyebrow">THE STARTER COLLECTION</div>
      <h2>One idea. Two useful companions.</h2>
     </div>
     <p>Start with clarity. Add a workspace when<br/>you’re ready to organise the launch.</p>
    </div>

    <div className="product-grid">
     <article className="product-card">
      <Link href={guide.href} className="product-photo" aria-label="View Idea-to-Income Fieldguide details">
       <Image src="/images/first-product-fieldguide.webp" alt="Green workbook concept mockup with the earlier First Product Fieldguide cover title" width={1536} height={1024}/>
       <span className="product-badge">$5 · START HERE</span>
      </Link>
      <div className="product-body">
       <div className="product-number">01 / THE FOUNDATION</div>
       <div className="product-title">
        <Link href={guide.href} className="product-title-link"><h3>Idea-to-Income<br/>Fieldguide</h3></Link>
        <span>$5<small>USD · pay once</small></span>
       </div>
       <p>A practical seven-page guide to finding one useful problem, checking demand, and planning your first launch.</p>
       <ul>
        <li><Check/>Five customer-research questions</li>
        <li><Check/>A worked example and idea worksheet</li>
        <li><Check/>AI prompts and a launch checklist</li>
       </ul>
       <Link href={guide.href} className="product-detail-link">See everything inside <ArrowUpRight size={15}/></Link>
       <CheckoutButton product="fieldguide" className="button outline">Get the Fieldguide · $5</CheckoutButton>
       <small className="format-note">7-page fieldguide · Account access · Taxes shown at checkout</small>
      </div>
     </article>

     <article className="product-card">
      <Link href={studio.href} className="product-photo real-product-photo" aria-label="View Launchpad Studio details">
       <Image src="/images/screenshots/studio-validate.jpg" alt="Actual Launchpad Studio app: validation workspace with sidebar, product fields and customer evidence" width={1440} height={1000}/>
       <span className="product-badge green">ACTUAL APP SCREENSHOT</span>
      </Link>
      <div className="product-body">
       <div className="product-number">02 / THE WORKSPACE</div>
       <div className="product-title">
        <Link href={studio.href} className="product-title-link"><h3>Launchpad<br/>Studio</h3></Link>
        <span>$9<small>USD · pay once</small></span>
       </div>
       <p>Your online workspace for turning a product idea into editable prompts, listing drafts, and a content plan.</p>
       <ul>
        <li><Check/>30 distinct, editable post starters</li>
        <li><Check/>Your own links, notes and listing drafts</li>
        <li><Check/>Scenario calculator and copyable plan</li>
       </ul>
       <Link href={studio.href} className="product-detail-link">See everything inside <ArrowUpRight size={15}/></Link>
       <CheckoutButton product="studio">Get Launchpad Studio · $9</CheckoutButton>
       <small className="format-note">Online workspace · Login required · Taxes shown at checkout</small>
      </div>
     </article>
    </div>
    <p className="mockup-note">The Fieldguide cover is a concept mockup. Launchpad Studio images are real screenshots of the working app. Both products are separate one-time purchases accessed through your account.</p>
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
      <p>The Fieldguide is $5 and Launchpad Studio is $9. Both are separate one-time purchases; no monthly product subscription or personal AI API key is required.</p>
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
      ['Which one should I start with?','Start with the $5 Idea-to-Income Fieldguide. It helps you choose and investigate a problem. Launchpad Studio is $9 and provides an online workspace for prompts, listing drafts and post starters. Each tool is a separate one-time purchase.'],
      ['Does Launchpad Studio include AI?','No. It prepares prompts and uses editable templates; it does not run an AI model. Paste prompts into Gemini or another tool separately. Those services need internet and may have their own account or subscription requirements.'],
      ['How do I access my products?','Sign in to this platform and open your library. Your purchased Fieldguide and Launchpad Studio work in your browser with an internet connection and save progress to your account. There is no downloadable app ZIP or HTML file. The layout adapts to desktop and mobile screens.'],
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
    <CheckoutButton product="fieldguide" className="button lime">Get the Fieldguide · $5</CheckoutButton>
    <span>Seven practical pages · $5 one-time purchase.</span>
   </section>
  </main>
  <SiteFooter/>
 </>;
}
