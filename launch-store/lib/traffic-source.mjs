export const TRAFFIC_SOURCES=[
 {key:'threads',label:'Threads',code:'01',hint:'threads.net / utm_source=threads'},
 {key:'x',label:'X (Twitter)',shortLabel:'X',code:'02',hint:'x.com, t.co / utm_source=x'},
 {key:'pinterest',label:'Pinterest',code:'03',hint:'pinterest.com, pin.it / utm_source=pinterest'},
 {key:'medium',label:'Medium',code:'04',hint:'medium.com / utm_source=medium'},
 {key:'google',label:'Google',code:'05',hint:'google.com / organic search'},
 {key:'direct',label:'Direct',code:'00',hint:'Direct link / typed URL'},
 {key:'other',label:'Other',code:'0f',hint:'Other referral sites'}
];

const SOURCE_BY_KEY=new Map(TRAFFIC_SOURCES.map(s=>[s.key,s]));
const SOURCE_BY_CODE=new Map(TRAFFIC_SOURCES.map(s=>[s.code,s.key]));
const HASH_MARKER='f7a9';

export function matchSourceToken(raw){
 if(typeof raw!=='string')return null;
 const token=raw.trim().toLowerCase();
 if(!token)return null;
 if(token==='threads'||token==='thread'||token==='th'||token==='ig_threads'||token.includes('threads.net')||token.includes('threads.com'))return 'threads';
 if(token==='x'||token==='twitter'||token==='tw'||token==='t.co'||token==='x.com'||token.includes('twitter.com'))return 'x';
 if(token==='pinterest'||token==='pintrest'||token==='pin'||token==='pin.it'||token.includes('pinterest.')||token.includes('pintrest.'))return 'pinterest';
 if(token==='medium'||token.includes('medium.com'))return 'medium';
 if(token==='google'||token==='gclid'||token==='google_search'||token.includes('google.'))return 'google';
 if(token==='direct'||token==='none'||token==='(direct)')return 'direct';
 return null;
}

export function classifyTrafficSource({sourceParam='',search='',referrer='',currentOrigin=''}={}){
 const explicit=matchSourceToken(sourceParam);
 if(explicit)return explicit;

 if(typeof search==='string'&&search.trim()){
  try{
   const params=new URLSearchParams(search.startsWith('?')?search:`?${search}`);
   for(const key of ['utm_source','ref','source','via']){
    const val=params.get(key);
    if(val){
     const matched=matchSourceToken(val);
     if(matched)return matched;
     return 'other';
    }
   }
   if(params.has('gclid'))return 'google';
  }catch{}
 }

 if(typeof referrer==='string'&&referrer.trim()){
  const refTrimmed=referrer.trim();
  try{
   const refUrl=new URL(refTrimmed);
   if(currentOrigin){
    try{
     const curUrl=new URL(currentOrigin);
     if(refUrl.hostname.toLowerCase()===curUrl.hostname.toLowerCase())return 'direct';
    }catch{}
   }
   const host=refUrl.hostname.toLowerCase();
   if(host==='localhost'||host==='127.0.0.1')return 'direct';
   if(host.includes('threads.net')||host.includes('threads.com'))return 'threads';
   if(host==='t.co'||host==='x.com'||host.endsWith('.x.com')||host.includes('twitter.com'))return 'x';
   if(host.includes('pinterest.')||host.includes('pintrest.')||host==='pin.it'||host.endsWith('.pin.it'))return 'pinterest';
   if(host.includes('medium.com'))return 'medium';
   if(host.includes('google.')||host.includes('googleapis.com'))return 'google';
   return 'other';
  }catch{
   const fallback=matchSourceToken(refTrimmed);
   if(fallback)return fallback;
   if(refTrimmed.toLowerCase().includes('com.google.android'))return 'google';
  }
 }

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
 if(visitorHash.slice(58,62)!==HASH_MARKER)return 'direct';
 const code=visitorHash.slice(62,64);
 return SOURCE_BY_CODE.get(code)||'direct';
}
