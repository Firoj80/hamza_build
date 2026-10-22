import Link from 'next/link';
import {ArrowLeft,BookOpen,KeyRound,LogOut} from 'lucide-react';
import {requireProduct} from '@/lib/access';

import type {Metadata} from 'next';
import {productDetails} from '@/lib/catalog';

const studioMeta=productDetails['launchpad-studio'];
export const dynamic='force-dynamic';
export const metadata:Metadata={
 title:'Launchpad Studio — Hamza Idrishi',
 description:studioMeta.description,
 robots:{index:false,follow:false},
 openGraph:{
  type:'website',
  siteName:'Hamza Idrishi · Build_hamza',
  title:studioMeta.shareTitle,
  description:studioMeta.shareDescription,
  url:'/products/launchpad-studio',
  images:[{url:studioMeta.ogImage,width:1600,height:1100,alt:studioMeta.imageAlt,type:'image/png'}],
 },
 twitter:{
  card:'summary_large_image',
  site:'@hamza_build',
  creator:'@hamza_build',
  title:studioMeta.shareTitle,
  description:studioMeta.shareDescription,
  images:[{url:studioMeta.ogImage,alt:studioMeta.imageAlt}],
 },
};

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
