'use client';
import {usePathname} from 'next/navigation';
import {useEffect,useRef} from 'react';
import posthog from 'posthog-js';
import {classifyTrafficSource} from '@/lib/traffic-source.mjs';

const SOURCE_STORAGE_KEY='site-traffic-source';
const SOURCE_LOCAL_KEY='site-traffic-source-first';
const TTL_MS=24*60*60*1000;

function readStoredSource():string{
 try{
  const sessionVal=sessionStorage.getItem(SOURCE_STORAGE_KEY);
  if(sessionVal&&sessionVal!=='direct')return sessionVal;
  const rawLocal=localStorage.getItem(SOURCE_LOCAL_KEY);
  if(rawLocal){
   const parsed=JSON.parse(rawLocal) as {source?:string;ts?:number};
   if(parsed?.source&&parsed.source!=='direct'&&typeof parsed.ts==='number'&&Date.now()-parsed.ts<TTL_MS){
    return parsed.source;
   }
  }
  return sessionVal||'direct';
 }catch{
  return 'direct';
 }
}

function saveStoredSource(source:string){
 try{
  sessionStorage.setItem(SOURCE_STORAGE_KEY,source);
  if(source&&source!=='direct'){
   localStorage.setItem(SOURCE_LOCAL_KEY,JSON.stringify({source,ts:Date.now()}));
  }
 }catch{}
}

export default function AnalyticsTracker(){
 const pathname=usePathname();
 const lastPath=useRef('');
 useEffect(()=>{
  if(!pathname)return;
  const search=window.location.search||'';
  const visitKey=`${pathname}${search}`;
  if(lastPath.current===visitKey)return;
  lastPath.current=visitKey;

  const detected=classifyTrafficSource({
   search,
   referrer:document.referrer||'',
   userAgent:navigator.userAgent||'',
   currentOrigin:window.location.origin
  });
  const stored=readStoredSource();
  const source=detected!=='direct'?detected:(stored||'direct');
  saveStoredSource(source);

  const privatePath=pathname==='/sales'||pathname.startsWith('/account')||pathname.startsWith('/auth')||pathname.startsWith('/api');
  if(!privatePath&&process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN){
   posthog.capture('$pageview',{$current_url:`${window.location.origin}${pathname}`,traffic_source:source});
   if(pathname.startsWith('/products/'))posthog.capture('product_details_viewed',{product:pathname.split('/').pop(),traffic_source:source});
  }
  if(!['/','/products/first-product-fieldguide','/products/launchpad-studio','/fieldguide','/studio'].includes(pathname))return;
  const key=`site-view:${pathname}`;
  const prevRecordedSource=sessionStorage.getItem(key);
  if(prevRecordedSource&&(prevRecordedSource===source||source==='direct'))return;
  sessionStorage.setItem(key,source);
  void fetch('/api/analytics',{
   method:'POST',
   headers:{'Content-Type':'application/json'},
   body:JSON.stringify({
    path:pathname,
    source,
    search,
    referrer:document.referrer||'',
    userAgent:navigator.userAgent||''
   }),
   keepalive:true
  }).catch(()=>{});
 },[pathname]);
 return null;
}

