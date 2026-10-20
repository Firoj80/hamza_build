'use client';
import {useState} from 'react';
import {Copy,Check} from 'lucide-react';
import styles from './sales.module.css';

export default function ShareSnapshot({text}:{text:string}){
 const [copied,setCopied]=useState(false);
 async function copy(){
  try{await navigator.clipboard.writeText(text);setCopied(true);window.setTimeout(()=>setCopied(false),1800)}catch{setCopied(false)}
 }
 return <button type="button" onClick={copy} className={styles.copyButton}>{copied?<Check size={15}/>:<Copy size={15}/ >}{copied?'Copied':'Copy Threads summary'}</button>
}
