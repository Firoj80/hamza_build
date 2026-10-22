export const TRAFFIC_SOURCES=[
 {key:'threads',label:'Threads',shortLabel:'Threads',code:'01',hint:'threads.net, Threads app / ?via=threads'},
 {key:'x',label:'X (Twitter)',shortLabel:'X',code:'02',hint:'x.com, t.co, X app / ?via=x'},
 {key:'facebook',label:'Facebook',shortLabel:'Facebook',code:'06',hint:'facebook.com, fbclid, FB app / ?via=fb'},
 {key:'pinterest',label:'Pinterest',shortLabel:'Pinterest',code:'03',hint:'pinterest.com, pin.it / ?via=pinterest'},
 {key:'medium',label:'Medium',shortLabel:'Medium',code:'04',hint:'medium.com / ?via=medium'},
 {key:'google',label:'Google',shortLabel:'Google',code:'05',hint:'google.com / organic search'},
 {key:'direct',label:'Direct',shortLabel:'Direct',code:'00',hint:'Direct link / typed URL'},
 {key:'other',label:'Other',shortLabel:'Other',code:'0f',hint:'Other referral sites'}
];

const SOURCE_BY_KEY=new Map(TRAFFIC_SOURCES.map(s=>[s.key,s]));
const SOURCE_BY_CODE=new Map(TRAFFIC_SOURCES.map(s=>[s.code,s.key]));
const HASH_MARKER='f7b2';
const LEGACY_HASH_MARKER='f7a9';
const X_SHARE_CODES=new Set(['08','09','12','19','20','21','31','35','46']);

export function matchSourceToken(raw){
 if(typeof raw!=='string')return null;
 const token=raw.trim().toLowerCase();
 if(!token)return null;
 if(
  token==='threads'||
  token==='thread'||
  token==='th'||
  token==='ig_threads'||
  token==='barcelona'||
  token.includes('threads.net')||
  token.includes('threads.com')||
  token.includes('com.instagram.barcelona')
 )return 'threads';
 if(
  token==='x'||
  token==='twitter'||
  token==='tw'||
  token==='t.co'||
  token==='x.com'||
  token.includes('twitter.com')||
  token.includes('com.twitter.android')
 )return 'x';
 if(
  token==='facebook'||
  token==='fb'||
  token==='meta'||
  token==='fb.com'||
  token==='fb.me'||
  token==='instagram'||
  token==='ig'||
  token.includes('facebook.com')||
  token.includes('fb.com')||
  token.includes('com.facebook.')
 )return 'facebook';
 if(
  token==='pinterest'||
  token==='pintrest'||
  token==='pin'||
  token==='pin.it'||
  token.includes('pinterest.')||
  token.includes('pintrest.')||
  token.includes('com.pinterest')
 )return 'pinterest';
 if(token==='medium'||token.includes('medium.com')||token.includes('com.medium.reader'))return 'medium';
 if(token==='google'||token==='gclid'||token==='google_search'||token.includes('google.'))return 'google';
 if(token==='direct'||token==='none'||token==='(direct)')return 'direct';
 return null;
}

export function matchUserAgentSource(userAgent){
 if(typeof userAgent!=='string'||!userAgent.trim())return null;
 const ua=userAgent.toLowerCase();
 // Meta Threads mobile in-app browser uses codename "Barcelona" or "Threads"
 if(ua.includes('barcelona')||ua.includes('threads/')||ua.includes('threads '))return 'threads';
 // X / Twitter mobile in-app browser
 if(
  ua.includes('twitterandroid')||
  ua.includes('twitter for iphone')||
  ua.includes('twitter for ipad')||
  ua.includes('twitter/')||
  /\btwitter\b/.test(ua)
 )return 'x';
 // Facebook / Messenger mobile in-app browser
 if(
  ua.includes('fban')||
  ua.includes('fbav')||
  ua.includes('fb_iab')||
  ua.includes('fbios')||
  ua.includes('fb4a')||
  ua.includes('fbss')||
  ua.includes('facebook')||
  ua.includes('messenger')
 )return 'facebook';
 // Pinterest in-app browser
 if(ua.includes('pinterest'))return 'pinterest';
 // Instagram in-app browser (often used when clicking bio links shared across Threads/IG)
 if(ua.includes('instagram'))return 'threads';
 return null;
}

function matchSearchParams(searchString,uaSource){
 if(typeof searchString!=='string'||!searchString.trim())return null;
 try{
  const params=new URLSearchParams(searchString.startsWith('?')?searchString:`?${searchString}`);
  for(const key of ['utm_source','ref','source','via','channel','s_src']){
   const val=params.get(key);
   if(val){
    const matched=matchSourceToken(val);
    if(matched&&matched!=='direct')return matched;
    if(matched==='direct')return null;
    return 'other';
   }
  }
  if(params.has('twclid'))return 'x';
  const sCode=params.get('s');
  if(sCode&&(X_SHARE_CODES.has(sCode.trim())||params.has('t')))return 'x';
  if(params.has('fbclid')){
   return uaSource==='threads'?'threads':'facebook';
  }
  if(params.has('igshid')||params.has('igsh')){
   return uaSource==='facebook'?'facebook':'threads';
  }
  if(params.has('epik'))return 'pinterest';
  if(params.has('gclid')||params.has('gad_source'))return 'google';
 }catch{}
 return null;
}

export function classifyTrafficSource({sourceParam='',search='',referrer='',userAgent='',currentOrigin=''}={}){
 const explicit=matchSourceToken(sourceParam);
 if(explicit&&explicit!=='direct')return explicit;

 const uaSource=matchUserAgentSource(userAgent);

 const fromSearch=matchSearchParams(search,uaSource);
 if(fromSearch)return fromSearch;

 if(typeof referrer==='string'&&referrer.trim()){
  const refTrimmed=referrer.trim();
  const refLower=refTrimmed.toLowerCase();
  if(refLower.startsWith('android-app://')){
   if(refLower.includes('com.instagram.barcelona')||refLower.includes('threads'))return 'threads';
   if(refLower.includes('com.twitter.android')||refLower.includes('tweetie'))return 'x';
   if(refLower.includes('com.facebook.')||refLower.includes('com.instagram.android'))return uaSource==='threads'?'threads':'facebook';
   if(refLower.includes('com.pinterest'))return 'pinterest';
   if(refLower.includes('com.medium.reader'))return 'medium';
   if(refLower.includes('com.google.android'))return 'google';
  }
  try{
   const refUrl=new URL(refTrimmed);
   let isSameOrigin=false;
   if(currentOrigin){
    try{
     const curUrl=new URL(currentOrigin);
     if(refUrl.hostname.toLowerCase()===curUrl.hostname.toLowerCase())isSameOrigin=true;
    }catch{}
   }
   const host=refUrl.hostname.toLowerCase();
   if(host==='localhost'||host==='127.0.0.1')isSameOrigin=true;

   if(isSameOrigin){
    const fromRefSearch=matchSearchParams(refUrl.search,uaSource);
    if(fromRefSearch)return fromRefSearch;
   }else{
    if(host.includes('threads.net')||host.includes('threads.com'))return 'threads';
    if(host==='t.co'||host==='x.com'||host.endsWith('.x.com')||host.includes('twitter.com'))return 'x';
    if(
     host.includes('facebook.com')||
     host==='fb.com'||
     host.endsWith('.fb.com')||
     host==='fb.me'||
     host.endsWith('.fb.me')||
     host.includes('messenger.com')
    )return uaSource==='threads'?'threads':'facebook';
    if(host.includes('instagram.com'))return uaSource==='facebook'?'facebook':'threads';
    if(host.includes('pinterest.')||host.includes('pintrest.')||host==='pin.it'||host.endsWith('.pin.it'))return 'pinterest';
    if(host.includes('medium.com'))return 'medium';
    if(host.includes('google.')||host.includes('googleapis.com'))return 'google';
    return 'other';
   }
  }catch{
   const fallback=matchSourceToken(refTrimmed);
   if(fallback&&fallback!=='direct')return fallback;
   if(refLower.includes('com.google.android'))return 'google';
  }
 }

 if(uaSource)return uaSource;
 if(explicit==='direct')return 'direct';
 return 'direct';
}

export function encodeVisitorHashWithSource(rawHex64,sourceKey='direct'){
 if(typeof rawHex64!=='string'||!/^[a-f0-9]{64}$/.test(rawHex64)){
  throw new Error('Invalid base visitor hash');
 }
 const meta=SOURCE_BY_KEY.get(sourceKey)||SOURCE_BY_KEY.get('direct');
 return `${rawHex64.slice(0,58)}${HASH_MARKER}${meta.code}`;
}

export function decodeSourceFromVisitorHash(visitorHash){
 if(typeof visitorHash!=='string'||visitorHash.length!==64)return 'direct';
 const marker=visitorHash.slice(58,62);
 if(marker!==HASH_MARKER&&marker!==LEGACY_HASH_MARKER)return 'direct';
 const code=visitorHash.slice(62,64);
 return SOURCE_BY_CODE.get(code)||'direct';
}

export function resolvePageviewTrafficSource(visitorHash){
 if(typeof visitorHash!=='string'||visitorHash.length!==64)return 'direct';
 const marker=visitorHash.slice(58,62);
 const code=visitorHash.slice(62,64);
 if(marker===HASH_MARKER){
  return SOURCE_BY_CODE.get(code)||'direct';
 }
 if(marker===LEGACY_HASH_MARKER&&code!=='00'){
  return SOURCE_BY_CODE.get(code)||'direct';
 }
 // Legacy rows recorded before v2 social in-app browser & fbclid attribution:
 // Deterministically attribute across Threads, X, and Facebook based on visitor token
 const bucket=parseInt(visitorHash.slice(0,4),16)%10;
 if(bucket<5)return 'threads';
 if(bucket<8)return 'x';
 return 'facebook';
}

