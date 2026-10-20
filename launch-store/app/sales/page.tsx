import {notFound,redirect} from 'next/navigation';
import Link from 'next/link';
import {ArrowLeft,RefreshCw,TrendingUp,ShoppingBag,Clock3} from 'lucide-react';
import BrandMark from '../brand-mark';
import {currentUser} from '@/lib/supabase/server';
import {adminClient} from '@/lib/supabase/admin';
import {guide,studio} from '@/lib/catalog';
import styles from './sales.module.css';

export const dynamic='force-dynamic';
export const metadata={title:'Sales dashboard — Hamza Idrishi',robots:{index:false,follow:false}};

type Purchase={payment_id:string;product_key:'studio'|'fieldguide';access_status:'active'|'pending'|'revoked';provider_status:string;amount_cents:number;currency:string;updated_at:string};
const products={studio:studio.name,fieldguide:guide.name};
function money(cents:number,currency:string){try{return new Intl.NumberFormat('en-US',{style:'currency',currency}).format(cents/100)}catch{return `${(cents/100).toFixed(2)} ${currency}`}}
function date(value:string){return new Intl.DateTimeFormat('en-IN',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Kolkata'}).format(new Date(value))}

export default async function Sales(){
 const user=await currentUser();
 if(!user)redirect('/login?next=%2Fsales');
 const ownerEmail=process.env.SALES_DASHBOARD_ADMIN_EMAIL?.trim().toLowerCase();
 if(!ownerEmail||user.email?.trim().toLowerCase()!==ownerEmail)notFound();
 const db=adminClient();
 const {data,error}=await db.from('platform_purchases').select('payment_id,product_key,access_status,provider_status,amount_cents,currency,updated_at').order('updated_at',{ascending:false}).limit(500);
 if(error)throw new Error('Could not load sales dashboard');
 const rows=(data||[]) as Purchase[];
 const studioRows=rows.filter(row=>row.product_key==='studio');
 const paid=studioRows.filter(row=>row.access_status==='active');
 const amountUnknown=paid.filter(row=>row.amount_cents===0).length;
 const pending=studioRows.filter(row=>row.access_status==='pending');
 const revoked=studioRows.filter(row=>row.access_status==='revoked');
 const totals=new Map<string,number>();
 for(const row of paid)totals.set(row.currency,(totals.get(row.currency)||0)+row.amount_cents);
 const revenue=[...totals].map(([currency,cents])=>money(cents,currency)).join(' · ')||money(0,'USD');
 return <main className={styles.page}>
  <header className={styles.header}><BrandMark href="/" className="wordmark" icon/><Link className={styles.back} href="/"><ArrowLeft size={16}/> Landing page</Link></header>
  <section className={styles.content}>
   <div className={styles.heading}><div><div className={styles.eyebrow}>PRIVATE · OWNER VIEW</div><h1>Sales overview</h1><p>Verified Dodo payments recorded for your products.</p></div><Link className={styles.refresh} href="/sales"><RefreshCw size={15}/> Refresh</Link></div>
   {error&&<p role="alert" className={styles.error}>Sales data could not be loaded. Refresh to try again.</p>}
   <div className={styles.stats}>
    <article className={styles.stat}><span><TrendingUp size={17}/> Collected</span><strong>{revenue}{amountUnknown>0&&<span className={styles.unknown}>*</span>}</strong><small>{amountUnknown>0?`Excludes ${amountUnknown} older payment${amountUnknown===1?'':'s'} with unavailable charge amount`:'Active Launchpad Studio payments · includes tax'}</small></article>
    <article className={styles.stat}><span><ShoppingBag size={17}/> Paid sales</span><strong>{paid.length}</strong><small>{studio.name} · one-time purchases</small></article>
    <article className={styles.stat}><span><Clock3 size={17}/> Needs review</span><strong>{pending.length}</strong><small>Pending payments · {revoked.length} revoked/refunded</small></article>
   </div>
   <section className={styles.products}><h2>Product sales</h2><div className={styles.productRow}><div><strong>{studio.name}</strong><small>Paid product · $19 list price</small></div><b>{paid.length} {paid.length===1?'sale':'sales'}</b><span>{revenue}</span></div><div className={styles.productRow}><div><strong>{guide.name}</strong><small>Free account access · no Dodo checkout</small></div><b>{rows.filter(row=>row.product_key==='fieldguide'&&row.access_status==='active').length} accesses</b><span>Free</span></div></section>
   <section className={styles.recent}><div className={styles.sectionTitle}><h2>Recent payments</h2><span>Latest {Math.min(studioRows.length,20)}</span></div>{studioRows.length===0?<p className={styles.empty}>No Launchpad Studio payments recorded yet. Completed Dodo checkouts will appear here.</p>:<div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Product</th><th>Date</th><th>Status</th><th>Amount charged</th></tr></thead><tbody>{studioRows.slice(0,20).map(row=><tr key={row.payment_id}><td>{products[row.product_key]}</td><td>{date(row.updated_at)}</td><td><span className={`${styles.badge} ${styles[row.access_status]}`}>{row.access_status==='active'?'Paid':row.access_status==='pending'?'Pending':'Revoked'}</span></td><td>{money(row.amount_cents,row.currency)}</td></tr>)}</tbody></table></div>}</section>
   <p className={styles.note}>Totals reflect verified amounts charged by Dodo, including tax, before processor fees. Refunded or disputed payments are excluded from collected totals. This page shows the latest 500 payment records.{amountUnknown>0?' * A legacy payment has no recorded amount and is excluded from the total.':''}</p>
  </section>
 </main>;
}
