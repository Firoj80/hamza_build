import Link from 'next/link';
import {requireProduct} from '@/lib/access';
export const dynamic='force-dynamic';
export const metadata={title:'First Product Fieldguide — Your library',robots:{index:false,follow:false}};
export default async function Fieldguide(){await requireProduct('fieldguide');return <main className="simple-page"><Link href="/library">← Your library</Link><div className="eyebrow">FIRST PRODUCT FIELDGUIDE</div><h1>One problem.<br/>One useful first version.</h1><p>Your seven-page fieldguide, available inside your account.</p><iframe className="guide-reader" title="First Product Fieldguide reader" src="/api/fieldguide#toolbar=0"/><p className="muted">This is an account-protected reader. Like all browser content, it cannot be made completely copy-proof.</p></main>;}
