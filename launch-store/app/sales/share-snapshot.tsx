'use client';
import {useState} from 'react';
import {Copy,Check} from 'lucide-react';
import styles from './sales.module.css';

export type SnapshotTemplates={
 milestone:string;
 funnel:string;
 weekly:string;
};

export default function ShareSnapshot({
 text,
 templates
}:{
 text:string;
 templates?:SnapshotTemplates;
}){
 const [mode,setMode]=useState<'milestone'|'funnel'|'weekly'>('milestone');
 const [copied,setCopied]=useState(false);
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
 </div>;
}
