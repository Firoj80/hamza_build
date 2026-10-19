"use client";
import {useState} from 'react';
import Link from 'next/link';
import {ArrowUpRight} from 'lucide-react';
const steps=['Validate idea','AI prompts','Content plan','Store & numbers','Launch checklist'];
export default function StudioPreview(){const [selected,setSelected]=useState(0);return <div className="studio-embed"><div className="gallery-bar"><span><i/> LAUNCHPAD STUDIO</span><small>EXPLORE THE WORKSPACE</small></div><div className="gallery-tabs" aria-label="Choose a Studio preview step">{steps.map((label,i)=><button key={label} type="button" aria-pressed={i===selected} onClick={()=>setSelected(i)}>{String(i+1).padStart(2,'0')} <span>{label}</span></button>)}</div><iframe key={selected} src={'/api/studio-preview?step='+selected} title={'Launchpad Studio view-only preview: '+steps[selected]} sandbox="" loading="lazy" referrerPolicy="no-referrer"/><div className="gallery-caption"><p>View-only example. Your own workspace unlocks after purchase.</p><Link href="/library">Get your workspace <ArrowUpRight size={15}/></Link></div></div>;}
