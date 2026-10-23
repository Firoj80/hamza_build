import type {Metadata} from 'next';
import './globals.css';
import {configuredSiteOrigin} from '@/lib/payment-policy.mjs';
import AnalyticsTracker from './analytics-tracker';
export const metadata:Metadata={
  metadataBase:new URL(configuredSiteOrigin()),
  title:'Hamza Idrishi — Start small. Make something useful.',
  description:'Practical tools for your first digital product. Start with the $5 Idea-to-Income Fieldguide, then organise the launch with Launchpad Studio.',
  openGraph:{
    type:'website',
    siteName:'Hamza Idrishi · Build_hamza',
    title:'Your first product starts with one useful idea.',
    description:'A seven-page fieldguide and a private online launch workspace. Built for first-time creators.',
    url:'/',
    images:[
      {
        url:'/images/launchpad-studio-og.png',
        width:1600,
        height:1100,
        alt:'Launchpad Studio 5-stage command center cover with offer brief, AI prompt builder, scenario model and 30 post starters',
        type:'image/png',
      },
      {
        url:'/images/idea-to-income-fieldguide-og.png',
        width:1600,
        height:1100,
        alt:'Idea-to-Income Fieldguide hardcover monograph concept and customer validation scorecard sheet',
        type:'image/png',
      },
    ],
  },
  twitter:{
    card:'summary_large_image',
    site:'@hamza_build',
    creator:'@hamza_build',
    title:'Your first product starts with one useful idea.',
    description:'A seven-page fieldguide and a private online launch workspace. Built for first-time creators.',
    images:['/images/launchpad-studio-og.png'],
  },
  other:{
    'p:domain_verify':'8f5e5f223fcb46249353a2b8576fbd75',
  },
};
import {CurrencyProvider} from './currency-context';
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><CurrencyProvider><AnalyticsTracker/>{children}</CurrencyProvider></body></html>;}
