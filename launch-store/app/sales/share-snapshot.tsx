'use client';
import {useState} from 'react';
import {Copy,Check,Link2} from 'lucide-react';
import styles from './sales.module.css';

export type SnapshotTemplates={
 milestone:string;
 funnel:string;
 weekly:string;
};

export type TrackedShareLinks={
 siteOrigin:string;
};

export default function ShareSnapshot({
 text,
 templates,
 siteOrigin
}:{
 text:string;
 templates?:SnapshotTemplates;
 siteOrigin?:string;
}){
 const [mode,setMode]=useState<'milestone'|'funnel'|'weekly'>('milestone');
 const [copied,setCopied]=useState(false);
 const [copiedLinkKey,setCopiedLinkKey]=useState<string|null>(null);
 const [selectedPath,setSelectedPath]=useState<string>('/products/launchpad-studio');
 const activeText=templates?templates[mode]:text;

 async function copy(){
  try{
   await navigator.clipboard.writeText(activeText);
   setCopied(true);
   window.setTimeout(()=>setCopied(false),1800);
  }catch{
   setCopied(false);
  }
 }

 async function copyTrackedUrl(channel:'threads'|'x'|'fb'){
  const base=(siteOrigin||window.location.origin).replace(/\/$/,'');
  const url=`${base}${selectedPath}?via=${channel}`;
  try{
   await navigator.clipboard.writeText(url);
   setCopiedLinkKey(channel);
   window.setTimeout(()=>setCopiedLinkKey(null),1800);
  }catch{
   setCopiedLinkKey(null);
  }
 }

 return <div className={styles.snapshotContainer}>
  <div className={styles.snapshotBar}>
   {templates&&(
    <div className={styles.snapshotTabs} role="group" aria-label="Build in public post template">
     <button type="button" className={mode==='milestone'?styles.segActive:''} onClick={()=>setMode('milestone')}>Threads summary</button>
     <button type="button" className={mode==='funnel'?styles.segActive:''} onClick={()=>setMode('funnel')}>Funnel post</button>
     <button type="button" className={mode==='weekly'?styles.segActive:''} onClick={()=>setMode('weekly')}>7d update</button>
    </div>
   )}
   <button type="button" onClick={copy} className={styles.copyButton}>
    {copied?<Check size={15}/>:<Copy size={15}/>}
    {copied?'Copied post':'Copy Threads summary'}
   </button>
  </div>
  <pre className={styles.snapshotPreview} aria-label="Threads summary preview">{activeText}</pre>
  <div className={styles.trackedLinksBar}>
   <div className={styles.trackedLinksLeft}>
    <span className={styles.trackedLinksLabel}><Link2 size={14}/> Tracked product links:</span>
    <select
     className={styles.grantSelect}
     value={selectedPath}
     onChange={e=>setSelectedPath(e.target.value)}
     aria-label="Select product page for tracked social link"
    >
     <option value="/products/launchpad-studio">Launchpad Studio ($9)</option>
     <option value="/products/first-product-fieldguide">Idea-to-Income Fieldguide ($5)</option>
     <option value="/">Storefront home (/)</option>
    </select>
   </div>
   <div className={styles.trackedLinksBtns}>
    <button type="button" className={styles.trackedLinkBtn} onClick={()=>copyTrackedUrl('threads')}>
     {copiedLinkKey==='threads'?<Check size={13}/>:<Copy size={13}/>}
     {copiedLinkKey==='threads'?'Copied Threads URL':'Copy for Threads (?via=threads)'}
    </button>
    <button type="button" className={styles.trackedLinkBtn} onClick={()=>copyTrackedUrl('x')}>
     {copiedLinkKey==='x'?<Check size={13}/>:<Copy size={13}/>}
     {copiedLinkKey==='x'?'Copied X URL':'Copy for X (?via=x)'}
    </button>
    <button type="button" className={styles.trackedLinkBtn} onClick={()=>copyTrackedUrl('fb')}>
     {copiedLinkKey==='fb'?<Check size={13}/>:<Copy size={13}/>}
     {copiedLinkKey==='fb'?'Copied Facebook URL':'Copy for Facebook (?via=fb)'}
    </button>
   </div>
  </div>
 </div>;
}

