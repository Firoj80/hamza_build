import Link from 'next/link';
import {ArrowLeft,BookOpen,KeyRound,LogOut} from 'lucide-react';
import {requireProduct} from '@/lib/access';

export const dynamic='force-dynamic';
export const metadata={title:'Launchpad Studio — Hamza Idrishi',robots:{index:false,follow:false}};

export default async function Studio(){
 await requireProduct('studio');
 return (
  <main className="hosted-studio">
   <div className="platform-top">
    <div className="platform-top-left">
     <Link href="/library" className="platform-nav-pill">
      <ArrowLeft size={14}/> Your library
     </Link>
     <Link href="/fieldguide" className="platform-nav-link">
      <BookOpen size={14}/> Fieldguide
     </Link>
    </div>
    <span className="platform-top-badge">LAUNCHPAD STUDIO · CLOUD-SAVED WORKSPACE</span>
    <div className="platform-top-right">
     <Link href="/account/password" className="platform-nav-link">
      <KeyRound size={14}/> Password
     </Link>
     <form action="/auth/logout" method="post">
      <button type="submit" className="platform-logout-btn">
       <LogOut size={14}/> Sign out
      </button>
     </form>
    </div>
   </div>
   <iframe
    title="Your Launchpad Studio workspace"
    src="/api/workspace"
    sandbox="allow-scripts allow-same-origin"
    allow="clipboard-write"
   />
  </main>
 );
}
