'use client';
import {usePathname} from 'next/navigation';
import {useEffect,useRef} from 'react';
import posthog from 'posthog-js';
import {classifyTrafficSource} from '@/lib/traffic-source.mjs';

const SOURCE_STORAGE_KEY='site-traffic-source';

export default function AnalyticsTracker(){
 const pathname=usePathname();
 const lastPath=useRef('');
 useEffect(()=>{
  if(!pathname||lastPath.current===pathname)return;
  lastPath.current=pathname;

  const detected=classifyTrafficSource({
   search:window.location.search,
   referrer:document.referrer,
   currentOrigin:window.location.origin
  });
  const stored=sessionStorage.getItem(SOURCE_STORAGE_KEY);
  const source=detected!=='direct'?detected:(stored||'direct');
  sessionStorage.setItem(SOURCE_STORAGE_KEY,source);

  const privatePath=pathname==='/sales'||pathname.startsWith('/account')||pathname.startsWith('/auth')||pathname.startsWith('/api');
  if(!privatePath&&process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN){
   posthog.capture('$pageview',{$current_url:`${window.location.origin}${pathname}`,traffic_source:source});
   if(pathname.startsWith('/products/'))posthog.capture('product_details_viewed',{product:pathname.split('/').pop(),traffic_source:source});
  }
  if(!['/','/products/first-product-fieldguide','/products/launchpad-studio','/fieldguide','/studio'].includes(pathname))return;
  const key=`site-view:${pathname}`;
  if(sessionStorage.getItem(key))return;
  sessionStorage.setItem(key,'1');
  void fetch('/api/analytics',{
   method:'POST',
   headers:{'Content-Type':'application/json'},
   body:JSON.stringify({path:pathname,source,referrer:document.referrer||''}),
   keepalive:true
  }).catch(()=>{});
 },[pathname]);
 return null;
}
