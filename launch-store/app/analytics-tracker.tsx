'use client';
import {usePathname} from 'next/navigation';
import {useEffect,useRef} from 'react';
import posthog from 'posthog-js';

export default function AnalyticsTracker(){
 const pathname=usePathname();
 const lastPath=useRef('');
 useEffect(()=>{
  if(!pathname||lastPath.current===pathname)return;
  lastPath.current=pathname;
  const privatePath=pathname==='/sales'||pathname.startsWith('/account')||pathname.startsWith('/auth')||pathname.startsWith('/api');
  if(!privatePath&&process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN){
   posthog.capture('$pageview',{$current_url:`${window.location.origin}${pathname}`});
   if(pathname.startsWith('/products/'))posthog.capture('product_details_viewed',{product:pathname.split('/').pop()});
  }
  if(!['/','/products/first-product-fieldguide','/products/launchpad-studio','/fieldguide','/studio'].includes(pathname))return;
  const key=`site-view:${pathname}`;
  if(sessionStorage.getItem(key))return;
  sessionStorage.setItem(key,'1');
  void fetch('/api/analytics',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({path:pathname}),keepalive:true}).catch(()=>{});
 },[pathname]);
 return null;
}
