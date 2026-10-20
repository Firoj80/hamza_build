import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, ShieldCheck } from 'lucide-react';
import CheckoutButton from '@/app/checkout-button';
import { guide, productDetails, studio } from '@/lib/catalog';
import StudioGallery from './studio-gallery';
import BrandMark from '@/app/brand-mark';

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

  return <main className="product-detail-page">
    <header className="detail-header wrap">
      <Link href="/#tools" className="detail-back"><ArrowLeft size={16}/> All tools</Link>
      <BrandMark className="detail-wordmark" icon/>
      <Link href="/library" className="detail-library">My library <ArrowUpRight size={15}/></Link>
    </header>
    <section className="product-detail-hero wrap">
      <div className="product-detail-copy">
        <div className="eyebrow"><span/>{product.eyebrow}</div>
        <h1>{product.name}<br/><em>{product.headline}</em></h1>
        <p>{product.description}</p>
        <div className="detail-price"><strong>{isGuide ? 'Free' : `$${product.price}`}</strong><span>{isGuide ? 'USD · no payment' : 'USD · pay once'}<br/>Account access</span></div>
        {isGuide ? <Link href={guide.readerHref} className="button dark">Open the free Fieldguide <ArrowUpRight size={18}/></Link> : <CheckoutButton product={product.product} className="button dark">Get Launchpad Studio access · ${product.price}</CheckoutButton>}
        <div className="detail-access"><ShieldCheck size={16}/>{product.access}</div>
      </div>
      <div className="product-detail-visual">
        <div className="detail-image-label">{product.imageLabel}</div>
        <Image src={product.image} alt={product.imageAlt} width={isGuide ? 1536 : 1440} height={isGuide ? 1024 : 1000} priority />
        {isGuide && <p className="detail-image-note">Cover concept. Create a free account to open the seven-page guide.</p>}
      </div>
    </section>

    <section className="detail-includes wrap">
      <div className="detail-section-heading"><div className="eyebrow">WHAT YOU GET</div><h2>{isGuide ? 'A small plan you can put to work.' : 'A calmer way to organise the work.'}</h2><p>Built to help you take a useful next step, with clear limits and no promised sales outcomes.</p></div>
      <ul>{product.includes.map(item => <li key={item}><Check size={17}/>{item}</li>)}</ul>
    </section>

    {product.product === 'studio' && <div className="wrap"><StudioGallery/></div>}

    <section className="detail-steps wrap">
      {product.sections.map((section, index) => <article key={section.title}><span>0{index + 1}</span><h3>{section.title}</h3><p>{section.body}</p></article>)}
    </section>

    <section className="detail-bottom wrap">
      <div><div className="eyebrow">GOOD TO KNOW</div><h2>Clear access.<br/><em>Honest expectations.</em></h2><p>{product.limitation}</p></div>
      <aside><span className="detail-price"><strong>{isGuide ? 'Free' : `$${product.price}`}</strong><small>{isGuide ? 'USD · account access' : 'USD · one-time purchase'}</small></span>{isGuide ? <Link href={guide.readerHref} className="button lime">Open the free Fieldguide <ArrowUpRight size={18}/></Link> : <CheckoutButton product={product.product} className="button lime">Get access · ${product.price}</CheckoutButton>}<p>{isGuide ? 'No checkout. No payment. Sign in to your account.' : 'Secure checkout · Account access · No monthly product subscription'}</p></aside>
    </section>

    <section className="detail-next wrap"><div><div className="eyebrow">THE NEXT USEFUL STEP</div><p>{product.nextStep}</p></div><Link href={product.nextHref} className="text-link">Explore {isGuide ? `${studio.name} · $${studio.price}` : `Free ${guide.name}`}<ArrowRight size={16}/></Link></section>
    <footer className="detail-footer wrap"><BrandMark href="/"/><span>Small tools for people making their first useful thing.</span><Link href="/support">Support</Link></footer>
  </main>;
}
