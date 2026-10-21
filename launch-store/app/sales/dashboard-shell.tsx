'use client';
import {useState,type ReactNode} from 'react';
import Link from 'next/link';
import {
 LayoutDashboard,
 Filter,
 TrendingUp,
 Users,
 Layers,
 ArrowLeft,
 RefreshCw
} from 'lucide-react';
import BrandMark from '../brand-mark';
import styles from './sales.module.css';

export type NavTab='overview'|'funnel'|'trends'|'customers'|'workspace';

export default function DashboardShell({
 counts,
 kpiBanner,
 overview,
 funnel,
 trends,
 customers,
 workspace
}:{
 counts:{
  paidSales:number;
  abandonedCount:number;
  visitors7d:number;
  customersCount:number;
  activeWorkspaces:number;
 };
 kpiBanner:ReactNode;
 overview:ReactNode;
 funnel:ReactNode;
 trends:ReactNode;
 customers:ReactNode;
 workspace:ReactNode;
}){
 const [activeTab,setActiveTab]=useState<NavTab>('overview');

 const navItems:{
  id:NavTab;
  label:string;
  sub:string;
  badge:string|number;
  icon:typeof LayoutDashboard;
 }[]=[
  {
   id:'overview',
   label:'Overview',
   sub:'Key KPIs & sales',
   badge:counts.paidSales,
   icon:LayoutDashboard
  },
  {
   id:'funnel',
   label:'Conversion Funnel',
   sub:'Drop-offs & price cohorts',
   badge:counts.abandonedCount>0?`${counts.abandonedCount} drop`:'0',
   icon:Filter
  },
  {
   id:'trends',
   label:'14-Day Trends',
   sub:'Daily traffic & routes',
   badge:`${counts.visitors7d} (7d)`,
   icon:TrendingUp
  },
  {
   id:'customers',
   label:'Customers & Access',
   sub:'Directory, grant & CSV',
   badge:counts.customersCount,
   icon:Users
  },
  {
   id:'workspace',
   label:'Studio Progress',
   sub:'5-stage buyer usage',
   badge:counts.activeWorkspaces,
   icon:Layers
  }
 ];

 const currentItem=navItems.find(i=>i.id===activeTab)||navItems[0];

 return <div className={styles.shell}>
  <aside className={styles.sidebar} aria-label="Sales dashboard navigation">
   <div className={styles.sidebarTop}>
    <BrandMark href="/" className="wordmark" icon/>
    <span className={styles.ownerBadge}>OWNER ADMIN</span>
   </div>

   <nav className={styles.sideNav}>
    <span className={styles.sideNavLabel}>ANALYTICS & TOOLS</span>
    {navItems.map(item=>{
     const Icon=item.icon;
     const isActive=activeTab===item.id;
     return <button
      key={item.id}
      type="button"
      onClick={()=>setActiveTab(item.id)}
      className={`${styles.sideNavBtn} ${isActive?styles.sideNavActive:''}`}
      aria-current={isActive?'page':undefined}
     >
      <Icon size={17} className={styles.sideNavIcon}/>
      <span className={styles.sideNavText}>
       <strong>{item.label}</strong>
       <small>{item.sub}</small>
      </span>
      <span className={styles.sideNavCount}>{item.badge}</span>
     </button>;
    })}
   </nav>

   <div className={styles.sidebarFooter}>
    <Link className={styles.sideFooterLink} href="/sales"><RefreshCw size={14}/> Refresh live data</Link>
    <Link className={styles.sideFooterLink} href="/"><ArrowLeft size={14}/> Back to storefront</Link>
   </div>
  </aside>

  <main className={styles.mainPane}>
   <header className={styles.mainHeader}>
    <div>
     <div className={styles.eyebrow}>PRIVATE · OWNER VIEW</div>
     <h1>{currentItem.label}</h1>
     <p>{currentItem.sub}</p>
    </div>
    <div className={styles.headerActions}>
     <Link className={styles.refresh} href="/sales"><RefreshCw size={15}/> Refresh</Link>
     <Link className={styles.back} href="/"><ArrowLeft size={15}/> Storefront</Link>
    </div>
   </header>

   {kpiBanner}

   <div className={styles.tabContent}>
    {activeTab==='overview'&&overview}
    {activeTab==='funnel'&&funnel}
    {activeTab==='trends'&&trends}
    {activeTab==='customers'&&customers}
    {activeTab==='workspace'&&workspace}
   </div>
  </main>
 </div>;
}
