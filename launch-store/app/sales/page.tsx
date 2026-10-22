import {notFound,redirect} from 'next/navigation';
import {TrendingUp,ShoppingBag,Clock3,Filter,Users} from 'lucide-react';
import {currentUser} from '@/lib/supabase/server';
import {adminClient} from '@/lib/supabase/admin';
import {guide,studio} from '@/lib/catalog';
import ShareSnapshot from './share-snapshot';
import CustomerAdmin,{type CustomerRecord,type PaymentExportRow} from './customer-admin';
import DashboardShell from './dashboard-shell';
import {isSalesAdmin} from '@/lib/platform-policy.mjs';
import {configuredSiteOrigin} from '@/lib/payment-policy.mjs';
import {TRAFFIC_SOURCES,resolvePageviewTrafficSource} from '@/lib/traffic-source.mjs';
import styles from './sales.module.css';

export const dynamic='force-dynamic';
export const metadata={title:'Sales dashboard — Hamza Idrishi',robots:{index:false,follow:false}};

type Purchase={payment_id:string;attempt_id:string;user_id:string;product_key:'studio'|'fieldguide';access_status:'active'|'pending'|'revoked';provider_status:string;amount_cents:number;currency:string;updated_at:string};
type CheckoutAttempt={id:string;user_id:string;product_key:'studio'|'fieldguide';provider_product_id:string;expected_cents:number;created_at:string};
type PageviewRow={viewed_on:string;path:'/'|'/products/first-product-fieldguide'|'/products/launchpad-studio'|'/fieldguide'|'/studio';visitor_hash:string};
type WorkspaceRow={user_id:string;state:Record<string,unknown>;updated_at:string};
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
  {data:workspaceData,error:workspaceError},
  {data:analyticsData,error:analyticsError},
  {data:salesData,error:salesError},
  usersResult
 ]=await Promise.all([
  db.from('platform_purchases').select('payment_id,attempt_id,user_id,product_key,access_status,provider_status,amount_cents,currency,updated_at').order('updated_at',{ascending:false}).limit(500),
  db.from('platform_checkout_attempts').select('id,user_id,product_key,provider_product_id,expected_cents,created_at').order('created_at',{ascending:false}).limit(500),
  db.from('site_pageviews').select('viewed_on,path,visitor_hash').order('viewed_on',{ascending:false}).limit(10000),
  db.from('platform_workspace').select('user_id,state,updated_at').order('updated_at',{ascending:false}).limit(500),
  db.rpc('get_site_analytics'),
  db.rpc('get_product_sales_summary'),
  db.auth.admin.listUsers({page:1,perPage:1000}).catch(()=>({data:{users:[]},error:null}))
 ]);
 if(error||salesError)throw new Error('Could not load sales dashboard');
 const analytics=(analyticsError?{total_visitors:0,today_visitors:0,by_product:{fieldguide:0,studio:0}}:analyticsData) as Analytics;
 const summary=salesData as SalesSummary;
 const rows=(data||[]) as Purchase[];
 const attempts=(attemptsError?[]:attemptsData||[]) as CheckoutAttempt[];
 const allPageviews=(pageviewsError?[]:pageviewsData||[]) as PageviewRow[];
 const pageviews=allPageviews.filter(p=>p.viewed_on>=start14Date);
 const workspaces=(workspaceError?[]:workspaceData||[]) as WorkspaceRow[];
 const authUsers=usersResult?.data?.users||[];
 const emailMap=new Map<string,string>();
 for(const u of authUsers){if(u.id&&u.email)emailMap.set(u.id,u.email);}

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
 const todaySales=rows.filter(r=>r.access_status==='active'&&r.updated_at?.slice(0,10)===todayUtc).length;

 // Total Views, Views Today & Traffic Sources Attribution
 const totalViews=Math.max(allPageviews.length,analytics.total_visitors);
 const todayViews=Math.max(allPageviews.filter(p=>p.viewed_on===todayUtc).length,analytics.today_visitors);
 const trafficStatsAll=TRAFFIC_SOURCES.map(src=>{
  const matching=allPageviews.filter(pv=>resolvePageviewTrafficSource(pv.visitor_hash)===src.key);
  const matchingToday=matching.filter(pv=>pv.viewed_on===todayUtc);
  const visitors=new Set(matching.map(pv=>pv.visitor_hash)).size;
  const todayVisitors=new Set(matchingToday.map(pv=>pv.visitor_hash)).size;
  return {
   ...src,
   shortLabel:(src as {shortLabel?:string}).shortLabel||src.label,
   views:matching.length,
   todayViews:matchingToday.length,
   visitors,
   todayVisitors
  };
 });
 const trafficSourcesToShow=trafficStatsAll.filter(s=>s.key!=='other'||s.views>0);

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

 // #3, #4 & #5 Customer Directory, Cross-Sell & Deep Studio 5-Stage Workspace Progress calculations
 const nicheNames:Record<string,string>={
  ai_hustle:'AI Side-Hustle',
  focus_habits:'Focus & Habits',
  prompt_mastery:'Prompt Mastery',
  threads_growth:'Threads Growth',
  job_resume:'Job & Resume',
  simple_budget:'Simple Budget',
  meal_prep:'Meal Prep',
  budget_travel:'Budget Travel'
 };
 type ParsedWorkspace={
  keys:number;
  updatedAt:string;
  nicheLabel:string|null;
  ideaFields:number;
  hasEvidence:boolean;
  customPostsCount:number;
  hasStoreScope:boolean;
  checksCompleted:number;
  summary:string;
 };
 const workspaceByUser=new Map<string,ParsedWorkspace>();
 const nicheCounts=new Map<string,number>();
 let stage1Count=0;
 let stage2Count=0;
 let stage3Count=0;
 let stage4Count=0;
 let stage5Count=0;
 let totalChecksAcrossUsers=0;
 let totalCustomPosts=0;

 for(const w of workspaces){
  const st=(w.state&&typeof w.state==='object'?w.state:{}) as Record<string,unknown>;
  const keys=Object.keys(st).length;
  const nicheKey=typeof st.niche==='string'?st.niche:'';
  const nicheLabel=nicheKey?(nicheNames[nicheKey]||nicheKey):null;
  if(keys>0&&nicheLabel)nicheCounts.set(nicheLabel,(nicheCounts.get(nicheLabel)||0)+1);
  const ideaFields=['audience','problem','freeTitle','paidTitle'].filter(k=>typeof st[k]==='string'&&(st[k] as string).trim().length>0).length;
  const hasEvidence=typeof st.evidence==='string'&&st.evidence.trim().length>0;
  const postsObj=st.posts&&typeof st.posts==='object'&&!Array.isArray(st.posts)?(st.posts as Record<string,unknown>):{};
  const customPostsCount=Object.values(postsObj).filter(v=>typeof v==='string'&&v.trim().length>0).length;
  const hasStoreScope=Boolean(
   (typeof st.deliverables==='string'&&st.deliverables.trim().length>0)||
   (typeof st.freeUrl==='string'&&st.freeUrl.trim().length>0)||
   (typeof st.paidUrl==='string'&&st.paidUrl.trim().length>0)
  );
  const checksObj=st.checks&&typeof st.checks==='object'&&!Array.isArray(st.checks)?(st.checks as Record<string,unknown>):{};
  const checksCompleted=[0,1,2,3,4,5,6].filter(i=>Boolean(checksObj[String(i)])).length;

  if(ideaFields>=4)stage1Count++;
  if(hasEvidence)stage2Count++;
  if(customPostsCount>0)stage3Count++;
  if(hasStoreScope)stage4Count++;
  if(checksCompleted>0)stage5Count++;
  totalChecksAcrossUsers+=checksCompleted;
  totalCustomPosts+=customPostsCount;

  const parts:string[]=[`${ideaFields}/4 idea`, `${checksCompleted}/7 checklist`];
  if(customPostsCount>0)parts.push(`${customPostsCount} post${customPostsCount===1?'':'s'}`);
  if(hasEvidence)parts.push('evidence logged');
  workspaceByUser.set(w.user_id,{
   keys,
   updatedAt:w.updated_at,
   nicheLabel,
   ideaFields,
   hasEvidence,
   customPostsCount,
   hasStoreScope,
   checksCompleted,
   summary:keys>0?parts.join(' · '):'Unlocked · not saved yet'
  });
 }

 const allUserIds=new Set<string>();
 for(const u of authUsers){if(u.id)allUserIds.add(u.id);}
 for(const r of rows){if(r.user_id)allUserIds.add(r.user_id);}
 for(const a of attempts){if(a.user_id)allUserIds.add(a.user_id);}
 for(const w of workspaces){if(w.user_id)allUserIds.add(w.user_id);}

 const authUserMap=new Map<string,{created_at?:string;last_sign_in_at?:string}>();
 for(const u of authUsers){if(u.id)authUserMap.set(u.id,u);}

 const customerProfiles=Array.from(allUserIds).map(uid=>{
  const au=authUserMap.get(uid);
  const userPurchases=rows.filter(r=>r.user_id===uid&&r.access_status==='active');
  const userAttempts=attempts.filter(a=>a.user_id===uid);
  const ownsStudio=userPurchases.some(p=>p.product_key==='studio');
  const ownsFieldguide=userPurchases.some(p=>p.product_key==='fieldguide');
  const triedStudio=userAttempts.filter(a=>a.product_key==='studio').length;
  const triedFieldguide=userAttempts.filter(a=>a.product_key==='fieldguide').length;
  const ws=workspaceByUser.get(uid);
  const spent:Record<string,number>={};
  for(const p of userPurchases){if(p.amount_cents>0)spent[p.currency]=(spent[p.currency]||0)+p.amount_cents;}
  const dates=[
   au?.last_sign_in_at,
   au?.created_at,
   ws?.updatedAt,
   ...userPurchases.map(p=>p.updated_at),
   ...userAttempts.map(a=>a.created_at)
  ].filter((x):x is string=>Boolean(x)).sort();
  const lastActivity=dates[dates.length-1]||new Date(0).toISOString();
  return {
   userId:uid,
   email:shortUser(uid,emailMap),
   ownsStudio,
   ownsFieldguide,
   triedStudio,
   triedFieldguide,
   workspaceKeys:ws?.keys||0,
   workspaceSummary:ws?.summary||null,
   nicheLabel:ws?.nicheLabel||null,
   checksCompleted:ws?.checksCompleted||0,
   workspaceUpdatedAt:ws?.updatedAt||null,
   spent,
   hasPaid:ownsStudio||ownsFieldguide,
   lastActivity
  };
 }).sort((a,b)=>Number(b.hasPaid)-Number(a.hasPaid)||b.lastActivity.localeCompare(a.lastActivity));

 const totalRegisteredUsers=customerProfiles.length;
 const todayRegisteredUsers=authUsers.filter(u=>u.created_at&&u.created_at.slice(0,10)===todayUtc).length;

 const bothOwners=customerProfiles.filter(c=>c.ownsStudio&&c.ownsFieldguide).length;
 const fgOnlyOwners=customerProfiles.filter(c=>c.ownsFieldguide&&!c.ownsStudio).length;
 const studioOnlyOwners=customerProfiles.filter(c=>c.ownsStudio&&!c.ownsFieldguide).length;
 const totalFgOwners=bothOwners+fgOnlyOwners;
 const totalStudioOwners=bothOwners+studioOnlyOwners;
 const activeStudioWorkspaces=customerProfiles.filter(c=>c.ownsStudio&&c.workspaceKeys>0).length;
 const fgOwnersTriedStudio=customerProfiles.filter(c=>c.ownsFieldguide&&!c.ownsStudio&&c.triedStudio>0).length;
 const unconvertedAccounts=customerProfiles.filter(c=>!c.hasPaid).length;
 const avgChecklist=workspaces.length>0?(totalChecksAcrossUsers/workspaces.length).toFixed(1):'0.0';
 const sortedNiches=Array.from(nicheCounts.entries()).sort((a,b)=>b[1]-a[1]);

 // #6 Pricing Tier Cohorts & Unit Economics calculations
 const studio9Attempts=studioAttempts.filter(a=>a.expected_cents===900);
 const studio9Paid=studio9Attempts.filter(a=>a.outcome==='active').length;
 const studio19Attempts=studioAttempts.filter(a=>a.expected_cents===1900);
 const studio19Paid=studio19Attempts.filter(a=>a.outcome==='active').length;
 const fg5Attempts=fgAttempts.filter(a=>a.expected_cents===500);
 const fg5Paid=fg5Attempts.filter(a=>a.outcome==='active').length;
 const fgPaidRows=fgRows.filter(r=>r.access_status==='active'&&r.amount_cents>0).length;
 const fgCompRows=fgRows.filter(r=>r.access_status==='active'&&r.amount_cents===0).length;
 const paidRowsWithAmount=rows.filter(r=>r.access_status==='active'&&r.amount_cents>0);
 const usdTotalCents=totalAmounts['USD']||0;
 const usdPaidCount=paidRowsWithAmount.filter(r=>r.currency==='USD').length;
 const avgOrderUsd=usdPaidCount>0?money(Math.round(usdTotalCents/usdPaidCount),'USD'):revenue;

 const trafficSummaryLine=trafficSourcesToShow
  .map(s=>`${s.shortLabel}: ${s.views}${s.todayViews>0?` (+${s.todayViews} today)`:''}`)
  .join(' · ');

 const shareText=[
  `Building in public update:`,
  `• Total views: ${totalViews.toLocaleString()} (${analytics.total_visitors.toLocaleString()} unique visitors)`,
  `• Views today: ${todayViews.toLocaleString()} (${analytics.today_visitors.toLocaleString()} unique today)`,
  `• Traffic sources: ${trafficSummaryLine}`,
  `• Sales: ${totalPaid} paid (${revenue} collected${todaySales>0?` · +${todaySales} today`:''}) — ${studio.name}: ${studioPaid} (${studioRevenue}), ${guide.name}: ${fgPaid} (${fgRevenue})`,
  `• Today registered users: ${todayRegisteredUsers} (${totalRegisteredUsers.toLocaleString()} total registered)`,
  `Building in public, one useful step at a time.`
 ].join('\n');

 const shareTemplates={
  milestone:shareText,
  funnel:[
   `Store funnel & traffic snapshot:`,
   `• Total views: ${totalViews.toLocaleString()} (${todayViews.toLocaleString()} views today)`,
   `• Traffic sources: ${trafficSummaryLine}`,
   `• Product page views: ${productVisitors.toLocaleString()} (${ totalAttempts } checkouts started)`,
   `• Sales: ${totalPaid} paid (${overallCheckoutCompletion} checkout conv. · ${revenue} collected)`,
   `• Registered users today: ${todayRegisteredUsers} (${totalRegisteredUsers.toLocaleString()} total users)`
  ].join('\n'),
  weekly:[
   `Last 7 days building in public:`,
   `• Total views: ${totalViews.toLocaleString()} (${todayViews.toLocaleString()} today · ${visitorsLast7.toLocaleString()} unique in 7d)`,
   `• Traffic sources: ${trafficSummaryLine}`,
   `• Sales: ${totalPaid} total paid (${salesLast7} in last 7d · ${revenue} total collected)`,
   `• Today registered users: ${todayRegisteredUsers} (${totalRegisteredUsers.toLocaleString()} total · ${activeStudioWorkspaces} active in Studio)`
  ].join('\n')
 };

 // Live Conversion & Checkout Diagnostic Insights
 const dodoEnv=process.env.DODO_PAYMENTS_ENVIRONMENT||'test_mode';
 const hasDodoKey=Boolean(process.env.DODO_PAYMENTS_API_KEY);
 const hasStudioProduct=Boolean(process.env.DODO_STUDIO_PRODUCT_ID);
 const hasFgProduct=Boolean(process.env.DODO_FIELDGUIDE_PRODUCT_ID);
 const dodoReady=hasDodoKey&&hasStudioProduct&&hasFgProduct;
 const isTestMode=dodoEnv!=='live_mode';
 const nonAdminUsers=customerProfiles.filter(c=>!isSalesAdmin(c.email,process.env.SALES_DASHBOARD_ADMIN_EMAIL));
 const unpaidSignupsWithoutAttempt=nonAdminUsers.filter(c=>!c.hasPaid&&c.triedStudio===0&&c.triedFieldguide===0).length;

 let primaryBottleneckTitle='Gathering initial visitor data';
 let primaryBottleneckDetail='Share your tracked links (?via=threads, ?via=x, ?via=fb) on social media to bring visitors into the store.';
 if(isTestMode||!dodoReady){
  primaryBottleneckTitle=isTestMode?'Dodo Payments is currently in TEST MODE':'Dodo product IDs or API key missing';
  primaryBottleneckDetail=isTestMode
   ?'Real customer cards will be declined while DODO_PAYMENTS_ENVIRONMENT is set to test_mode. Switch to live_mode with live product IDs ($5 Fieldguide & $9 Studio) in Vercel to accept real sales.'
   :'Ensure DODO_PAYMENTS_API_KEY, DODO_FIELDGUIDE_PRODUCT_ID, and DODO_STUDIO_PRODUCT_ID are configured in Vercel environment variables.';
 }else if(totalViews>0&&productVisitors===0){
  primaryBottleneckTitle='Visitors are landing on "/" but not opening product pages or checkout';
  primaryBottleneckDetail=`${totalViews} views recorded on the homepage, but 0 product detail views and 0 checkout attempts. Link directly to /products/first-product-fieldguide?via=threads ($5 impulse entry) in your posts.`;
 }else if(unpaidSignupsWithoutAttempt>0&&totalAttempts===0){
  primaryBottleneckTitle=`${unpaidSignupsWithoutAttempt} visitor(s) created an account after clicking Buy, then stopped before Dodo checkout`;
  primaryBottleneckDetail='Previously, /library?buy=... did not auto-launch Dodo checkout after account signup. This is now fixed so new signups from Buy buttons go straight into Dodo checkout.';
 }else if(totalViews>0&&totalAttempts===0){
  primaryBottleneckTitle=`${analytics.total_visitors} unique visitor(s) browsed (${productVisitors} product views), 0 started checkout`;
  primaryBottleneckDetail='Visitors are browsing without completing Step 1 account signup. Direct social posts to the $5 Fieldguide (/products/first-product-fieldguide?via=threads) as a low-friction entry offer.';
 }else if(totalAttempts>0&&totalPaid===0){
  primaryBottleneckTitle=`${totalAttempts} checkout attempt(s) started by ${uniqueAttemptUsers} user(s), 0 completed payment`;
  primaryBottleneckDetail='Visitors reached Dodo checkout but abandoned before paying—or Dodo product price/webhook settings need verification. Check the Recent Checkout Attempts table in the Funnel tab.';
 }else if(totalPaid>0){
  primaryBottleneckTitle=`Funnel active: ${totalPaid} paid sale(s) from ${totalAttempts} checkout attempt(s) (${overallCheckoutCompletion})`;
  primaryBottleneckDetail=abandonedAttempts.length>0
   ?`${abandonedAttempts.length} checkout attempt(s) were abandoned (${uniqueAbandonedUsers} unrecovered user(s)). Follow up with signed-up users in the Customers tab.`
   :'Checkout flow and payment reconciliation are operating normally.';
 }

 const overviewView=<>
  {analyticsError&&<p className={styles.note}>Visitor analytics could not be loaded right now. Refresh to try again.</p>}
  <div className={styles.stats}>
   <article className={styles.stat}>
    <span><ShoppingBag size={17}/> Collected revenue</span>
    <strong>{revenue}{amountUnknown>0&&<span className={styles.unknown}>*</span>}</strong>
    <small>{amountUnknown>0?`Excludes ${amountUnknown} legacy $0 row${amountUnknown===1?'':'s'}`:`Avg order ${avgOrderUsd} · includes tax`}</small>
   </article>
   <article className={styles.stat}>
    <span><Clock3 size={17}/> Paid sales</span>
    <strong>{totalPaid}</strong>
    <small>{todaySales} today · {uniquePaidUsers} buyer{uniquePaidUsers===1?'':'s'} ({totalPending} pending)</small>
   </article>
   <article className={styles.stat}>
    <span><TrendingUp size={17}/> Total views</span>
    <strong>{totalViews.toLocaleString()}</strong>
    <small>{todayViews.toLocaleString()} views today · {analytics.total_visitors.toLocaleString()} unique visitors</small>
   </article>
   <article className={styles.stat}>
    <span><Users size={17}/> Registered users</span>
    <strong>{totalRegisteredUsers.toLocaleString()}</strong>
    <small>{todayRegisteredUsers} registered today · {uniquePaidUsers} paid</small>
   </article>
   <article className={styles.stat}>
    <span><Filter size={17}/> Checkout conversion</span>
    <strong>{overallCheckoutCompletion}</strong>
    <small>{totalPaid}/{totalAttempts} checkouts paid · {abandonedAttempts.length} dropped</small>
   </article>
  </div>

  <section className={styles.cohortSection}>
   <div className={styles.sectionTitle}>
    <div><div className={styles.eyebrow}>CONVERSION DIAGNOSTIC · WHY VISITORS AREN’T BUYING YET</div><h2>{primaryBottleneckTitle}</h2></div>
    <span className={`${styles.badge} ${isTestMode||!dodoReady?styles.revoked:totalPaid>0?styles.active:styles.pending}`}>
     {isTestMode?'Dodo: TEST MODE':!dodoReady?'Config incomplete':'Dodo: LIVE MODE'}
    </span>
   </div>
   <p className={styles.note} style={{marginTop:0,marginBottom:'12px',color:'#1d2925',background:'#f8faf6',borderColor:'#cfe0c7'}}>
    <strong>Diagnosis:</strong> {primaryBottleneckDetail}
   </p>
   <div className={styles.cohortGrid}>
    <article className={styles.cohortCard}>
     <span>1. Storefront → Product views</span>
     <strong>{productVisitors} / {analytics.total_visitors}</strong>
     <small>{pct(productVisitors,analytics.total_visitors)} of unique visitors opened a product detail page ({analytics.by_product.fieldguide} Guide · {analytics.by_product.studio} Studio)</small>
    </article>
    <article className={styles.cohortCard}>
     <span>2. Visitors → Account signups</span>
     <strong>{nonAdminUsers.length} signup{nonAdminUsers.length===1?'':'s'}</strong>
     <small>{unpaidSignupsWithoutAttempt} signed up without starting Dodo checkout · {uniqueAttemptUsers} started checkout</small>
    </article>
    <article className={styles.cohortCard}>
     <span>3. Checkout → Paid completion</span>
     <strong>{totalPaid} / {totalAttempts}</strong>
     <small>{abandonedAttempts.length} abandoned at payment screen · {totalPending} pending webhook</small>
    </article>
    <article className={styles.cohortCard}>
     <span>4. Payment gateway status</span>
     <strong>{dodoEnv==='live_mode'?'Live mode':'Test mode'}</strong>
     <small>{dodoReady?'API key + $5/$9 product IDs set':'Missing Dodo env vars'} · Auto-checkout after signup enabled</small>
    </article>
   </div>
  </section>

  <section className={styles.trafficSection}>
   <div className={styles.sectionTitle}>
    <div><div className={styles.eyebrow}>TRAFFIC ATTRIBUTION · CHANNELS</div><h2>Traffic sources (Threads, X, Facebook, Pinterest, Medium, Google & Direct)</h2></div>
    <span>{totalViews.toLocaleString()} total views · {todayViews.toLocaleString()} today</span>
   </div>
   <div className={styles.trafficGrid}>
    {trafficSourcesToShow.map(src=>{
     const share=pct(src.views,Math.max(totalViews,1));
     const barWidth=totalViews>0?Math.min(100,Math.max(src.views>0?6:0,Math.round((src.views/totalViews)*100))):0;
     return <article key={src.key} className={styles.trafficCard}>
      <div className={styles.trafficTop}>
       <span>{src.label}</span>
       <span className={styles.funnelRate}>{share}</span>
      </div>
      <strong>{src.views.toLocaleString()} <span style={{fontSize:'13px',fontWeight:500,color:'#68736d'}}>views</span></strong>
      <small>{src.todayViews.toLocaleString()} today · {src.visitors.toLocaleString()} unique visitor{src.visitors===1?'':'s'}</small>
      <div className={styles.funnelBar}><div className={styles.funnelFill} style={{width:`${barWidth}%`}}/></div>
      <span className={styles.trafficHint} title={src.hint}>{src.hint}</span>
     </article>;
    })}
   </div>
  </section>

  <section className={styles.products}>
   <div className={styles.sectionTitle}>
    <div><div className={styles.eyebrow}>SHAREABLE SNAPSHOT · SOCIAL READY</div><h2>Copy Threads summary & product performance</h2></div>
   </div>
   <ShareSnapshot text={shareText} templates={shareTemplates} siteOrigin={configuredSiteOrigin()}/>
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
   <div className={styles.sectionTitle}><h2>Recent verified payments</h2><span>Latest {Math.min(rows.length,20)}</span></div>
   {rows.length===0?<p className={styles.empty}>No payments recorded yet. Completed Dodo checkouts will appear here.</p>:<div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Customer</th><th>Product</th><th>Date</th><th>Status</th><th>Amount charged</th></tr></thead><tbody>{rows.slice(0,20).map(row=><tr key={row.payment_id}><td><strong>{shortUser(row.user_id,emailMap)}</strong></td><td>{products[row.product_key]}</td><td>{date(row.updated_at)}</td><td><span className={`${styles.badge} ${styles[row.access_status]}`}>{row.access_status==='active'?'Paid':row.access_status==='pending'?'Pending':'Revoked'}</span></td><td>{money(row.amount_cents,row.currency)}</td></tr>)}</tbody></table></div>}
  </section>

  <p className={styles.note}>Visitor counts deduplicate a browser/IP and product per day using a one-way token. Traffic sources automatically detect referrals, mobile in-app browsers, and click IDs (fbclid, twclid) from Threads, X, Facebook, Pinterest, Medium, Google, and Direct visits (or ?via=threads / x / fb).{amountUnknown>0?' * '+amountUnknown+' legacy paid purchase(s) with unavailable amounts are excluded from collected totals.':''}</p>
 </>;

 const funnelView=<>
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

  <section className={styles.cohortSection}>
   <div className={styles.sectionTitle}>
    <div><div className={styles.eyebrow}>PRICING COHORTS & UNIT ECONOMICS</div><h2>Price tier performance ($9 vs $19 & $5 vs $0)</h2></div>
    <span>Tracked via expected_cents & amount_cents</span>
   </div>
   <div className={styles.cohortGrid}>
    <article className={styles.cohortCard}>
     <span>Studio $9 price cohort</span>
     <strong>{studio9Paid} / {studio9Attempts.length}</strong>
     <small>{pct(studio9Paid,studio9Attempts.length)} checkout completion at current $9 price</small>
    </article>
    <article className={styles.cohortCard}>
     <span>Studio $19 legacy cohort</span>
     <strong>{studio19Paid} / {studio19Attempts.length}</strong>
     <small>{pct(studio19Paid,studio19Attempts.length)} checkout completion at previous $19 price</small>
    </article>
    <article className={styles.cohortCard}>
     <span>Fieldguide $5 cohort</span>
     <strong>{fgPaidRows} paid · {fgCompRows} $0</strong>
     <small>{fg5Attempts.length} $5 checkout attempt{fg5Attempts.length===1?'':'s'} ({pct(fg5Paid,fg5Attempts.length)} conv.)</small>
    </article>
    <article className={styles.cohortCard}>
     <span>Average order & RPV</span>
     <strong>{avgOrderUsd}</strong>
     <small>{paidRowsWithAmount.length} charged order{paidRowsWithAmount.length===1?'':'s'} · {pct(totalPaid,analytics.total_visitors)} overall visitor conv.</small>
    </article>
   </div>
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
 </>;

 const trendsView=<>
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
 </>;

 const customersView=<>
  <section className={styles.customerSection}>
   <div className={styles.sectionTitle}>
    <div><div className={styles.eyebrow}>CUSTOMER JOURNEY & WORKSPACE USAGE</div><h2>Cross-sell, buyer engagement & access control</h2></div>
    <span>{customerProfiles.length} total account{customerProfiles.length===1?'':'s'}</span>
   </div>
   <div className={styles.customerGrid}>
    <article className={styles.customerCard}>
     <span>Registered accounts</span>
     <strong>{customerProfiles.length.toLocaleString()}</strong>
     <small>{uniquePaidUsers} paid buyer{uniquePaidUsers===1?'':'s'} · {unconvertedAccounts} unpaid account{unconvertedAccounts===1?'':'s'}</small>
    </article>
    <article className={styles.customerCard}>
     <span>Both products owned</span>
     <strong>{bothOwners.toLocaleString()}</strong>
     <small>{fgOnlyOwners} Fieldguide-only · {studioOnlyOwners} Studio-only</small>
    </article>
    <article className={styles.customerCard}>
     <span>Fieldguide → Studio upgrade</span>
     <strong>{pct(bothOwners,totalFgOwners)}</strong>
     <small>{fgOnlyOwners} upgrade candidate{fgOnlyOwners===1?'':'s'}{fgOwnersTriedStudio>0?` (${fgOwnersTriedStudio} tried checkout)`:''}</small>
    </article>
    <article className={styles.customerCard}>
     <span>Studio workspace active</span>
     <strong>{activeStudioWorkspaces}/{totalStudioOwners}</strong>
     <small>{pct(activeStudioWorkspaces,totalStudioOwners)} of Studio buyers saved cloud state</small>
    </article>
   </div>
   <CustomerAdmin
    customers={customerProfiles.map<CustomerRecord>(c=>({
     userId:c.userId,
     email:c.email,
     ownsStudio:c.ownsStudio,
     ownsFieldguide:c.ownsFieldguide,
     triedStudio:c.triedStudio,
     triedFieldguide:c.triedFieldguide,
     workspaceKeys:c.workspaceKeys,
     workspaceSummary:c.workspaceSummary,
     nicheLabel:c.nicheLabel,
     checksCompleted:c.checksCompleted,
     workspaceUpdatedAtFormatted:c.workspaceUpdatedAt?date(c.workspaceUpdatedAt):null,
     spentFormatted:formatAmounts(c.spent),
     hasPaid:c.hasPaid,
     lastActivityFormatted:date(c.lastActivity),
     lastActivityIso:c.lastActivity
    }))}
    paymentExportRows={[
     ...rows.map<PaymentExportRow>(r=>({
      type:'payment',
      id:r.payment_id,
      customer:shortUser(r.user_id,emailMap),
      product:products[r.product_key],
      status:r.access_status,
      amount:money(r.amount_cents,r.currency),
      dateIso:r.updated_at
     })),
     ...classifiedAttempts.map<PaymentExportRow>(a=>({
      type:'checkout_attempt',
      id:a.id,
      customer:shortUser(a.user_id,emailMap),
      product:products[a.product_key],
      status:a.outcome,
      amount:money(a.expected_cents,'USD'),
      dateIso:a.created_at
     }))
    ]}
   />
  </section>
 </>;

 const workspaceView=<>
  <section className={styles.stageSection}>
   <div className={styles.sectionTitle}>
    <div><div className={styles.eyebrow}>LAUNCHPAD STUDIO 5-STAGE PROGRESS</div><h2>Inside-workspace buyer completion</h2></div>
    <span>Avg {avgChecklist}/7 launch actions · {totalCustomPosts} custom posts drafted</span>
   </div>
   <div className={styles.stageGrid}>
    <article className={styles.stageCard}>
     <span>Step 1 · Validate idea</span>
     <strong>{stage1Count}/{workspaces.length}</strong>
     <small>Filled all 4 audience, problem & offer fields</small>
    </article>
    <article className={styles.stageCard}>
     <span>Step 2 · AI & evidence</span>
     <strong>{stage2Count}/{workspaces.length}</strong>
     <small>Recorded real customer research & evidence notes</small>
    </article>
    <article className={styles.stageCard}>
     <span>Step 3 · Content plan</span>
     <strong>{stage3Count}/{workspaces.length}</strong>
     <small>Customized 30-day Threads post drafts ({totalCustomPosts} total)</small>
    </article>
    <article className={styles.stageCard}>
     <span>Step 4 · Store & links</span>
     <strong>{stage4Count}/{workspaces.length}</strong>
     <small>Added concrete deliverables or live product URLs</small>
    </article>
    <article className={styles.stageCard}>
     <span>Step 5 · Launch checklist</span>
     <strong>{stage5Count}/{workspaces.length}</strong>
     <small>Checked off launch tasks (avg {avgChecklist} of 7)</small>
    </article>
   </div>
   <div className={styles.nicheStrip}>
    <strong>Active workspace niches:</strong>
    {sortedNiches.length===0?<span>No workspace niches saved yet.</span>:sortedNiches.map(([niche,cnt])=><span key={niche} className={styles.nichePill}>{niche}: {cnt}</span>)}
   </div>
  </section>
 </>;

 return <DashboardShell
  counts={{
   paidSales:totalPaid,
   abandonedCount:abandonedAttempts.length,
   visitors7d:visitorsLast7,
   customersCount:customerProfiles.length,
   activeWorkspaces:activeStudioWorkspaces
  }}
  overview={overviewView}
  funnel={funnelView}
  trends={trendsView}
  customers={customersView}
  workspace={workspaceView}
 />;
}


