import {notFound,redirect} from 'next/navigation';
import Link from 'next/link';
import {ArrowLeft,RefreshCw,TrendingUp,ShoppingBag,Clock3,Filter} from 'lucide-react';
import BrandMark from '../brand-mark';
import {currentUser} from '@/lib/supabase/server';
import {adminClient} from '@/lib/supabase/admin';
import {guide,studio} from '@/lib/catalog';
import ShareSnapshot from './share-snapshot';
import {isSalesAdmin} from '@/lib/platform-policy.mjs';
import styles from './sales.module.css';

export const dynamic='force-dynamic';
export const metadata={title:'Sales dashboard — Hamza Idrishi',robots:{index:false,follow:false}};

type Purchase={payment_id:string;attempt_id:string;user_id:string;product_key:'studio'|'fieldguide';access_status:'active'|'pending'|'revoked';provider_status:string;amount_cents:number;currency:string;updated_at:string};
type CheckoutAttempt={id:string;user_id:string;product_key:'studio'|'fieldguide';provider_product_id:string;expected_cents:number;created_at:string};
type PageviewRow={viewed_on:string;path:'/'|'/products/first-product-fieldguide'|'/products/launchpad-studio'|'/fieldguide'|'/studio';visitor_hash:string};
type Analytics={total_visitors:number;today_visitors:number;by_product:{fieldguide:number;studio:number}};
type ProductSales={paid_sales?:number;accesses?:number;pending_sales?:number;revoked_sales?:number;unknown_amount_sales?:number;amounts?:Record<string,number>};
type SalesSummary={studio:Required<Omit<ProductSales,'accesses'>>;fieldguide:ProductSales};
const products={studio:studio.name,fieldguide:guide.name};
function money(cents:number,currency:string){try{return new Intl.NumberFormat('en-US',{style:'currency',currency}).format(cents/100)}catch{return `${(cents/100).toFixed(2)} ${currency}`} }
function formatAmounts(amounts:Record<string,number>){return Object.entries(amounts).map(([currency,cents])=>money(cents,currency)).join(' · ')||money(0,'USD');}
function date(value:string){return new Intl.DateTimeFormat('en-IN',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Kolkata'}).format(new Date(value))}
function shortDay(isoDate:string){const [y,m,d]=isoDate.split('-').map(Number);return new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',timeZone:'UTC'}).format(new Date(Date.UTC(y,m-1,d)));}
function pct(numerator:number,denominator:number){if(denominator<=0)return '0.0%';const val=(numerator/denominator)*100;return `${val>=10?val.toFixed(1):val.toFixed(1)}%`;}
function deltaLabel(curr:number,prev:number,unit:string){if(prev===0)return curr>0?`+${curr} vs prior 7d`:`0 ${unit} prior 7d`;const diff=curr-prev;const sign=diff>0?'+':'';return `${sign}${diff} vs prior 7d (${prev})`;}
function shortUser(userId:string,emailMap:Map<string,string>){return emailMap.get(userId)||`user_${userId.slice(0,8)}`;}

export default async function Sales(){
 const user=await currentUser();
 if(!user)redirect('/login?next=%2Fsales');
 if(!isSalesAdmin(user.email,process.env.SALES_DASHBOARD_ADMIN_EMAIL))notFound();
 const db=adminClient();

 const now=new Date();
 const days14:string[]=[];
 for(let i=13;i>=0;i--){
  const d=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()-i));
  days14.push(d.toISOString().slice(0,10));
 }
 const start14Date=days14[0];
 const todayUtc=days14[days14.length-1];

 const [
  {data,error},
  {data:attemptsData,error:attemptsError},
  {data:pageviewsData,error:pageviewsError},
  {data:analyticsData,error:analyticsError},
  {data:salesData,error:salesError},
  usersResult
 ]=await Promise.all([
  db.from('platform_purchases').select('payment_id,attempt_id,user_id,product_key,access_status,provider_status,amount_cents,currency,updated_at').order('updated_at',{ascending:false}).limit(500),
  db.from('platform_checkout_attempts').select('id,user_id,product_key,provider_product_id,expected_cents,created_at').order('created_at',{ascending:false}).limit(500),
  db.from('site_pageviews').select('viewed_on,path,visitor_hash').gte('viewed_on',start14Date).limit(5000),
  db.rpc('get_site_analytics'),
  db.rpc('get_product_sales_summary'),
  db.auth.admin.listUsers({page:1,perPage:1000}).catch(()=>({data:{users:[]},error:null}))
 ]);
 if(error||salesError)throw new Error('Could not load sales dashboard');
 const analytics=(analyticsError?{total_visitors:0,today_visitors:0,by_product:{fieldguide:0,studio:0}}:analyticsData) as Analytics;
 const summary=salesData as SalesSummary;
 const rows=(data||[]) as Purchase[];
 const attempts=(attemptsError?[]:attemptsData||[]) as CheckoutAttempt[];
 const pageviews=(pageviewsError?[]:pageviewsData||[]) as PageviewRow[];
 const emailMap=new Map<string,string>();
 for(const u of usersResult?.data?.users||[]){if(u.id&&u.email)emailMap.set(u.id,u.email);}

 const fgRows=rows.filter(r=>r.product_key==='fieldguide');
 const fgPaid=summary.fieldguide.paid_sales??summary.fieldguide.accesses??fgRows.filter(r=>r.access_status==='active').length;
 const fgPending=summary.fieldguide.pending_sales??fgRows.filter(r=>r.access_status==='pending').length;
 const fgRevoked=summary.fieldguide.revoked_sales??fgRows.filter(r=>r.access_status==='revoked').length;
 const fgUnknown=summary.fieldguide.unknown_amount_sales??fgRows.filter(r=>r.access_status==='active'&&r.amount_cents===0).length;
 const fgAmounts=summary.fieldguide.amounts??fgRows.filter(r=>r.access_status==='active'&&r.amount_cents>0).reduce<Record<string,number>>((acc,r)=>{acc[r.currency]=(acc[r.currency]||0)+r.amount_cents;return acc;},{});
 const {paid_sales:studioPaid,pending_sales:studioPending,revoked_sales:studioRevoked,unknown_amount_sales:studioUnknown,amounts:studioAmounts}=summary.studio;
 const totalPaid=studioPaid+fgPaid;
 const totalPending=studioPending+fgPending;
 const totalRevoked=studioRevoked+fgRevoked;
 const amountUnknown=studioUnknown+fgUnknown;
 const totalAmounts:Record<string,number>={...studioAmounts};
 for(const [c,v] of Object.entries(fgAmounts))totalAmounts[c]=(totalAmounts[c]||0)+v;
 const studioRevenue=formatAmounts(studioAmounts);
 const fgRevenue=formatAmounts(fgAmounts);
 const revenue=formatAmounts(totalAmounts);

 // Conversion Funnel & Checkout Drop-off calculations
 const purchaseByAttempt=new Map<string,Purchase>();
 const activeUserProducts=new Set<string>();
 for(const r of rows){
  if(r.attempt_id)purchaseByAttempt.set(r.attempt_id,r);
  if(r.access_status==='active'&&r.user_id)activeUserProducts.add(`${r.user_id}:${r.product_key}`);
 }
 const classifiedAttempts=attempts.map(attempt=>{
  const p=purchaseByAttempt.get(attempt.id);
  const hasActiveForProduct=activeUserProducts.has(`${attempt.user_id}:${attempt.product_key}`);
  const outcome:'active'|'pending'|'revoked'|'recovered'|'abandoned'=p
   ?p.access_status
   :hasActiveForProduct
    ?'recovered'
    :'abandoned';
  return {...attempt,outcome,purchase:p};
 });

 const totalAttempts=classifiedAttempts.length;
 const studioAttempts=classifiedAttempts.filter(a=>a.product_key==='studio');
 const fgAttempts=classifiedAttempts.filter(a=>a.product_key==='fieldguide');
 const abandonedAttempts=classifiedAttempts.filter(a=>a.outcome==='abandoned');
 const recoveredAttempts=classifiedAttempts.filter(a=>a.outcome==='recovered');
 const studioAbandonedUsers=new Set(studioAttempts.filter(a=>a.outcome==='abandoned').map(a=>a.user_id)).size;
 const fgAbandonedUsers=new Set(fgAttempts.filter(a=>a.outcome==='abandoned').map(a=>a.user_id)).size;
 const uniqueAttemptUsers=new Set(classifiedAttempts.map(a=>a.user_id)).size;
 const uniquePaidUsers=new Set(rows.filter(r=>r.access_status==='active'&&r.user_id).map(r=>r.user_id)).size;
 const uniqueAbandonedUsers=new Set(abandonedAttempts.map(a=>a.user_id)).size;

 const productVisitors=analytics.by_product.studio+analytics.by_product.fieldguide;
 const topBase=Math.max(analytics.total_visitors,productVisitors,totalAttempts,totalPaid,1);
 const studioCompletionRate=pct(studioPaid,studioAttempts.length);
 const fgCompletionRate=pct(fgPaid,fgAttempts.length);
 const overallCheckoutCompletion=pct(totalPaid,totalAttempts);
 const overallDropoffRate=totalAttempts>0?pct(abandonedAttempts.length,totalAttempts):'0.0%';

 // 14-Day Daily Traffic & Revenue Time-Series calculations
 const dailyVisitorsMap=new Map<string,Set<string>>();
 const dailyAttemptsMap=new Map<string,number>();
 const dailySalesMap=new Map<string,number>();
 const dailyAmountsMap=new Map<string,Record<string,number>>();
 for(const d of days14){
  dailyVisitorsMap.set(d,new Set());
  dailyAttemptsMap.set(d,0);
  dailySalesMap.set(d,0);
  dailyAmountsMap.set(d,{});
 }
 for(const pv of pageviews){
  const bucket=dailyVisitorsMap.get(pv.viewed_on);
  if(bucket)bucket.add(pv.visitor_hash);
 }
 for(const a of attempts){
  const d=a.created_at?.slice(0,10);
  if(d&&dailyAttemptsMap.has(d))dailyAttemptsMap.set(d,(dailyAttemptsMap.get(d)||0)+1);
 }
 for(const r of rows){
  if(r.access_status!=='active')continue;
  const d=r.updated_at?.slice(0,10);
  if(d&&dailySalesMap.has(d)){
   dailySalesMap.set(d,(dailySalesMap.get(d)||0)+1);
   if(r.amount_cents>0){
    const amt=dailyAmountsMap.get(d)!;
    amt[r.currency]=(amt[r.currency]||0)+r.amount_cents;
   }
  }
 }
 const dailySeries=days14.map(d=>({
  date:d,
  label:shortDay(d),
  visitors:dailyVisitorsMap.get(d)?.size||0,
  attempts:dailyAttemptsMap.get(d)||0,
  sales:dailySalesMap.get(d)||0,
  amounts:dailyAmountsMap.get(d)||{}
 }));
 const maxDailyVisitors=Math.max(...dailySeries.map(d=>d.visitors),1);
 const prev7=dailySeries.slice(0,7);
 const last7=dailySeries.slice(7,14);
 const visitorsLast7=new Set(pageviews.filter(p=>p.viewed_on>=days14[7]).map(p=>p.visitor_hash)).size;
 const visitorsPrev7=new Set(pageviews.filter(p=>p.viewed_on<days14[7]).map(p=>p.visitor_hash)).size;
 const attemptsLast7=last7.reduce((s,d)=>s+d.attempts,0);
 const attemptsPrev7=prev7.reduce((s,d)=>s+d.attempts,0);
 const salesLast7=last7.reduce((s,d)=>s+d.sales,0);
 const salesPrev7=prev7.reduce((s,d)=>s+d.sales,0);
 const amountsLast7:Record<string,number>={};
 for(const d of last7){for(const [c,v] of Object.entries(d.amounts))amountsLast7[c]=(amountsLast7[c]||0)+v;}

 const routeDefs:{path:PageviewRow['path'];title:string;kind:string}[]=[
  {path:'/',title:'Storefront /',kind:'Landing page'},
  {path:'/products/launchpad-studio',title:'Studio detail',kind:'Product page'},
  {path:'/products/first-product-fieldguide',title:'Fieldguide detail',kind:'Product page'},
  {path:'/studio',title:'Studio workspace',kind:'Buyer usage'},
  {path:'/fieldguide',title:'Fieldguide reader',kind:'Buyer usage'}
 ];
 const routeStats=routeDefs.map(def=>{
  const matching=pageviews.filter(p=>p.path===def.path);
  const visitors14d=new Set(matching.map(p=>p.visitor_hash)).size;
  const visitorsToday=new Set(matching.filter(p=>p.viewed_on===todayUtc).map(p=>p.visitor_hash)).size;
  return {...def,visitors14d,visitorsToday};
 });

 const shareText=`My product progress so far:\n${analytics.total_visitors.toLocaleString()} unique visitors\n${studio.name}: ${studioPaid} sales (${studioRevenue} collected)\n${guide.name}: ${fgPaid} sales (${fgRevenue} collected)\nBuilding in public, one useful step at a time.`;
 return <main className={styles.page}>
  <header className={styles.header}><BrandMark href="/" className="wordmark" icon/><Link className={styles.back} href="/"><ArrowLeft size={16}/> Landing page</Link></header>
  <section className={styles.content}>
   <div className={styles.heading}><div><div className={styles.eyebrow}>PRIVATE · OWNER VIEW</div><h1>Sales overview</h1><p>Verified Dodo payments, conversion funnel, and 14-day traffic & revenue trends.</p></div><Link className={styles.refresh} href="/sales"><RefreshCw size={15}/> Refresh</Link></div>
   {analyticsError&&<p className={styles.note}>Visitor analytics could not be loaded right now. Refresh to try again.</p>}
   <div className={styles.stats}>
    <article className={styles.stat}><span><TrendingUp size={17}/> Total visitors</span><strong>{analytics.total_visitors.toLocaleString()}</strong><small>{analytics.today_visitors.toLocaleString()} today · unique visitors</small></article>
    <article className={styles.stat}><span><ShoppingBag size={17}/> Collected</span><strong>{revenue}{amountUnknown>0&&<span className={styles.unknown}>*</span>}</strong><small>{amountUnknown>0?`Excludes ${amountUnknown} older payment${amountUnknown===1?'':'s'} with unavailable charge amount`:'Active verified payments · includes tax'}</small></article>
    <article className={styles.stat}><span><Clock3 size={17}/> Paid sales</span><strong>{totalPaid}</strong><small>{totalPending} pending / {totalRevoked} revoked · {uniquePaidUsers} buyer{uniquePaidUsers===1?'':'s'}</small></article>
   </div>

   <section className={styles.funnelSection}>
    <div className={styles.sectionTitle}>
     <div><div className={styles.eyebrow}>CONVERSION FUNNEL & DROP-OFF</div><h2>Visitor to paid checkout flow</h2></div>
     <span>{overallCheckoutCompletion} checkout completion · {overallDropoffRate} unrecovered drop-off</span>
    </div>
    <div className={styles.funnelGrid}>
     <article className={styles.funnelStep}>
      <div className={styles.funnelStepTop}><span>1. Store visitors</span><span className={styles.funnelRate}>100%</span></div>
      <strong>{analytics.total_visitors.toLocaleString()}</strong>
      <small>{analytics.today_visitors.toLocaleString()} active today across all pages</small>
      <div className={styles.funnelBar}><div className={styles.funnelFill} style={{width:'100%'}}/></div>
     </article>
     <article className={styles.funnelStep}>
      <div className={styles.funnelStepTop}><span>2. Product views</span><span className={styles.funnelRate}>{pct(productVisitors,analytics.total_visitors)}</span></div>
      <strong>{productVisitors.toLocaleString()}</strong>
      <small>{analytics.by_product.studio.toLocaleString()} Studio · {analytics.by_product.fieldguide.toLocaleString()} Fieldguide</small>
      <div className={styles.funnelBar}><div className={styles.funnelFill} style={{width:`${Math.min(100,Math.max(4,Math.round((productVisitors/topBase)*100)))}%`}}/></div>
     </article>
     <article className={styles.funnelStep}>
      <div className={styles.funnelStepTop}><span>3. Checkout started</span><span className={styles.funnelRate}>{pct(totalAttempts,Math.max(productVisitors,analytics.total_visitors))}</span></div>
      <strong>{totalAttempts.toLocaleString()}</strong>
      <small>{uniqueAttemptUsers} user{uniqueAttemptUsers===1?'':'s'} · {studioAttempts.length} Studio, {fgAttempts.length} Guide</small>
      <div className={styles.funnelBar}><div className={styles.funnelFill} style={{width:`${Math.min(100,Math.max(4,Math.round((totalAttempts/topBase)*100)))}%`}}/></div>
     </article>
     <article className={styles.funnelStep}>
      <div className={styles.funnelStepTop}><span>4. Paid & unlocked</span><span className={styles.funnelRate}>{overallCheckoutCompletion} of checkouts</span></div>
      <strong>{totalPaid.toLocaleString()}</strong>
      <small>{abandonedAttempts.length} abandoned ({uniqueAbandonedUsers} unrecovered user{uniqueAbandonedUsers===1?'':'s'}){recoveredAttempts.length>0?` · ${recoveredAttempts.length} retry recovered`:''}</small>
      <div className={styles.funnelBar}><div className={styles.funnelFill} style={{width:`${Math.min(100,Math.max(4,Math.round((totalPaid/topBase)*100)))}%`}}/></div>
     </article>
    </div>
   </section>

   <section className={styles.trendSection}>
    <div className={styles.sectionTitle}>
     <div><div className={styles.eyebrow}>DAILY TRAFFIC & REVENUE TRENDS</div><h2>Last 14 days activity</h2></div>
     <span>{shortDay(days14[0])} – {shortDay(todayUtc)} (UTC)</span>
    </div>
    <div className={styles.trendCard}>
     <div className={styles.trendKpis}>
      <div className={styles.trendKpi}>
       <span>7-day visitors</span>
       <strong>{visitorsLast7.toLocaleString()}</strong>
       <small>{deltaLabel(visitorsLast7,visitorsPrev7,'visitors')}</small>
      </div>
      <div className={styles.trendKpi}>
       <span>7-day checkouts</span>
       <strong>{attemptsLast7.toLocaleString()}</strong>
       <small>{deltaLabel(attemptsLast7,attemptsPrev7,'attempts')}</small>
      </div>
      <div className={styles.trendKpi}>
       <span>7-day paid sales</span>
       <strong>{salesLast7.toLocaleString()}</strong>
       <small>{deltaLabel(salesLast7,salesPrev7,'sales')}</small>
      </div>
      <div className={styles.trendKpi}>
       <span>7-day collected</span>
       <strong>{formatAmounts(amountsLast7)}</strong>
       <small>{pct(salesLast7,attemptsLast7)} 7d checkout completion</small>
      </div>
     </div>
     <div className={styles.chartGrid} role="img" aria-label="14-day daily visitors and sales bar chart">
      {dailySeries.map(day=>{
       const heightPct=day.visitors>0?Math.max(10,Math.round((day.visitors/maxDailyVisitors)*100)):4;
       const dayRev=formatAmounts(day.amounts);
       return <div key={day.date} className={styles.barCol} title={`${day.label}: ${day.visitors} unique visitors, ${day.attempts} checkout attempts, ${day.sales} paid sales (${dayRev})`}>
        {day.sales>0?<span className={styles.barSaleTag}>+{day.sales}</span>:<span className={styles.barValue}>{day.visitors}</span>}
        <div className={styles.barTrack}>
         <div className={`${styles.barFill} ${day.sales>0?styles.barFillSale:''}`} style={{height:`${heightPct}%`}}/>
        </div>
        <span className={styles.barLabel}>{day.label.replace(' ','\u00A0')}</span>
       </div>;
      })}
     </div>
     <div className={styles.routeGrid}>
      {routeStats.map(r=><div key={r.path} className={styles.routeCard}>
       <span>{r.title}</span>
       <strong>{r.visitors14d.toLocaleString()}</strong>
       <small>{r.visitorsToday} today · {r.kind}</small>
      </div>)}
     </div>
    </div>
   </section>

   <section className={styles.products}>
    <div className={styles.sectionTitle}><div><div className={styles.eyebrow}>SHAREABLE SNAPSHOT</div><h2>Product performance & funnel</h2></div><ShareSnapshot text={shareText}/></div>
    <div className={styles.tableWrap}><table className={`${styles.table} ${styles.shareTable}`}><thead><tr><th>Product</th><th>Visitors</th><th>Checkouts</th><th>Paid sales</th><th>Checkout conv.</th><th>Unrecovered</th><th>Collected</th></tr></thead><tbody>
     <tr>
      <td><strong>{studio.name}</strong><small>$9 · one-time</small></td>
      <td>{analytics.by_product.studio.toLocaleString()}<small>{pct(studioPaid,analytics.by_product.studio)} visitor conv.</small></td>
      <td>{studioAttempts.length}<small>{new Set(studioAttempts.map(a=>a.user_id)).size} unique user{new Set(studioAttempts.map(a=>a.user_id)).size===1?'':'s'}</small></td>
      <td>{studioPaid} sales</td>
      <td>{studioCompletionRate}</td>
      <td>{studioAbandonedUsers} user{studioAbandonedUsers===1?'':'s'}<small>{studioAttempts.filter(a=>a.outcome==='abandoned').length} attempt{studioAttempts.filter(a=>a.outcome==='abandoned').length===1?'':'s'}</small></td>
      <td>{studioRevenue}{studioUnknown>0&&<span className={styles.unknown}>*</span>}</td>
     </tr>
     <tr>
      <td><strong>{guide.name}</strong><small>$5 · one-time</small></td>
      <td>{analytics.by_product.fieldguide.toLocaleString()}<small>{pct(fgPaid,analytics.by_product.fieldguide)} visitor conv.</small></td>
      <td>{fgAttempts.length}<small>{new Set(fgAttempts.map(a=>a.user_id)).size} unique user{new Set(fgAttempts.map(a=>a.user_id)).size===1?'':'s'}</small></td>
      <td>{fgPaid} sales</td>
      <td>{fgCompletionRate}</td>
      <td>{fgAbandonedUsers} user{fgAbandonedUsers===1?'':'s'}<small>{fgAttempts.filter(a=>a.outcome==='abandoned').length} attempt{fgAttempts.filter(a=>a.outcome==='abandoned').length===1?'':'s'}</small></td>
      <td>{fgRevenue}{fgUnknown>0&&<span className={styles.unknown}>*</span>}</td>
     </tr>
    </tbody><tfoot><tr><td><strong>Total</strong></td><td>{analytics.total_visitors.toLocaleString()}</td><td>{totalAttempts} attempts</td><td>{totalPaid} paid sales</td><td>{overallCheckoutCompletion}</td><td>{uniqueAbandonedUsers} user{uniqueAbandonedUsers===1?'':'s'}</td><td>{revenue}{amountUnknown>0&&<span className={styles.unknown}>*</span>}</td></tr></tfoot></table></div>
   </section>

   <section className={styles.recent}>
    <div className={styles.sectionTitle}>
     <div><div className={styles.eyebrow}>CHECKOUT INTENT & DROP-OFF LOG</div><h2>Recent checkout attempts</h2></div>
     <span><Filter size={13} style={{verticalAlign:'-2px',marginRight:4}}/>Latest {Math.min(classifiedAttempts.length,20)} of {classifiedAttempts.length} attempts</span>
    </div>
    {classifiedAttempts.length===0?<p className={styles.empty}>No checkout attempts recorded yet. When signed-in users click a checkout button, their attempt and completion status will appear here.</p>:<div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Customer</th><th>Product</th><th>Started at</th><th>Funnel status</th><th>Expected / Charged</th></tr></thead><tbody>{classifiedAttempts.slice(0,20).map(attempt=>{
     const label=attempt.outcome==='active'?'Paid':attempt.outcome==='pending'?'Pending webhook':attempt.outcome==='recovered'?'Recovered on retry':attempt.outcome==='revoked'?'Revoked':'Abandoned checkout';
     const amountText=attempt.purchase&&attempt.purchase.amount_cents>0?money(attempt.purchase.amount_cents,attempt.purchase.currency):money(attempt.expected_cents,'USD');
     return <tr key={attempt.id}>
      <td><strong>{shortUser(attempt.user_id,emailMap)}</strong></td>
      <td>{products[attempt.product_key]}</td>
      <td>{date(attempt.created_at)}</td>
      <td><span className={`${styles.badge} ${styles[attempt.outcome]}`}>{label}</span></td>
      <td>{amountText}</td>
     </tr>;
    })}</tbody></table></div>}
   </section>

   <section className={styles.recent}><div className={styles.sectionTitle}><h2>Recent verified payments</h2><span>Latest {Math.min(rows.length,20)}</span></div>{rows.length===0?<p className={styles.empty}>No payments recorded yet. Completed Dodo checkouts will appear here.</p>:<div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Customer</th><th>Product</th><th>Date</th><th>Status</th><th>Amount charged</th></tr></thead><tbody>{rows.slice(0,20).map(row=><tr key={row.payment_id}><td><strong>{shortUser(row.user_id,emailMap)}</strong></td><td>{products[row.product_key]}</td><td>{date(row.updated_at)}</td><td><span className={`${styles.badge} ${styles[row.access_status]}`}>{row.access_status==='active'?'Paid':row.access_status==='pending'?'Pending':'Revoked'}</span></td><td>{money(row.amount_cents,row.currency)}</td></tr>)}</tbody></table></div>}</section>
   <p className={styles.note}>Visitor counts deduplicate a browser/IP and product per day using a one-way token; they are estimates and can undercount shared networks or repeat devices. Checkout attempts track every initiated Dodo session in <code>platform_checkout_attempts</code> and match against verified <code>platform_purchases</code> to distinguish true checkout drop-offs from users who completed payment on a subsequent retry.{amountUnknown>0?' * '+amountUnknown+' legacy paid purchase(s) with unavailable amounts are excluded from collected totals.':''}</p>
  </section>
 </main>;
}

