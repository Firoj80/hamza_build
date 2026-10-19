"use client";
import Image from 'next/image';
import {useState} from 'react';
import {ArrowUpRight} from 'lucide-react';
const screens=[
 {label:'Validate idea',file:'studio-validate.jpg',description:'Choose a topic, define your audience and record customer evidence.'},
 {label:'AI prompts',file:'studio-prompts.jpg',description:'Prepare editable prompts using your own product context.'},
 {label:'Content plan',file:'studio-content.jpg',description:'Choose from 30 different post starters, then edit the draft.'},
 {label:'Store & numbers',file:'studio-store.jpg',description:'Add your links, prepare listing copy and explore hypothetical scenarios.'},
 {label:'Launch checklist',file:'studio-checklist.jpg',description:'Track seven launch actions and write down what you learn.'}
];
export default function StudioPreview(){const [selected,setSelected]=useState(0);const screen=screens[selected];return <div className="screenshot-gallery"><div className="gallery-bar"><span><i/> ACTUAL LAUNCHPAD STUDIO</span><small>CAPTURED FROM THE WORKING APP</small></div><div className="gallery-tabs" aria-label="Choose an app screenshot">{screens.map((s,i)=><button key={s.file} type="button" aria-pressed={i===selected} onClick={()=>setSelected(i)}>{String(i+1).padStart(2,'0')} <span>{s.label}</span></button>)}</div><a className="gallery-image" href={'/images/screenshots/'+screen.file} target="_blank" rel="noreferrer" aria-label={'Open full-size '+screen.label+' screenshot'}><Image src={'/images/screenshots/'+screen.file} alt={'Real Launchpad Studio screenshot: '+screen.description} width={1440} height={1000} sizes="(max-width: 720px) 100vw, 1000px"/></a><div className="gallery-caption"><p aria-live="polite">{screen.description}</p><a href={'/images/screenshots/'+screen.file} target="_blank" rel="noreferrer">View full size <ArrowUpRight size={13}/></a></div></div>;}
