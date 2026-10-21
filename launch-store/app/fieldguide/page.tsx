import Link from 'next/link';
import {requireProduct} from '@/lib/access';
import BrandMark from '@/app/brand-mark';
export const dynamic='force-dynamic';
export const metadata={title:'Idea-to-Income Fieldguide — Your library',robots:{index:false,follow:false}};
export default async function Fieldguide(){await requireProduct('fieldguide');return <main className="simple-page"><BrandMark back/><p><Link href="/library">Your library</Link></p><div className="eyebrow">IDEA-TO-INCOME FIELDGUIDE</div><h1>One problem.<br/>One useful first version.</h1><p>Your seven-page fieldguide. Launchpad Studio is a separate $9 next step when you want a guided online workspace.</p><iframe className="guide-reader" title="Idea-to-Income Fieldguide reader" src="/api/fieldguide#toolbar=0"/><p className="muted">This is an account-protected reader. Like all browser content, it cannot be made completely copy-proof.</p></main>;}
