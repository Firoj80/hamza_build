'use client';
import {useState} from 'react';
import {Copy,Check,Link2,ExternalLink} from 'lucide-react';
import styles from './sales.module.css';

export type SnapshotTemplates={
 milestone:string;
 funnel:string;
 weekly:string;
};

export type TrackedShareLinks={
 siteOrigin:string;
};

const SOCIAL_PREVIEWS:Record<string,{
 label:string;
 siteName:string;
 title:string;
 description:string;
 image:string;
 imageAlt:string;
}>={
 '/':{
  label:'Main Storefront URL (/)',
  siteName:'Hamza Idrishi · Build_hamza',
  title:'Your first product starts with one useful idea.',
  description:'A seven-page fieldguide and a private online launch workspace. Built for first-time creators.',
  image:'/images/launchpad-studio-og.png',
  imageAlt:'Launchpad Studio 5-stage command center cover with offer brief, AI prompt builder, scenario model and 30 post starters'
 },
 '/products/launchpad-studio':{
  label:'Launchpad Studio ($9)',
  siteName:'Hamza Idrishi · Build_hamza',
  title:'Launchpad Studio ($9) — Take your product idea from notes to a launch plan.',
  description:'A private 5-stage online workspace with 8 built-in topic examples, editable AI prompts, 30 post starters, scenario calculator, and cloud-saved launch checklist.',
  image:'/images/launchpad-studio-og.png',
  imageAlt:'Launchpad Studio 5-stage command center cover with offer brief, AI prompt builder, scenario model and 30 post starters'
 },
 '/products/first-product-fieldguide':{
  label:'Idea-to-Income Fieldguide ($5)',
  siteName:'Hamza Idrishi · Build_hamza',
  title:'Idea-to-Income Fieldguide ($5) — Turn one useful problem into a clear first launch.',
  description:'A practical seven-page guide with a worked example, fill-in idea brief, 5 customer validation questions, 3 AI prompts, listing template, and launch checklist.',
  image:'/images/idea-to-income-fieldguide-og.png',
  imageAlt:'Idea-to-Income Fieldguide hardcover monograph concept and customer validation scorecard sheet'
 }
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
 const [selectedPath,setSelectedPath]=useState<string>('/');
 const activeText=templates?templates[mode]:text;
 const cleanOrigin=(siteOrigin||'https://build-hamza.vercel.app').replace(/\/$/,'');
 const activePreview=SOCIAL_PREVIEWS[selectedPath]||SOCIAL_PREVIEWS['/'];
 const fullPreviewUrl=`${cleanOrigin}${selectedPath==='/'?'/':selectedPath}`;

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
    <span className={styles.trackedLinksLabel}><Link2 size={14}/> Tracked link & web preview:</span>
    <select
     className={styles.grantSelect}
     value={selectedPath}
     onChange={e=>setSelectedPath(e.target.value)}
     aria-label="Select product page for tracked social link"
    >
     <option value="/">Main URL — Storefront home (/)</option>
     <option value="/products/launchpad-studio">Launchpad Studio ($9)</option>
     <option value="/products/first-product-fieldguide">Idea-to-Income Fieldguide ($5)</option>
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
  <div className={styles.ogPreviewCard} aria-label="Social share web preview card">
   <a href={activePreview.image} target="_blank" rel="noreferrer" className={styles.ogPreviewThumb} title="Open full-resolution OG image">
    <img src={activePreview.image} alt={activePreview.imageAlt} loading="lazy"/>
   </a>
   <div className={styles.ogPreviewMeta}>
    <span className={styles.ogPreviewSite}>{activePreview.siteName} · {fullPreviewUrl}</span>
    <strong>{activePreview.title}</strong>
    <p>{activePreview.description}</p>
    <div className={styles.ogPreviewLinks}>
     <a href={activePreview.image} target="_blank" rel="noreferrer">
      View preview image ({activePreview.image}) <ExternalLink size={12}/>
     </a>
    </div>
   </div>
  </div>
 </div>;
}

