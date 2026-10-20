import {notFound,redirect} from 'next/navigation';
import Link from 'next/link';
import {ArrowLeft,RefreshCw,TrendingUp,ShoppingBag,Clock3} from 'lucide-react';
import BrandMark from '../brand-mark';
import {currentUser} from '@/lib/supabase/server';
import {adminClient} from '@/lib/supabase/admin';
import {guide,studio} from '@/lib/catalog';
import ShareSnapshot from './share-snapshot';
import {isSalesAdmin} from '@/lib/platform-policy.mjs';
import styles from './sales.module.css';

export const dynamic='force-dynamic';
export const metadata={title:'Sales dashboard — Hamza Idrishi',robots:{index:false,follow:false}};

type Purchase={payment_id:string;product_key:'studio'|'fieldguide';access_status:'active'|'pending'|'revoked';provider_status:string;amount_cents:number;currency:string;updated_at:string};
type Analytics={total_visitors:number;today_visitors:number;by_product:{fieldguide:number;studio:number}};
type SalesSummary={studio:{paid_sales:number;pending_sales:number;revoked_sales:number;unknown_amount_sales:number;amounts:Record<string,number>};fieldguide:{accesses:number}};
const products={studio:studio.name,fieldguide:guide.name};
function money(cents:number,currency:string){try{return new Intl.NumberFormat('en-US',{style:'currency',currency}).format(cents/100)}catch{return `${(cents/100).toFixed(2)} ${currency}`} }
function date(value:string){return new Intl.DateTimeFormat('en-IN',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Kolkata'}).format(new Date(value))}

export default async function Sales(){
 const user=await currentUser();
 if(!user)redirect('/login?next=%2Fsales');
 if(!isSalesAdmin(user.email,process.env.SALES_DASHBOARD_ADMIN_EMAIL))notFound();
 const db=adminClient();
 const [{data,error},{data:analyticsData,error:analyticsError},{data:salesData,error:salesError}]=await Promise.all([
  db.from('platform_purchases').select('payment_id,product_key,access_status,provider_status,amount_cents,currency,updated_at').order('updated_at',{ascending:false}).limit(500),
  db.rpc('get_site_analytics'),
  db.rpc('get_product_sales_summary')
 ]);
 if(error||salesError)throw new Error('Could not load sales dashboard');
 const analytics=(analyticsError?{total_visitors:0,today_visitors:0,by_product:{fieldguide:0,studio:0}}:analyticsData) as Analytics;
 const summary=salesData as SalesSummary;
 const rows=(data||[]) as Purchase[];
 const studioRows=rows.filter(row=>row.product_key==='studio');
 const {paid_sales:paidCount,pending_sales:pendingCount,revoked_sales:revokedCount,unknown_amount_sales:amountUnknown,amounts}=summary.studio;
 const fieldguideAccesses=summary.fieldguide.accesses;
 const revenue=Object.entries(amounts).map(([currency,cents])=>money(cents,currency)).join(' · ')||money(0,'USD');
 const shareText=`My product progress so far:\n${analytics.total_visitors.toLocaleString()} unique visitors\n${studio.name}: ${paidCount} sales (${revenue} collected)\n${guide.name}: free · ${fieldguideAccesses} accesses\nBuilding in public, one useful step at a time.`;
 return <main className={styles.page}>
  <header className={styles.header}><BrandMark href="/" className="wordmark" icon/><Link className={styles.back} href="/"><ArrowLeft size={16}/> Landing page</Link></header>
  <section className={styles.content}>
   <div className={styles.heading}><div><div className={styles.eyebrow}>PRIVATE · OWNER VIEW</div><h1>Sales overview</h1><p>Verified Dodo payments recorded for your products.</p></div><Link className={styles.refresh} href="/sales"><RefreshCw size={15}/> Refresh</Link></div>
   {analyticsError&&<p className={styles.note}>Visitor analytics could not be loaded right now. Refresh to try again.</p>}
   <div className={styles.stats}>
    <article className={styles.stat}><span><TrendingUp size={17}/> Total visitors</span><strong>{analytics.total_visitors.toLocaleString()}</strong><small>{analytics.today_visitors.toLocaleString()} today · unique visitors</small></article>
    <article className={styles.stat}><span><ShoppingBag size={17}/> Collected</span><strong>{revenue}{amountUnknown>0&&<span className={styles.unknown}>*</span>}</strong><small>{amountUnknown>0?`Excludes ${amountUnknown} older payment${amountUnknown===1?'':'s'} with unavailable charge amount`:'Active Launchpad Studio payments · includes tax'}</small></article>
    <article className={styles.stat}><span><Clock3 size={17}/> Paid sales</span><strong>{paidCount}</strong><small>{studio.name} · {pendingCount} pending / {revokedCount} revoked</small></article>
   </div>
   <section className={styles.products}>
    <div className={styles.sectionTitle}><div><div className={styles.eyebrow}>SHAREABLE SNAPSHOT</div><h2>Product performance</h2></div><ShareSnapshot text={shareText}/></div>
    <div className={styles.tableWrap}><table className={`${styles.table} ${styles.shareTable}`}><thead><tr><th>Product</th><th>Visitors</th><th>Sales / access</th><th>Collected</th></tr></thead><tbody>
     <tr><td><strong>{studio.name}</strong><small>Paid · one-time</small></td><td>{analytics.by_product.studio.toLocaleString()}</td><td>{paidCount} sales</td><td>{revenue}{amountUnknown>0&&<span className={styles.unknown}>*</span>}</td></tr>
     <tr><td><strong>{guide.name}</strong><small>Free · account access</small></td><td>{analytics.by_product.fieldguide.toLocaleString()}</td><td>{fieldguideAccesses} accesses</td><td>Free</td></tr>
    </tbody><tfoot><tr><td><strong>Total</strong></td><td>{analytics.total_visitors.toLocaleString()}</td><td>{paidCount} paid sales</td><td>{revenue}{amountUnknown>0&&<span className={styles.unknown}>*</span>}</td></tr></tfoot></table></div>
   </section>
   <section className={styles.recent}><div className={styles.sectionTitle}><h2>Recent payments</h2><span>Latest {Math.min(studioRows.length,20)}</span></div>{studioRows.length===0?<p className={styles.empty}>No Launchpad Studio payments recorded yet. Completed Dodo checkouts will appear here.</p>:<div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Product</th><th>Date</th><th>Status</th><th>Amount charged</th></tr></thead><tbody>{studioRows.slice(0,20).map(row=><tr key={row.payment_id}><td>{products[row.product_key]}</td><td>{date(row.updated_at)}</td><td><span className={`${styles.badge} ${styles[row.access_status]}`}>{row.access_status==='active'?'Paid':row.access_status==='pending'?'Pending':'Revoked'}</span></td><td>{money(row.amount_cents,row.currency)}</td></tr>)}</tbody></table></div>}</section>
   <p className={styles.note}>Visitor counts deduplicate a browser/IP and product per day using a one-way token; they are estimates and can undercount shared networks or repeat devices. Sales totals reflect verified Dodo amounts charged including tax, before fees. Refunded/disputed purchases are excluded. Payment history shows the latest 500 records.{amountUnknown>0?' * '+amountUnknown+' legacy paid purchase(s) with unavailable amounts are excluded from collected totals.':''}</p>
  </section>
 </main>;
}
