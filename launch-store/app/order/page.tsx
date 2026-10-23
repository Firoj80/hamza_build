import Link from 'next/link';
import {
  AlertTriangle,
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  Download,
  FileCode2,
  FileText,
  HelpCircle,
  Layers,
  RefreshCw,
  ShieldCheck
} from 'lucide-react';
import SiteHeader from '../site-header';
import SiteFooter from '../site-footer';
import { currentUser } from '@/lib/supabase/server';
import { reconcilePayment } from '@/lib/fulfillment';
import { validPaymentId } from '@/lib/payment-policy.mjs';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Your purchase & instant download — Hamza Idrishi',
  robots: { index: false, follow: false }
};

export default async function Order({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const id = typeof params.payment_id === 'string' ? params.payment_id : undefined;
  const hintProduct = typeof params.product === 'string' ? params.product : undefined;
  const user = await currentUser().catch(() => null);

  let status = 'unknown';
  let unlockedProduct: string | null = hintProduct || null;
  let customerEmail: string | null = user?.email || null;
  let deliveryToken: string | null = null;

  try {
    if (validPaymentId(id)) {
      const reconciled = await reconcilePayment(id as string, user?.id);
      status = reconciled.status;
      if (reconciled.product) unlockedProduct = reconciled.product;
      if (reconciled.customerEmail) customerEmail = reconciled.customerEmail;
      if (reconciled.deliveryToken) deliveryToken = reconciled.deliveryToken;
    }
  } catch {
    // Keep status as 'unknown' if payment cannot be reconciled
  }

  const isReady = status === 'active';
  const isPending = status === 'pending';
  const isRevoked = status === 'revoked';

  const tokenQuery = deliveryToken ? `&token=${encodeURIComponent(deliveryToken)}` : '';
  const readerTokenQuery = deliveryToken ? `?token=${encodeURIComponent(deliveryToken)}` : '';

  const isFieldguide = unlockedProduct === 'fieldguide';
  const isStudio = unlockedProduct === 'studio';
  const isBundle = unlockedProduct === 'bundle';

  return (
    <div className="page-shell">
      <SiteHeader backHref="/#tools" backLabel="All products" />
      <main className="editorial-utility-main wrap">
        <div className="order-box order-status-card">
          <div
            className={`order-status-badge ${
              isReady ? 'is-active' : isPending ? 'is-pending' : 'is-warning'
            }`}
          >
            {isReady ? (
              <CheckCircle2 size={20} />
            ) : isPending ? (
              <Clock3 size={20} />
            ) : (
              <AlertTriangle size={20} />
            )}
            <span>
              {isReady
                ? 'PAYMENT VERIFIED · INSTANT DOWNLOAD READY'
                : isPending
                  ? 'VERIFICATION IN PROGRESS'
                  : isRevoked
                    ? 'ACCESS REVOKED'
                    : 'CHECKING PAYMENT STATUS'}
            </span>
          </div>

          <h1>
            {isReady
              ? isBundle
                ? 'Your Complete Creator Bundle is ready to download.'
                : 'Your purchase is ready to download.'
              : isPending
                ? 'Your payment is processing.'
                : isRevoked
                  ? 'This purchase is no longer active.'
                  : 'We could not confirm this purchase yet.'}
          </h1>

          <p className="order-status-lead">
            {isReady
              ? isBundle
                ? 'Thank you for purchasing the Complete Creator Launch Bundle ($12)! Both your 7-page Idea-to-Income Fieldguide (.PDF) and your standalone Launchpad Studio application (.HTML) are unlocked below.'
                : isStudio
                  ? 'Thank you for purchasing Launchpad Studio! Download your standalone HTML application file below to use anytime on any device (100% offline or online, no login needed), or open the online workspace in your browser.'
                  : isFieldguide
                    ? 'Thank you for purchasing the Idea-to-Income Fieldguide! Download your 7-page PDF file directly to your device below, or read it online in your browser.'
                    : 'Your payment is verified! Use the instant download and access buttons below to save your files.'
              : 'If you just completed payment on Dodo, allow a few seconds for verification and click "Check payment again" below. Do not pay a second time before contacting support.'}
          </p>

          {isReady && (
            <div
              style={{
                background: '#f4f8f2',
                border: '2px solid #173b31',
                borderRadius: '16px',
                padding: '24px',
                margin: '22px 0',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '8px'
                }}
              >
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    color: '#173b31'
                  }}
                >
                  {isBundle
                    ? 'COMPLETE CREATOR BUNDLE · BOTH FILES UNLOCKED (.PDF + .HTML APP)'
                    : isStudio
                      ? 'LAUNCHPAD STUDIO · STANDALONE HTML FILE + ONLINE WORKSPACE'
                      : 'IDEA-TO-INCOME FIELDGUIDE · PDF FILE + ONLINE READER'}
                </span>
                {customerEmail && (
                  <span style={{ fontSize: '12.5px', color: '#4a5851' }}>
                    Dodo receipt sent to <strong>{customerEmail}</strong>
                  </span>
                )}
              </div>

              {isBundle ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <a
                      className="button dark"
                      href={`/api/download?product=fieldguide${tokenQuery}`}
                      download="Idea-to-Income-Fieldguide.pdf"
                    >
                      <Download size={17} />
                      <span>1. Download Fieldguide (.PDF File)</span>
                    </a>
                    <a
                      className="button dark"
                      href={`/api/download?product=studio${tokenQuery}`}
                      download="Launchpad-Studio.html"
                    >
                      <Download size={17} />
                      <span>2. Download Launchpad Studio (.HTML File)</span>
                    </a>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <Link className="button outline" href={`/fieldguide${readerTokenQuery}`}>
                      <BookOpen size={16} />
                      <span>Open Online Fieldguide Reader</span>
                      <ArrowUpRight size={16} />
                    </Link>
                    <Link className="button outline" href={`/studio${readerTokenQuery}`}>
                      <Layers size={16} />
                      <span>Open Online Studio Workspace</span>
                      <ArrowUpRight size={16} />
                    </Link>
                  </div>
                </div>
              ) : isStudio ? (
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <a
                    className="button dark"
                    href={`/api/download?product=studio${tokenQuery}`}
                    download="Launchpad-Studio.html"
                  >
                    <Download size={17} />
                    <span>Download Launchpad Studio (.HTML File)</span>
                  </a>
                  <Link className="button outline" href={`/studio${readerTokenQuery}`}>
                    <Layers size={16} />
                    <span>Open Online Workspace</span>
                    <ArrowUpRight size={16} />
                  </Link>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <a
                    className="button dark"
                    href={`/api/download?product=fieldguide${tokenQuery}`}
                    download="Idea-to-Income-Fieldguide.pdf"
                  >
                    <Download size={17} />
                    <span>Download Fieldguide (.PDF File)</span>
                  </a>
                  <Link className="button outline" href={`/fieldguide${readerTokenQuery}`}>
                    <BookOpen size={16} />
                    <span>Read Online in Browser</span>
                    <ArrowUpRight size={16} />
                  </Link>
                </div>
              )}

              <p style={{ margin: 0, fontSize: '13.5px', color: '#4a5851', lineHeight: 1.55 }}>
                {isBundle ? (
                  <>
                    <FileCode2 size={14} style={{ verticalAlign: 'text-bottom', marginRight: '5px' }} />
                    <strong>Save both files to your device:</strong> Download{' '}
                    <code>Idea-to-Income-Fieldguide.pdf</code> and{' '}
                    <code>Launchpad-Studio.html</code> now. Both work 100% offline forever on any
                    laptop, tablet, or phone—and you can bookmark this confirmation page to
                    re-download anytime.
                  </>
                ) : isStudio ? (
                  <>
                    <FileCode2 size={14} style={{ verticalAlign: 'text-bottom', marginRight: '5px' }} />
                    <strong>How to use your HTML file:</strong> Save{' '}
                    <code>Launchpad-Studio.html</code> to your laptop, tablet, or phone and double-click
                    it anytime to open in Chrome, Safari, Edge, or Firefox. It works 100% offline forever
                    and automatically saves your progress in your browser.
                  </>
                ) : (
                  <>
                    <FileText size={14} style={{ verticalAlign: 'text-bottom', marginRight: '5px' }} />
                    <strong>Keep your PDF forever:</strong> Save{' '}
                    <code>Idea-to-Income-Fieldguide.pdf</code> to your device to read or print anytime—no
                    account login required.
                  </>
                )}
              </p>
            </div>
          )}

          <div className="order-steps-tracker">
            <div className="order-step is-done">
              <span>01</span>
              <div>
                <strong>Direct checkout completed</strong>
                <small>{customerEmail || 'No account required'}</small>
              </div>
            </div>
            <div className={`order-step ${isReady ? 'is-done' : isPending ? 'is-current' : ''}`}>
              <span>02</span>
              <div>
                <strong>Server payment verification</strong>
                <small>{validPaymentId(id) ? `Ref: ${id}` : 'Awaiting Dodo confirmation'}</small>
              </div>
            </div>
            <div className={`order-step ${isReady ? 'is-done' : ''}`}>
              <span>03</span>
              <div>
                <strong>Instant file download unlocked</strong>
                <small>
                  {isReady
                    ? isBundle
                      ? 'PDF + HTML downloads active'
                      : 'PDF / HTML download active'
                    : 'Unlocks automatically'}
                </small>
              </div>
            </div>
          </div>

          <div className="order-status-actions">
            {validPaymentId(id) && !isReady && (
              <Link
                className="button dark"
                href={
                  '/order?payment_id=' +
                  encodeURIComponent(id as string) +
                  (hintProduct ? '&product=' + encodeURIComponent(hintProduct) : '')
                }
              >
                <RefreshCw size={16} /> Check payment again
              </Link>
            )}
            <Link className="button outline" href="/#tools">
              <span>Back to storefront</span>
              <ArrowUpRight size={16} />
            </Link>
            <Link className="button outline" href="/support">
              <HelpCircle size={16} /> Get purchase help
            </Link>
          </div>

          <div className="order-security-footnote">
            <ShieldCheck size={15} />
            <span>
              Protected by server-side Dodo payment verification. Save your downloaded files or
              bookmark this page for future access.
            </span>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
