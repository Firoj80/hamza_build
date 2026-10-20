'use client';
import {usePathname} from 'next/navigation';
import {useEffect} from 'react';

export default function AnalyticsTracker(){
 const pathname=usePathname();
 useEffect(()=>{
  if(!pathname||!['/','/products/first-product-fieldguide','/products/launchpad-studio','/fieldguide','/studio'].includes(pathname))return;
  const key=`site-view:${pathname}`;
  if(sessionStorage.getItem(key))return;
  sessionStorage.setItem(key,'1');
  void fetch('/api/analytics',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({path:pathname}),keepalive:true}).catch(()=>{});
 },[pathname]);
 return null;
}
