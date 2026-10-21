import Link from 'next/link';
import {ArrowLeft,BookOpen,Compass,LogIn} from 'lucide-react';
import SiteHeader from './site-header';
import SiteFooter from './site-footer';

export default function NotFound(){
 return (
  <div className="page-shell">
   <SiteHeader/>
   <main className="editorial-utility-main wrap">
    <div className="order-box not-found-card">
     <div className="eyebrow"><Compass size={15}/> PAGE NOT FOUND · 404</div>
     <h1>This path takes<br/>a <em>different turn.</em></h1>
     <p>The page you were looking for could not be found or may have moved. Use the links below to head back to the starter collection or open your account library.</p>
     <div className="order-status-actions">
      <Link className="button dark" href="/">
       <ArrowLeft size={16}/> Back to the collection
      </Link>
      <Link className="button outline" href="/library">
       <BookOpen size={16}/> Open my library
      </Link>
      <Link className="button outline" href="/login?mode=login">
       <LogIn size={16}/> Sign in
      </Link>
     </div>
    </div>
   </main>
   <SiteFooter/>
  </div>
 );
}
