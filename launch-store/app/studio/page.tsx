import Link from 'next/link';
import {requireProduct} from '@/lib/access';
export const dynamic='force-dynamic';
export const metadata={title:'Launchpad Studio — Your workspace',robots:{index:false,follow:false}};
export default async function Studio(){await requireProduct('studio');return <main className="hosted-studio"><div className="platform-top"><Link href="/library">← Your library</Link><span>LAUNCHPAD STUDIO · ACCOUNT ACCESS</span><form action="/auth/logout" method="post"><button>Sign out</button></form></div><iframe title="Your Launchpad Studio workspace" src="/api/workspace" sandbox="allow-scripts allow-same-origin" allow="clipboard-write"/></main>;}
