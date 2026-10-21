import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, ArrowUpRight, Check, LogIn, ShieldCheck, UserPlus } from 'lucide-react';
import CheckoutButton from '@/app/checkout-button';
import { guide, productDetails, studio } from '@/lib/catalog';
import StudioGallery from './studio-gallery';
import SiteHeader from '@/app/site-header';
import SiteFooter from '@/app/site-footer';
import { currentUser } from '@/lib/supabase/server';

type Props = { params: Promise<{ slug: string }> };

function getDetails(slug: string) {
  return Object.prototype.hasOwnProperty.call(productDetails, slug)
    ? productDetails[slug as keyof typeof productDetails]
    : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = getDetails(slug);
  if (!product) return { title: 'Product not found' };
  return { title: `${product.name} — Hamza Idrishi`, description: product.description };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = getDetails(slug);
  if (!product) notFound();

  const isGuide = product.product === 'fieldguide';
  const user = await currentUser();

  return <div className="product-detail-page">
    <SiteHeader backHref="/#tools" backLabel="All tools"/>
    <main>
      <section className="product-detail-hero wrap">
        <div className="product-detail-copy">
          <div className="eyebrow"><span/>{product.eyebrow}</div>
          <h1>{product.name}<br/><em>{product.headline}</em></h1>
          <p>{product.description}</p>
          <div className="detail-price">
            <strong>${product.price}</strong>
            <span>USD · pay once<br/>Account access</span>
          </div>
          <CheckoutButton product={product.product} className="button dark">Get {product.name} access · ${product.price}</CheckoutButton>
          <div className="detail-access"><ShieldCheck size={16}/>{product.access}</div>
          <div className="hero-account-bar">
            {user ? (
              <>
                <span className="hero-account-status">Signed in as <strong>{user.email}</strong></span>
                <Link href="/library" className="hero-account-link">
                  Check my library <ArrowUpRight size={14}/>
                </Link>
              </>
            ) : (
              <>
                <span className="hero-account-status">Already purchased?</span>
                <div className="hero-account-links">
                  <Link href="/login?mode=login" className="hero-account-link"><LogIn size={14}/> Sign in</Link>
                  <span>·</span>
                  <Link href="/login?mode=signup" className="hero-account-link"><UserPlus size={14}/> Create account</Link>
                </div>
              </>
            )}
          </div>
        </div>
        <div className="product-detail-visual">
          <div className="detail-image-label">{product.imageLabel}</div>
          <Image src={product.image} alt={product.imageAlt} width={isGuide ? 1536 : 1440} height={isGuide ? 1024 : 1000} priority />
          {isGuide && <p className="detail-image-note">Cover concept. Purchase access to open the seven-page guide in your account library.</p>}
        </div>
      </section>

      <section className="detail-includes wrap">
        <div className="detail-section-heading">
          <div className="eyebrow">WHAT YOU GET</div>
          <h2>{isGuide ? 'A small plan you can put to work.' : 'A calmer way to organise the work.'}</h2>
          <p>Built to help you take a useful next step, with clear limits and no promised sales outcomes.</p>
        </div>
        <ul>{product.includes.map(item => <li key={item}><Check size={17}/>{item}</li>)}</ul>
      </section>

      {product.product === 'studio' && <div className="wrap"><StudioGallery/></div>}

      <section className="detail-steps wrap">
        {product.sections.map((section, index) => (
          <article key={section.title}>
            <span>0{index + 1}</span>
            <h3>{section.title}</h3>
            <p>{section.body}</p>
          </article>
        ))}
      </section>

      <section className="detail-bottom wrap">
        <div>
          <div className="eyebrow">GOOD TO KNOW</div>
          <h2>Clear access.<br/><em>Honest expectations.</em></h2>
          <p>{product.limitation}</p>
        </div>
        <aside>
          <span className="detail-price"><strong>${product.price}</strong><small>USD · one-time purchase</small></span>
          <CheckoutButton product={product.product} className="button lime">Get access · ${product.price}</CheckoutButton>
          <p>Secure checkout · Account access · No monthly product subscription</p>
        </aside>
      </section>

      <section className="detail-next wrap">
        <div>
          <div className="eyebrow">THE NEXT USEFUL STEP</div>
          <p>{product.nextStep}</p>
        </div>
        <Link href={product.nextHref} className="text-link">
          Explore {isGuide ? `${studio.name} · $${studio.price}` : `${guide.name} · $${guide.price}`}<ArrowRight size={16}/>
        </Link>
      </section>
    </main>
    <SiteFooter/>
  </div>;
}
