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
 RefreshCw,
 PanelLeftOpen,
 PanelLeftClose,
 X
} from 'lucide-react';
import BrandMark from '../brand-mark';
import styles from './sales.module.css';

export type NavTab='overview'|'funnel'|'trends'|'customers'|'workspace';

export default function DashboardShell({
 counts,
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
 overview:ReactNode;
 funnel:ReactNode;
 trends:ReactNode;
 customers:ReactNode;
 workspace:ReactNode;
}){
 const [activeTab,setActiveTab]=useState<NavTab>('overview');
 const [drawerOpen,setDrawerOpen]=useState(false);

 const navItems:{
  id:NavTab;
  shortLabel:string;
  label:string;
  sub:string;
  badge:string|number;
  icon:typeof LayoutDashboard;
 }[]=[
  {
   id:'overview',
   shortLabel:'KPIs',
   label:'Overview & KPIs',
   sub:'Core metrics & recent sales',
   badge:counts.paidSales,
   icon:LayoutDashboard
  },
  {
   id:'funnel',
   shortLabel:'Funnel',
   label:'Conversion Funnel',
   sub:'Drop-offs & price cohorts',
   badge:counts.abandonedCount>0?`${counts.abandonedCount} drop`:'0',
   icon:Filter
  },
  {
   id:'trends',
   shortLabel:'Trends',
   label:'14-Day Trends',
   sub:'Daily traffic & routes',
   badge:`${counts.visitors7d} (7d)`,
   icon:TrendingUp
  },
  {
   id:'customers',
   shortLabel:'Users',
   label:'Customers & Access',
   sub:'Directory, grant & CSV',
   badge:counts.customersCount,
   icon:Users
  },
  {
   id:'workspace',
   shortLabel:'Studio',
   label:'Studio Progress',
   sub:'5-stage buyer usage',
   badge:counts.activeWorkspaces,
   icon:Layers
  }
 ];

 const currentItem=navItems.find(i=>i.id===activeTab)||navItems[0];

 function selectTab(id:NavTab){
  setActiveTab(id);
  setDrawerOpen(false);
 }

 return <div className={styles.page}>
  <div className={styles.shell}>
   {drawerOpen&&<div className={styles.backdrop} onClick={()=>setDrawerOpen(false)} aria-hidden="true"/>}

   <aside className={`${styles.sidebar} ${drawerOpen?styles.sidebarOpen:''}`} aria-label="Sales dashboard left sidebar">
    <div className={styles.sidebarTop}>
     <div className={styles.sidebarBrandRow}>
      <div className={styles.brandFull}>
       <BrandMark href="/" className="wordmark" icon/>
      </div>
      <button
       type="button"
       className={styles.railToggleBtn}
       onClick={()=>setDrawerOpen(prev=>!prev)}
       aria-label={drawerOpen?'Collapse left sidebar':'Expand left sidebar'}
       title={drawerOpen?'Collapse sidebar':'Expand sidebar'}
      >
       {drawerOpen?<X size={18}/>:<PanelLeftOpen size={18}/>}
      </button>
     </div>
     <span className={styles.ownerBadge}>OWNER ADMIN</span>
    </div>

    <nav className={styles.sideNav}>
     <span className={styles.sideNavLabel}>DASHBOARD VIEWS</span>
     {navItems.map(item=>{
      const Icon=item.icon;
      const isActive=activeTab===item.id;
      return <button
       key={item.id}
       type="button"
       onClick={()=>selectTab(item.id)}
       className={`${styles.sideNavBtn} ${isActive?styles.sideNavActive:''}`}
       aria-current={isActive?'page':undefined}
       title={`${item.label} — ${item.sub}`}
      >
       <Icon size={18} className={styles.sideNavIcon}/>
       <span className={styles.sideNavShort}>{item.shortLabel}</span>
       <span className={styles.sideNavText}>
        <strong>{item.label}</strong>
        <small>{item.sub}</small>
       </span>
       <span className={styles.sideNavCount}>{item.badge}</span>
      </button>;
     })}
    </nav>

    <div className={styles.sidebarFooter}>
     <Link className={styles.sideFooterLink} href="/sales" title="Refresh live data">
      <RefreshCw size={15}/>
      <span>Refresh live data</span>
     </Link>
     <Link className={styles.sideFooterLink} href="/" title="Back to storefront">
      <ArrowLeft size={15}/>
      <span>Back to storefront</span>
     </Link>
    </div>
   </aside>

   <main className={styles.mainPane}>
    <header className={styles.mainHeader}>
     <div className={styles.headerLeft}>
      <button
       type="button"
       className={styles.menuBtn}
       onClick={()=>setDrawerOpen(prev=>!prev)}
       aria-label="Toggle full left sidebar"
      >
       {drawerOpen?<PanelLeftClose size={17}/>:<PanelLeftOpen size={17}/>}
       <span>Sections</span>
      </button>
      <div>
       <div className={styles.eyebrow}>PRIVATE · OWNER VIEW</div>
       <h1>{currentItem.label}</h1>
       <p>{currentItem.sub}</p>
      </div>
     </div>
     <div className={styles.headerActions}>
      <Link className={styles.refresh} href="/sales"><RefreshCw size={14}/> Refresh</Link>
      <Link className={styles.back} href="/"><ArrowLeft size={14}/> Storefront</Link>
     </div>
    </header>

    <div className={styles.tabContent}>
     {activeTab==='overview'&&overview}
     {activeTab==='funnel'&&funnel}
     {activeTab==='trends'&&trends}
     {activeTab==='customers'&&customers}
     {activeTab==='workspace'&&workspace}
    </div>
   </main>
  </div>
 </div>;
}
