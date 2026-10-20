import type {Metadata} from 'next';
import './globals.css';
import {configuredSiteOrigin} from '@/lib/payment-policy.mjs';
import AnalyticsTracker from './analytics-tracker';
export const metadata:Metadata={metadataBase:new URL(configuredSiteOrigin()),title:'Hamza Idrishi — Start small. Make something useful.',description:'Practical tools for your first digital product. Start with a free Idea-to-Income Fieldguide, then organise the launch with Launchpad Studio.',openGraph:{siteName:'Hamza Idrishi · Build_hamza',title:'Your first product starts with one useful idea.',description:'A free fieldguide and a private online launch workspace. Built for first-time creators.',images:['/images/screenshots/studio-validate.jpg']}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><AnalyticsTracker/>{children}</body></html>;}
