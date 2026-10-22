'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Check,
  CheckCircle2,
  Copy,
  Eye,
  ExternalLink,
  Loader2,
  Mail,
  Plus,
  RotateCcw,
  Save,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
  UserPlus,
  Zap
} from 'lucide-react';
import {
  buildEmailHtml,
  buildReviewUrl,
  buildRfc2822Base64Url,
  EMAIL_SEGMENTS,
  friendlyNameFromEmail,
  interpolateEmailTemplate,
  productKeyForCustomer,
  productNameForCustomer,
  TEMPLATE_VARIABLES,
  type EmailSegmentKey,
  type EmailTemplate,
  type ProductReview,
  type SegmentAutomationConfig,
  type SentEmailLog,
  type TemplateSlot
} from '@/lib/email-campaigns';
import type { CustomerRecord } from './customer-admin';
import styles from './sales.module.css';

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            include_granted_scopes?: boolean;
            prompt?: string;
            callback: (response: {
              access_token?: string;
              error?: string;
              error_description?: string;
              expires_in?: number;
            }) => void;
          }) => {
            requestAccessToken: (overrideConfig?: { prompt?: string }) => void;
          };
          revoke: (token: string, done?: () => void) => void;
        };
      };
    };
  }
}

const GMAIL_SEND_SCOPE = 'https://www.googleapis.com/auth/gmail.send';
const SESSION_TOKEN_KEY = 'hamza_gmail_oauth_token';
const SESSION_EXPIRY_KEY = 'hamza_gmail_oauth_expiry';

export default function EmailCampaignAdmin({
  customers,
  initialTemplates,
  initialAutomation,
  initialSentLogs,
  initialReviews,
  googleClientId,
  siteOrigin,
  adminEmail
}: {
  customers: CustomerRecord[];
  initialTemplates: EmailTemplate[];
  initialAutomation: Record<EmailSegmentKey, SegmentAutomationConfig>;
  initialSentLogs: SentEmailLog[];
  initialReviews: ProductReview[];
  googleClientId: string;
  siteOrigin: string;
  adminEmail: string;
}) {
  // Active sub-view: 'campaigns' | 'reviews' | 'history'
  const [subView, setSubView] = useState<'campaigns' | 'reviews' | 'history'>('campaigns');

  // Segment & Template state
  const [activeSegment, setActiveSegment] = useState<EmailSegmentKey>('registered_only');
  const [activeSlot, setActiveSlot] = useState<TemplateSlot>(1);
  const [templates, setTemplates] = useState<EmailTemplate[]>(initialTemplates);
  const [automation, setAutomation] =
    useState<Record<EmailSegmentKey, SegmentAutomationConfig>>(initialAutomation);
  const [sentLogs, setSentLogs] = useState<SentEmailLog[]>(initialSentLogs);
  const [reviews, setReviews] = useState<ProductReview[]>(initialReviews);

  // Editable fields for the currently selected template
  const currentTemplate = useMemo(
    () =>
      templates.find((t) => t.segment === activeSegment && t.slot === activeSlot) ||
      templates[0],
    [templates, activeSegment, activeSlot]
  );

  const [editTitle, setEditTitle] = useState(currentTemplate?.title || '');
  const [editSubject, setEditSubject] = useState(currentTemplate?.subject || '');
  const [editBody, setEditBody] = useState(currentTemplate?.body || '');
  const [showPreview, setShowPreview] = useState(false);
  const [includeReviewCard, setIncludeReviewCard] = useState(true);

  useEffect(() => {
    if (currentTemplate) {
      setEditTitle(currentTemplate.title);
      setEditSubject(currentTemplate.subject);
      setEditBody(currentTemplate.body);
    }
  }, [currentTemplate]);

  // Gmail OAuth state
  const [gisReady, setGisReady] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const tokenClientRef = useRef<{
    requestAccessToken: (overrideConfig?: { prompt?: string }) => void;
  } | null>(null);

  // Recipient filtering & selection
  const [recipientQuery, setRecipientQuery] = useState('');
  const [includeAllInReviewFilter, setIncludeAllInReviewFilter] = useState(false);
  const [customTestEmails, setCustomTestEmails] = useState<CustomerRecord[]>([]);
  const [newTestEmail, setNewTestEmail] = useState(adminEmail || '');
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());

  // Status & sending progress
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [sendProgress, setSendProgress] = useState<{
    sent: number;
    total: number;
    currentEmail: string;
  } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const autoRunTriggeredRef = useRef<Set<string>>(new Set());

  // Load Google Identity Services script and restore session token if valid
  useEffect(() => {
    try {
      const savedToken = sessionStorage.getItem(SESSION_TOKEN_KEY);
      const savedExpiry = Number(sessionStorage.getItem(SESSION_EXPIRY_KEY) || '0');
      if (savedToken && savedExpiry > Date.now() + 30_000) {
        setAccessToken(savedToken);
      }
    } catch {
      // Ignore storage access errors
    }

    if (typeof window === 'undefined') return;

    const initGis = () => {
      if (!window.google?.accounts?.oauth2 || !googleClientId) return;
      tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
        client_id: googleClientId,
        scope: GMAIL_SEND_SCOPE,
        include_granted_scopes: true,
        callback: (response) => {
          if (response.error) {
            setAuthError(
              response.error === 'access_denied'
                ? 'Gmail permission was declined. Click "Connect Gmail" whenever you are ready to grant send permission.'
                : `Gmail authentication error: ${response.error_description || response.error}`
            );
            return;
          }
          if (response.access_token) {
            setAccessToken(response.access_token);
            setAuthError(null);
            setToast({
              type: 'ok',
              text: 'Gmail account connected! You can now send filtered campaigns or run Auto-Send.'
            });
            try {
              const expiresInMs = (response.expires_in || 3500) * 1000;
              sessionStorage.setItem(SESSION_TOKEN_KEY, response.access_token);
              sessionStorage.setItem(SESSION_EXPIRY_KEY, String(Date.now() + expiresInMs));
            } catch {
              // Ignore sessionStorage errors
            }
          }
        }
      });
      setGisReady(true);
    };

    if (window.google?.accounts?.oauth2) {
      initGis();
      return;
    }

    const existingScript = document.querySelector(
      'script[src="https://accounts.google.com/gsi/client"]'
    ) as HTMLScriptElement | null;
    if (existingScript) {
      existingScript.addEventListener('load', initGis);
      return () => existingScript.removeEventListener('load', initGis);
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = initGis;
    document.head.appendChild(script);
  }, [googleClientId]);

  function handleConnectGmail() {
    setAuthError(null);
    if (!googleClientId) {
      setAuthError('Google OAuth Client ID is not configured in environment variables.');
      return;
    }
    if (!tokenClientRef.current && window.google?.accounts?.oauth2) {
      tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
        client_id: googleClientId,
        scope: GMAIL_SEND_SCOPE,
        include_granted_scopes: true,
        callback: (response) => {
          if (response.error) {
            setAuthError(
              response.error === 'access_denied'
                ? 'Gmail permission was declined.'
                : `Gmail authentication error: ${response.error}`
            );
            return;
          }
          if (response.access_token) {
            setAccessToken(response.access_token);
            setAuthError(null);
          }
        }
      });
    }
    if (!tokenClientRef.current) {
      setAuthError('Google Sign-In library is still loading. Please try again in a second.');
      return;
    }
    tokenClientRef.current.requestAccessToken({
      prompt: accessToken ? '' : 'consent'
    });
  }

  function handleDisconnectGmail() {
    const token = accessToken;
    setAccessToken(null);
    try {
      sessionStorage.removeItem(SESSION_TOKEN_KEY);
      sessionStorage.removeItem(SESSION_EXPIRY_KEY);
    } catch {
      // Ignore
    }
    if (token && window.google?.accounts?.oauth2?.revoke) {
      window.google.accounts.oauth2.revoke(token, () => {});
    }
    setToast({ type: 'ok', text: 'Disconnected Gmail session.' });
  }

  // Merge real customers + any custom test recipient emails added by admin
  const allRecipients = useMemo(() => {
    const map = new Map<string, CustomerRecord>();
    for (const c of customers) {
      if (c.email && c.email.includes('@')) {
        map.set(c.email.toLowerCase(), c);
      }
    }
    for (const custom of customTestEmails) {
      if (custom.email && custom.email.includes('@') && !map.has(custom.email.toLowerCase())) {
        map.set(custom.email.toLowerCase(), custom);
      }
    }
    return Array.from(map.values());
  }, [customers, customTestEmails]);

  const reviewedEmailsSet = useMemo(
    () => new Set(reviews.map((r) => r.email.toLowerCase())),
    [reviews]
  );

  // Filter recipients by segment
  const segmentCounts = useMemo(() => {
    return {
      registered_only: allRecipients.filter((c) => !c.hasPaid).length,
      buyer_5: allRecipients.filter((c) => c.ownsFieldguide).length,
      buyer_9: allRecipients.filter((c) => c.ownsStudio).length,
      review_request: allRecipients.filter((c) =>
        includeAllInReviewFilter ? true : c.hasPaid
      ).length
    };
  }, [allRecipients, includeAllInReviewFilter]);

  const filteredRecipients = useMemo(() => {
    const q = recipientQuery.trim().toLowerCase();
    return allRecipients.filter((c) => {
      if (q && !c.email.toLowerCase().includes(q) && !c.userId.toLowerCase().includes(q)) {
        return false;
      }
      if (activeSegment === 'registered_only') return !c.hasPaid;
      if (activeSegment === 'buyer_5') return c.ownsFieldguide;
      if (activeSegment === 'buyer_9') return c.ownsStudio;
      if (activeSegment === 'review_request') {
        return includeAllInReviewFilter ? true : c.hasPaid;
      }
      return true;
    });
  }, [allRecipients, activeSegment, recipientQuery, includeAllInReviewFilter]);

  // Select all filtered recipients by default when switching segment
  useEffect(() => {
    const nextSet = new Set<string>();
    for (const r of filteredRecipients) {
      if (r.email && r.email.includes('@')) {
        nextSet.add(r.email.toLowerCase());
      }
    }
    setSelectedEmails(nextSet);
  }, [activeSegment, filteredRecipients.length, includeAllInReviewFilter]);

  // Track which emails were already sent in each segment
  const sentBySegmentMap = useMemo(() => {
    const map = new Map<string, SentEmailLog>();
    for (const log of sentLogs) {
      if (log.status === 'sent') {
        const key = `${log.segment}:${log.to.toLowerCase()}`;
        if (!map.has(key)) {
          map.set(key, log);
        }
      }
    }
    return map;
  }, [sentLogs]);

  // Compute pending auto-send queue across segments that have autoSendEnabled = true
  const pendingAutoQueue = useMemo(() => {
    const queue: {
      customer: CustomerRecord;
      segment: EmailSegmentKey;
      template: EmailTemplate;
    }[] = [];

    for (const segInfo of EMAIL_SEGMENTS) {
      const seg = segInfo.key;
      const cfg = automation[seg];
      if (!cfg?.autoSendEnabled) continue;

      const tpl =
        templates.find((t) => t.segment === seg && t.slot === cfg.activeTemplateSlot) ||
        templates.find((t) => t.segment === seg && t.slot === 1);
      if (!tpl) continue;

      const matching = allRecipients.filter((c) => {
        if (!c.email || !c.email.includes('@')) return false;
        if (seg === 'registered_only') return !c.hasPaid;
        if (seg === 'buyer_5') return c.ownsFieldguide;
        if (seg === 'buyer_9') return c.ownsStudio;
        if (seg === 'review_request') {
          return c.hasPaid && !reviewedEmailsSet.has(c.email.toLowerCase());
        }
        return false;
      });

      for (const cust of matching) {
        const key = `${seg}:${cust.email.toLowerCase()}`;
        if (cfg.skipAlreadyEmailed && sentBySegmentMap.has(key)) continue;
        if (autoRunTriggeredRef.current.has(key)) continue;
        queue.push({ customer: cust, segment: seg, template: tpl });
      }
    }
    return queue;
  }, [automation, templates, allRecipients, sentBySegmentMap, reviewedEmailsSet]);

  // Send a single email via Gmail REST API
  async function sendSingleGmailMessage(params: {
    customer: CustomerRecord;
    segment: EmailSegmentKey;
    slot: TemplateSlot;
    subjectTemplate: string;
    bodyTemplate: string;
    mode: 'manual' | 'auto';
    token: string;
  }): Promise<SentEmailLog> {
    const email = params.customer.email.trim().toLowerCase();
    const name = friendlyNameFromEmail(email);
    const productName = productNameForCustomer(
      params.customer.ownsFieldguide,
      params.customer.ownsStudio
    );
    const productKey = productKeyForCustomer(
      params.customer.ownsFieldguide,
      params.customer.ownsStudio
    );

    const subject = interpolateEmailTemplate(params.subjectTemplate, {
      name,
      email,
      productName,
      storeOrigin: siteOrigin,
      productKey
    });

    const bodyText = interpolateEmailTemplate(params.bodyTemplate, {
      name,
      email,
      productName,
      storeOrigin: siteOrigin,
      productKey
    });

    const reviewUrl = buildReviewUrl(siteOrigin, email, productKey);
    const htmlBody = buildEmailHtml({
      subject,
      bodyText,
      reviewUrl,
      includeReviewCard:
        includeReviewCard ||
        params.segment === 'review_request' ||
        params.bodyTemplate.includes('{{review_url}}'),
      storeOrigin: siteOrigin
    });

    const rawEncoded = buildRfc2822Base64Url({
      to: email,
      subject,
      bodyText,
      htmlBody
    });

    const response = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${params.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ raw: rawEncoded })
      }
    );

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const errMessage =
        data?.error?.message || `Gmail API returned HTTP ${response.status}`;
      if (response.status === 401 || response.status === 403) {
        setAccessToken(null);
      }
      return {
        id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        to: email,
        userId: params.customer.userId,
        segment: params.segment,
        templateSlot: params.slot,
        subject,
        mode: params.mode,
        status: 'failed',
        error: errMessage,
        sentAt: new Date().toISOString()
      };
    }

    return {
      id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      to: email,
      userId: params.customer.userId,
      segment: params.segment,
      templateSlot: params.slot,
      subject,
      mode: params.mode,
      status: 'sent',
      gmailMessageId: data.id,
      sentAt: new Date().toISOString()
    };
  }

  // Persist sent logs to backend
  async function persistSentLogs(entries: SentEmailLog[]) {
    if (entries.length === 0) return;
    setSentLogs((prev) => [...entries, ...prev]);
    try {
      const res = await fetch('/api/admin/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'log_sent',
          entries
        })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.state?.sentLogs) {
        setSentLogs(data.state.sentLogs);
      }
    } catch {
      // Keep optimistic logs in state
    }
  }

  // Automatic execution when Auto-Send is ON and Gmail is connected
  useEffect(() => {
    if (!accessToken || pendingAutoQueue.length === 0 || sendProgress || busyAction) {
      return;
    }
    const timer = setTimeout(() => {
      void runAutoSendQueue(pendingAutoQueue);
    }, 800);
    return () => clearTimeout(timer);
  }, [accessToken, pendingAutoQueue.length]);

  async function runAutoSendQueue(
    items = pendingAutoQueue
  ) {
    if (!accessToken) {
      handleConnectGmail();
      return;
    }
    if (items.length === 0) {
      setToast({
        type: 'ok',
        text: 'All eligible recipients in active Auto-Send segments have already been emailed.'
      });
      return;
    }

    setBusyAction('auto_queue');
    const results: SentEmailLog[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const key = `${item.segment}:${item.customer.email.toLowerCase()}`;
      autoRunTriggeredRef.current.add(key);
      setSendProgress({
        sent: i + 1,
        total: items.length,
        currentEmail: item.customer.email
      });

      const log = await sendSingleGmailMessage({
        customer: item.customer,
        segment: item.segment,
        slot: item.template.slot,
        subjectTemplate: item.template.subject,
        bodyTemplate: item.template.body,
        mode: 'auto',
        token: accessToken
      });
      results.push(log);
    }

    await persistSentLogs(results);
    setSendProgress(null);
    setBusyAction(null);

    const sentCount = results.filter((r) => r.status === 'sent').length;
    const failCount = results.length - sentCount;
    setToast({
      type: failCount > 0 && sentCount === 0 ? 'err' : 'ok',
      text:
        failCount > 0
          ? `Auto-Send finished: ${sentCount} sent via Gmail, ${failCount} failed (${results.find((r) => r.error)?.error || ''}).`
          : `Auto-Send dispatched ${sentCount} email${sentCount === 1 ? '' : 's'} via your connected Gmail!`
    });
  }

  async function handleManualSendBatch(targetRecipients?: CustomerRecord[]) {
    if (!accessToken) {
      setToast({
        type: 'err',
        text: 'Please connect your Gmail account first to send emails.'
      });
      handleConnectGmail();
      return;
    }

    const recipientsToUse =
      targetRecipients ||
      filteredRecipients.filter((r) => selectedEmails.has(r.email.toLowerCase()));

    if (recipientsToUse.length === 0) {
      setToast({
        type: 'err',
        text: 'Select at least one recipient (or add a test email) before sending.'
      });
      return;
    }

    setBusyAction('manual_send');
    setToast(null);
    const logs: SentEmailLog[] = [];

    for (let i = 0; i < recipientsToUse.length; i++) {
      const recipient = recipientsToUse[i];
      setSendProgress({
        sent: i + 1,
        total: recipientsToUse.length,
        currentEmail: recipient.email
      });
      const log = await sendSingleGmailMessage({
        customer: recipient,
        segment: activeSegment,
        slot: activeSlot,
        subjectTemplate: editSubject,
        bodyTemplate: editBody,
        mode: 'manual',
        token: accessToken
      });
      logs.push(log);
    }

    await persistSentLogs(logs);
    setSendProgress(null);
    setBusyAction(null);

    const okCount = logs.filter((l) => l.status === 'sent').length;
    const errCount = logs.length - okCount;
    if (errCount > 0 && okCount === 0) {
      setToast({
        type: 'err',
        text: `Could not send email: ${logs[0]?.error || 'Check Gmail connection'}`
      });
    } else {
      setToast({
        type: 'ok',
        text: `Sent ${okCount} email${okCount === 1 ? '' : 's'} via Gmail using Template ${activeSlot}!`
      });
    }
  }

  async function handleSaveTemplate() {
    setBusyAction('save_template');
    setToast(null);
    try {
      const res = await fetch('/api/admin/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_template',
          segment: activeSegment,
          slot: activeSlot,
          title: editTitle,
          subject: editSubject,
          body: editBody
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setToast({ type: 'err', text: data.error || 'Could not save template' });
      } else {
        if (data.state?.templates) setTemplates(data.state.templates);
        setToast({
          type: 'ok',
          text: `Saved Template ${activeSlot} for ${EMAIL_SEGMENTS.find((s) => s.key === activeSegment)?.shortLabel}.`
        });
      }
    } catch {
      setToast({ type: 'err', text: 'Network error while saving template' });
    } finally {
      setBusyAction(null);
    }
  }

  async function handleResetTemplate() {
    setBusyAction('reset_template');
    setToast(null);
    try {
      const res = await fetch('/api/admin/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reset_template',
          segment: activeSegment,
          slot: activeSlot
        })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.state?.templates) {
        setTemplates(data.state.templates);
        setToast({
          type: 'ok',
          text: `Reset Template ${activeSlot} to default copy.`
        });
      }
    } catch {
      setToast({ type: 'err', text: 'Could not reset template' });
    } finally {
      setBusyAction(null);
    }
  }

  async function handleUpdateAutomation(patch: Partial<SegmentAutomationConfig>) {
    const curr = automation[activeSegment];
    const nextConfig: SegmentAutomationConfig = {
      ...curr,
      ...patch,
      segment: activeSegment,
      updatedAt: new Date().toISOString()
    };
    setAutomation((prev) => ({
      ...prev,
      [activeSegment]: nextConfig
    }));

    try {
      const res = await fetch('/api/admin/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_automation',
          segment: activeSegment,
          autoSendEnabled: nextConfig.autoSendEnabled,
          activeTemplateSlot: nextConfig.activeTemplateSlot,
          skipAlreadyEmailed: nextConfig.skipAlreadyEmailed
        })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.state?.automation) {
        setAutomation(data.state.automation);
      }
      setToast({
        type: 'ok',
        text: nextConfig.autoSendEnabled
          ? `Auto-Send enabled for ${EMAIL_SEGMENTS.find((s) => s.key === activeSegment)?.label} (using Template ${nextConfig.activeTemplateSlot}).`
          : `Switched ${EMAIL_SEGMENTS.find((s) => s.key === activeSegment)?.label} to Manual Admin Send.`
      });
    } catch {
      setToast({ type: 'err', text: 'Could not save automation setting' });
    }
  }

  function handleAddCustomEmail(e: React.FormEvent) {
    e.preventDefault();
    const cleaned = newTestEmail.trim().toLowerCase();
    if (!cleaned || !cleaned.includes('@')) return;

    const ownsFieldguide = activeSegment === 'buyer_5' || activeSegment === 'review_request';
    const ownsStudio = activeSegment === 'buyer_9';
    const customRecord: CustomerRecord = {
      userId: `test_${Date.now()}`,
      email: cleaned,
      ownsStudio,
      ownsFieldguide,
      triedStudio: 0,
      triedFieldguide: 0,
      workspaceKeys: 0,
      workspaceSummary: 'Test / Manual Recipient',
      nicheLabel: null,
      checksCompleted: 0,
      workspaceUpdatedAtFormatted: null,
      spentFormatted: ownsStudio ? '$9.00' : ownsFieldguide ? '$5.00' : '$0.00',
      hasPaid: ownsStudio || ownsFieldguide,
      lastActivityFormatted: 'Just now',
      lastActivityIso: new Date().toISOString()
    };

    setCustomTestEmails((prev) => [
      customRecord,
      ...prev.filter((item) => item.email.toLowerCase() !== cleaned)
    ]);
    setSelectedEmails((prev) => new Set([...prev, cleaned]));
    setToast({
      type: 'ok',
      text: `Added ${cleaned} to the current recipient list so you can test sending immediately.`
    });
  }

  function insertVariable(token: string) {
    setEditBody((prev) => `${prev}${prev.endsWith(' ') || prev.endsWith('\n') ? '' : ' '}${token}`);
  }

  async function handleModerateReview(reviewId: string, subAction: 'toggle' | 'delete') {
    try {
      const res = await fetch('/api/admin/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'moderate_review',
          reviewId,
          subAction
        })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.state?.reviews) {
        setReviews(data.state.reviews);
      }
    } catch {
      // Ignore
    }
  }

  const sampleRecipient: CustomerRecord = filteredRecipients[0] || {
    userId: 'sample_user',
    email: adminEmail || 'alex@example.com',
    ownsStudio: activeSegment === 'buyer_9',
    ownsFieldguide: activeSegment !== 'registered_only',
    triedStudio: 0,
    triedFieldguide: 1,
    workspaceKeys: 0,
    workspaceSummary: null,
    nicheLabel: null,
    checksCompleted: 0,
    workspaceUpdatedAtFormatted: null,
    spentFormatted: '$5.00',
    hasPaid: activeSegment !== 'registered_only',
    lastActivityFormatted: 'Today',
    lastActivityIso: new Date().toISOString()
  };

  const previewVars = {
    name: friendlyNameFromEmail(sampleRecipient.email),
    email: sampleRecipient.email,
    productName: productNameForCustomer(
      sampleRecipient.ownsFieldguide,
      sampleRecipient.ownsStudio
    ),
    storeOrigin: siteOrigin,
    productKey: productKeyForCustomer(
      sampleRecipient.ownsFieldguide,
      sampleRecipient.ownsStudio
    )
  };

  const previewSubject = interpolateEmailTemplate(editSubject, previewVars);
  const previewBody = interpolateEmailTemplate(editBody, previewVars);
  const previewReviewUrl = buildReviewUrl(
    siteOrigin,
    sampleRecipient.email,
    previewVars.productKey
  );

  const segmentTemplates = useMemo(
    () =>
      templates
        .filter((t) => t.segment === activeSegment)
        .sort((a, b) => a.slot - b.slot),
    [templates, activeSegment]
  );

  const currentSegmentMeta =
    EMAIL_SEGMENTS.find((s) => s.key === activeSegment) || EMAIL_SEGMENTS[0];
  const currentAutomation = automation[activeSegment];

  const avgReviewRating =
    reviews.length > 0
      ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
      : '5.0';

  return (
    <div className={styles.adminWrap} style={{ gap: '18px' }}>
      {/* TOP GMAIL CONNECTION & AUTOMATION STATUS BAR */}
      <section
        style={{
          background: '#173b31',
          color: '#f6f5e9',
          borderRadius: '14px',
          padding: '20px 22px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          flexWrap: 'wrap',
          boxShadow: '0 8px 28px rgba(23,59,49,0.14)'
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxWidth: '640px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span
              style={{
                background: accessToken ? '#285934' : '#31574a',
                color: '#dae5a3',
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.12em',
                padding: '4px 9px',
                borderRadius: '999px',
                textTransform: 'uppercase'
              }}
            >
              {accessToken ? '● GMAIL API CONNECTED' : '○ GMAIL DISCONNECTED'}
            </span>
            <span style={{ fontSize: '12px', color: '#bfd0be' }}>
              Scope: <code>gmail.send</code> · Admin: <strong>{adminEmail}</strong>
            </span>
          </div>
          <h2 style={{ margin: '4px 0 0', fontSize: '20px', letterSpacing: '-0.02em', color: '#fff' }}>
            Gmail Audience Campaigns, 5x Segment Templates &amp; Review Collector
          </h2>
          <p style={{ margin: 0, fontSize: '13px', color: '#cde0cc', lineHeight: 1.45 }}>
            Filter by Registered Non-Buyers, $5 Fieldguide Buyers, $9 Studio Buyers, or Rating &amp; Review Requests. Customize 5 templates per filter and send manually or automatically with your Gmail.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {accessToken ? (
            <>
              <button
                type="button"
                onClick={() => void runAutoSendQueue()}
                disabled={Boolean(busyAction)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '7px',
                  background: '#dae5a3',
                  color: '#173b31',
                  border: 0,
                  borderRadius: '9px',
                  padding: '10px 15px',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                <Zap size={15} />
                <span>
                  Run Auto-Send Queue ({pendingAutoQueue.length})
                </span>
              </button>
              <button
                type="button"
                onClick={handleDisconnectGmail}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(255,255,255,0.1)',
                  color: '#eef2df',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '9px',
                  padding: '9px 13px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Disconnect Gmail
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleConnectGmail}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: '#dae5a3',
                color: '#173b31',
                border: 0,
                borderRadius: '9px',
                padding: '11px 18px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(0,0,0,0.2)'
              }}
            >
              <Mail size={16} />
              <span>{gisReady ? 'Connect Gmail Account' : 'Connect Gmail Account'}</span>
            </button>
          )}
          <Link
            href="/review"
            target="_blank"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(255,255,255,0.12)',
              color: '#fff',
              textDecoration: 'none',
              borderRadius: '9px',
              padding: '9px 13px',
              fontSize: '12px',
              fontWeight: 600
            }}
          >
            <Star size={14} /> Public Review Page <ExternalLink size={13} />
          </Link>
        </div>
      </section>

      {authError && (
        <div
          style={{
            background: '#fce9e6',
            border: '1px solid #f0cfc9',
            color: '#9b4239',
            borderRadius: '10px',
            padding: '12px 15px',
            fontSize: '13px',
            fontWeight: 600
          }}
        >
          {authError}
        </div>
      )}

      {toast && (
        <div
          style={{
            background: toast.type === 'ok' ? '#e7f3ea' : '#fce9e6',
            border: `1px solid ${toast.type === 'ok' ? '#b8d8be' : '#f0cfc9'}`,
            color: toast.type === 'ok' ? '#215232' : '#9b4239',
            borderRadius: '10px',
            padding: '12px 16px',
            fontSize: '13px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px'
          }}
        >
          <span>{toast.text}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            style={{
              background: 'transparent',
              border: 0,
              color: 'inherit',
              cursor: 'pointer',
              fontWeight: 700
            }}
          >
            ✕
          </button>
        </div>
      )}

      {sendProgress && (
        <div
          style={{
            background: '#f4f8f2',
            border: '1px solid #173b31',
            borderRadius: '11px',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13.5px', fontWeight: 600, color: '#173b31' }}>
            <Loader2 size={16} className="spin" />
            <span>
              Sending via Gmail ({sendProgress.sent} of {sendProgress.total}) →{' '}
              <strong>{sendProgress.currentEmail}</strong>
            </span>
          </div>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#285934' }}>
            {Math.round((sendProgress.sent / Math.max(sendProgress.total, 1)) * 100)}%
          </span>
        </div>
      )}

      {/* SUB-NAVIGATION TABS: CAMPAIGN STUDIO vs REVIEWS vs SENT LOG */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          flexWrap: 'wrap',
          borderBottom: '1px solid #e2e6df',
          paddingBottom: '12px'
        }}
      >
        <div className={styles.segmentTabs}>
          <button
            type="button"
            className={subView === 'campaigns' ? styles.segActive : ''}
            onClick={() => setSubView('campaigns')}
          >
            1. Audience Filters &amp; 5x Templates (20 total)
          </button>
          <button
            type="button"
            className={subView === 'reviews' ? styles.segActive : ''}
            onClick={() => setSubView('reviews')}
          >
            2. Collected Ratings &amp; Reviews ({reviews.length} · ★ {avgReviewRating})
          </button>
          <button
            type="button"
            className={subView === 'history' ? styles.segActive : ''}
            onClick={() => setSubView('history')}
          >
            3. Sent Email Log ({sentLogs.length})
          </button>
        </div>
      </div>

      {/* =====================================================================
          SUB-VIEW 1: AUDIENCE FILTERS, AUTOMATION CHOICE & 5 TEMPLATES EDITOR
         ===================================================================== */}
      {subView === 'campaigns' && (
        <>
          {/* 4 AUDIENCE FILTER CARDS */}
          <div className={styles.customerGrid} style={{ marginBottom: 0 }}>
            {EMAIL_SEGMENTS.map((seg) => {
              const isSelected = activeSegment === seg.key;
              const cfg = automation[seg.key];
              const count = segmentCounts[seg.key];
              return (
                <article
                  key={seg.key}
                  onClick={() => setActiveSegment(seg.key)}
                  style={{
                    background: isSelected ? '#173b31' : '#fff',
                    color: isSelected ? '#f6f5e9' : '#1d2925',
                    border: isSelected ? '2px solid #173b31' : '1px solid #dce3d6',
                    borderRadius: '13px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '7px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                    <span
                      style={{
                        fontSize: '10.5px',
                        fontWeight: 700,
                        letterSpacing: '0.09em',
                        textTransform: 'uppercase',
                        color: isSelected ? '#dae5a3' : '#627067'
                      }}
                    >
                      {seg.shortLabel}
                    </span>
                    <span
                      style={{
                        fontSize: '10.5px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '999px',
                        background: cfg?.autoSendEnabled
                          ? '#e7f3ea'
                          : isSelected
                            ? 'rgba(255,255,255,0.14)'
                            : '#eef1ea',
                        color: cfg?.autoSendEnabled
                          ? '#215232'
                          : isSelected
                            ? '#fff'
                            : '#526058'
                      }}
                    >
                      {cfg?.autoSendEnabled ? `Auto · T${cfg.activeTemplateSlot}` : 'Manual'}
                    </span>
                  </div>
                  <strong style={{ fontSize: '23px', letterSpacing: '-0.03em' }}>
                    {count} <span style={{ fontSize: '13px', fontWeight: 500, opacity: 0.8 }}>users</span>
                  </strong>
                  <small style={{ fontSize: '11.5px', color: isSelected ? '#cfe0c7' : '#68736d', lineHeight: 1.4 }}>
                    {seg.label} · 5 templates
                  </small>
                </article>
              );
            })}
          </div>

          {/* ADMIN CHOICE: MANUAL VS AUTO-SEND CONTROL BAR FOR SELECTED FILTER */}
          <section
            style={{
              background: '#fff',
              border: '1px solid #dce3d6',
              borderRadius: '13px',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              flexWrap: 'wrap'
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxWidth: '580px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className={styles.eyebrow}>
                  ADMIN SENDING MODE · {currentSegmentMeta.label.toUpperCase()}
                </span>
                <span
                  className={`${styles.badge} ${
                    currentAutomation?.autoSendEnabled ? styles.active : styles.neutral
                  }`}
                >
                  {currentAutomation?.autoSendEnabled
                    ? `Auto-Send ON (Template ${currentAutomation.activeTemplateSlot})`
                    : 'Manual Admin Choice'}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '12.5px', color: '#5c6861', lineHeight: 1.45 }}>
                {currentSegmentMeta.automationHint}
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', fontSize: '12.5px', fontWeight: 600, color: '#1d2925' }}>
                <span>Mode:</span>
                <select
                  value={currentAutomation?.autoSendEnabled ? 'auto' : 'manual'}
                  onChange={(e) =>
                    void handleUpdateAutomation({
                      autoSendEnabled: e.target.value === 'auto'
                    })
                  }
                  className={styles.grantSelect}
                >
                  <option value="manual">Manual Send (Admin clicks Send)</option>
                  <option value="auto">Auto-Send Enabled (Automatic via Gmail)</option>
                </select>
              </label>

              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', fontSize: '12.5px', fontWeight: 600, color: '#1d2925' }}>
                <span>Auto Template:</span>
                <select
                  value={currentAutomation?.activeTemplateSlot || 1}
                  onChange={(e) =>
                    void handleUpdateAutomation({
                      activeTemplateSlot: Number(e.target.value) as TemplateSlot
                    })
                  }
                  className={styles.grantSelect}
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      Template {n}
                    </option>
                  ))}
                </select>
              </label>

              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  color: '#46534d',
                  cursor: 'pointer'
                }}
              >
                <input
                  type="checkbox"
                  checked={currentAutomation?.skipAlreadyEmailed ?? true}
                  onChange={(e) =>
                    void handleUpdateAutomation({
                      skipAlreadyEmailed: e.target.checked
                    })
                  }
                />
                <span>Skip already emailed</span>
              </label>
            </div>
          </section>

          {/* MAIN 2-COLUMN WORKSPACE: 5 TEMPLATES EDITOR (LEFT) + FILTERED RECIPIENTS (RIGHT) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
              gap: '18px',
              alignItems: 'start'
            }}
          >
            {/* LEFT PANEL: 5 TEMPLATES SELECTOR & EDITOR */}
            <section
              style={{
                background: '#fff',
                border: '1px solid #dce3d6',
                borderRadius: '14px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                <div>
                  <div className={styles.eyebrow}>
                    5 TEMPLATES FOR {currentSegmentMeta.shortLabel.toUpperCase()}
                  </div>
                  <h3 style={{ margin: '3px 0 0', fontSize: '17px' }}>
                    Choose &amp; customise template (1 of 5)
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPreview((p) => !p)}
                  className={styles.trackedLinkBtn}
                >
                  <Eye size={13} />
                  <span>{showPreview ? 'Edit Template' : 'Live Preview'}</span>
                </button>
              </div>

              {/* 5 TEMPLATE SLOT PILLS */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: '6px' }}>
                {segmentTemplates.map((tpl) => {
                  const active = activeSlot === tpl.slot;
                  const isAutoDefault =
                    currentAutomation?.activeTemplateSlot === tpl.slot;
                  return (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => setActiveSlot(tpl.slot)}
                      style={{
                        background: active ? '#173b31' : '#f7f9f5',
                        color: active ? '#f6f5e9' : '#1d2925',
                        border: active ? '1px solid #173b31' : '1px solid #d5ddd2',
                        borderRadius: '9px',
                        padding: '8px 6px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '2px',
                        cursor: 'pointer'
                      }}
                    >
                      <strong style={{ fontSize: '12px' }}>Template {tpl.slot}</strong>
                      <span
                        style={{
                          fontSize: '10px',
                          opacity: 0.85,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: '100%'
                        }}
                      >
                        {isAutoDefault ? '★ Auto Pick' : tpl.badge}
                      </span>
                    </button>
                  );
                })}
              </div>

              {showPreview ? (
                <div
                  style={{
                    background: '#fafbf8',
                    border: '1px solid #d5ddd2',
                    borderRadius: '11px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}
                >
                  <div style={{ fontSize: '11.5px', color: '#627067', borderBottom: '1px solid #e6eae2', paddingBottom: '8px' }}>
                    <div>
                      <strong>Previewing for:</strong> {sampleRecipient.email} ({previewVars.productName})
                    </div>
                    <div style={{ marginTop: '4px' }}>
                      <strong>Subject:</strong> <span style={{ color: '#173b31', fontWeight: 700 }}>{previewSubject}</span>
                    </div>
                  </div>
                  <div
                    style={{
                      whiteSpace: 'pre-wrap',
                      fontSize: '13.5px',
                      lineHeight: 1.6,
                      color: '#1d2925'
                    }}
                  >
                    {previewBody}
                  </div>
                  {(includeReviewCard || activeSegment === 'review_request') && (
                    <div
                      style={{
                        marginTop: '8px',
                        padding: '14px',
                        background: '#eef4ea',
                        border: '1px solid #cfe0c7',
                        borderRadius: '10px'
                      }}
                    >
                      <div style={{ fontSize: '10px', fontWeight: 700, color: '#284739', letterSpacing: '0.08em' }}>
                        EMBEDDED RATING &amp; REVIEW CARD IN EMAIL
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#173b31', marginTop: '4px' }}>
                        ⭐⭐⭐⭐⭐ Leave a quick rating &amp; review →
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#46534d', marginTop: '4px', wordBreak: 'break-all' }}>
                        Link: <a href={previewReviewUrl} target="_blank" rel="noreferrer">{previewReviewUrl}</a>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#5c6861', marginBottom: '5px' }}>
                      Template Name
                    </label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className={styles.grantInput}
                      style={{ width: '100%', maxWidth: '100%' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#5c6861', marginBottom: '5px' }}>
                      Email Subject Line
                    </label>
                    <input
                      type="text"
                      value={editSubject}
                      onChange={(e) => setEditSubject(e.target.value)}
                      className={styles.grantInput}
                      style={{ width: '100%', maxWidth: '100%', fontWeight: 600 }}
                    />
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px', flexWrap: 'wrap', gap: '4px' }}>
                      <label style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#5c6861' }}>
                        Email Body (Plain Text + Auto HTML Formatting)
                      </label>
                      <span style={{ fontSize: '11px', color: '#79847d' }}>Click a placeholder below to insert</span>
                    </div>
                    <textarea
                      rows={11}
                      value={editBody}
                      onChange={(e) => setEditBody(e.target.value)}
                      style={{
                        width: '100%',
                        border: '1px solid #d5ddd2',
                        borderRadius: '9px',
                        padding: '11px 12px',
                        font: "13px/1.55 'DM Sans', sans-serif",
                        background: '#fafbf8',
                        color: '#1d2925',
                        resize: 'vertical'
                      }}
                    />
                  </div>

                  {/* PLACEHOLDER VARIABLE CHIPS */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    {TEMPLATE_VARIABLES.map((v) => (
                      <button
                        key={v.token}
                        type="button"
                        onClick={() => insertVariable(v.token)}
                        title={`Insert ${v.label} (e.g. ${v.example})`}
                        style={{
                          border: '1px solid #d5ddd2',
                          background: '#f4f7f1',
                          color: '#284739',
                          borderRadius: '6px',
                          padding: '4px 8px',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        + {v.token}
                      </button>
                    ))}
                  </div>
                </>
              )}

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '12px',
                  color: '#46534d',
                  cursor: 'pointer',
                  paddingTop: '4px'
                }}
              >
                <input
                  type="checkbox"
                  checked={includeReviewCard}
                  onChange={(e) => setIncludeReviewCard(e.target.checked)}
                />
                <span>Include interactive ⭐⭐⭐⭐⭐ Rating &amp; Review footer card in sent HTML email</span>
              </label>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', paddingTop: '8px', borderTop: '1px solid #edf0eb' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => void handleSaveTemplate()}
                    disabled={busyAction === 'save_template'}
                    className={styles.copyButton}
                  >
                    {busyAction === 'save_template' ? (
                      <Loader2 size={14} className="spin" />
                    ) : (
                      <Save size={14} />
                    )}
                    <span>Save Template {activeSlot}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleResetTemplate()}
                    disabled={busyAction === 'reset_template'}
                    className={styles.trackedLinkBtn}
                  >
                    <RotateCcw size={13} />
                    <span>Reset</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => void handleManualSendBatch()}
                  disabled={Boolean(busyAction)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '7px',
                    background: '#285934',
                    color: '#fff',
                    border: 0,
                    borderRadius: '8px',
                    padding: '9px 15px',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  <Send size={14} />
                  <span>
                    Send via Gmail to Selected ({selectedEmails.size})
                  </span>
                </button>
              </div>
            </section>

            {/* RIGHT PANEL: FILTERED RECIPIENTS & QUICK TEST SENDER */}
            <section
              style={{
                background: '#fff',
                border: '1px solid #dce3d6',
                borderRadius: '14px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                <div>
                  <div className={styles.eyebrow}>FILTERED RECIPIENT LIST</div>
                  <h3 style={{ margin: '3px 0 0', fontSize: '17px' }}>
                    {currentSegmentMeta.label} ({filteredRecipients.length})
                  </h3>
                </div>
                {activeSegment === 'review_request' && (
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: '#46534d', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={includeAllInReviewFilter}
                      onChange={(e) => setIncludeAllInReviewFilter(e.target.checked)}
                    />
                    <span>Include registered non-buyers too</span>
                  </label>
                )}
              </div>

              {/* ADD TEST / MANUAL EMAIL BAR */}
              <form
                onSubmit={handleAddCustomEmail}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  flexWrap: 'wrap',
                  background: '#f7f9f5',
                  border: '1px solid #dce3d6',
                  borderRadius: '10px',
                  padding: '9px 11px'
                }}
              >
                <UserPlus size={14} style={{ color: '#284739', flexShrink: 0 }} />
                <input
                  type="email"
                  value={newTestEmail}
                  onChange={(e) => setNewTestEmail(e.target.value)}
                  placeholder="Add test or manual recipient email..."
                  style={{
                    flex: 1,
                    minWidth: '170px',
                    border: '1px solid #cfd8cc',
                    borderRadius: '7px',
                    padding: '6px 9px',
                    fontSize: '12.5px',
                    background: '#fff',
                    color: '#1d2925'
                  }}
                />
                <button type="submit" className={styles.trackedLinkBtn}>
                  <Plus size={13} /> Add to list
                </button>
              </form>

              {/* SEARCH & SELECT ALL */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                <div className={styles.searchBox} style={{ maxWidth: '100%', flex: 1 }}>
                  <Search size={14} />
                  <input
                    type="search"
                    value={recipientQuery}
                    onChange={(e) => setRecipientQuery(e.target.value)}
                    placeholder="Filter recipients by email..."
                  />
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    className={styles.trackedLinkBtn}
                    onClick={() =>
                      setSelectedEmails(
                        new Set(filteredRecipients.map((r) => r.email.toLowerCase()))
                      )
                    }
                  >
                    Select All ({filteredRecipients.length})
                  </button>
                  <button
                    type="button"
                    className={styles.trackedLinkBtn}
                    onClick={() => setSelectedEmails(new Set())}
                  >
                    Clear
                  </button>
                </div>
              </div>

              {filteredRecipients.length === 0 ? (
                <div className={styles.empty}>
                  No customers currently match <strong>{currentSegmentMeta.label}</strong>. Use the <strong>Add to list</strong> box above to add your own email ({adminEmail}) and test sending Template {activeSlot} right now!
                </div>
              ) : (
                <div className={styles.tableWrap} style={{ maxHeight: '420px', overflowY: 'auto' }}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th style={{ width: '32px' }}>✓</th>
                        <th>Recipient</th>
                        <th>Products</th>
                        <th>Status in Segment</th>
                        <th>Single Send</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRecipients.map((r) => {
                        const emailKey = r.email.toLowerCase();
                        const checked = selectedEmails.has(emailKey);
                        const prevSent = sentBySegmentMap.get(`${activeSegment}:${emailKey}`);
                        const hasReviewed = reviewedEmailsSet.has(emailKey);
                        return (
                          <tr key={r.userId}>
                            <td>
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  const next = new Set(selectedEmails);
                                  if (e.target.checked) next.add(emailKey);
                                  else next.delete(emailKey);
                                  setSelectedEmails(next);
                                }}
                              />
                            </td>
                            <td>
                              <strong>{r.email}</strong>
                              <span className={styles.cellSub}>
                                {r.lastActivityFormatted}
                              </span>
                            </td>
                            <td>
                              <span
                                className={`${styles.badge} ${
                                  r.ownsStudio && r.ownsFieldguide
                                    ? styles.bundle
                                    : r.hasPaid
                                      ? styles.active
                                      : styles.neutral
                                }`}
                              >
                                {r.ownsStudio && r.ownsFieldguide
                                  ? '$5 + $9'
                                  : r.ownsStudio
                                    ? '$9 Studio'
                                    : r.ownsFieldguide
                                      ? '$5 Guide'
                                      : 'Registered'}
                              </span>
                            </td>
                            <td>
                              {prevSent ? (
                                <span className={`${styles.badge} ${styles.active}`}>
                                  Sent T{prevSent.templateSlot} ({prevSent.mode})
                                </span>
                              ) : hasReviewed && activeSegment === 'review_request' ? (
                                <span className={`${styles.badge} ${styles.bundle}`}>
                                  ★ Reviewed
                                </span>
                              ) : (
                                <span className={`${styles.badge} ${styles.neutral}`}>
                                  Ready to send
                                </span>
                              )}
                            </td>
                            <td>
                              <button
                                type="button"
                                disabled={Boolean(busyAction)}
                                onClick={() => void handleManualSendBatch([r])}
                                className={styles.actionGrant}
                              >
                                <Send size={11} /> Send T{activeSlot}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        </>
      )}

      {/* =====================================================================
          SUB-VIEW 2: COLLECTED RATINGS & REVIEWS MANAGER
         ===================================================================== */}
      {subView === 'reviews' && (
        <section
          style={{
            background: '#fff',
            border: '1px solid #dce3d6',
            borderRadius: '14px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}
        >
          <div className={styles.sectionTitle} style={{ marginBottom: 0 }}>
            <div>
              <div className={styles.eyebrow}>CUSTOMER RATINGS &amp; TESTIMONIALS</div>
              <h2>Collected product reviews ({reviews.length} total · ★ {avgReviewRating} avg)</h2>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className={styles.copyButton}
                onClick={() => {
                  setActiveSegment('review_request');
                  setSubView('campaigns');
                }}
              >
                <Mail size={14} /> Send Review Request Campaign
              </button>
              <Link href="/review" target="_blank" className={styles.trackedLinkBtn}>
                Open /review Form <ExternalLink size={13} />
              </Link>
            </div>
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Rating</th>
                  <th>Customer</th>
                  <th>Product</th>
                  <th>Headline &amp; Review</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((rev) => {
                  const shareQuote = `"${rev.headline} — ${rev.comment}"\n— ${rev.name} (${rev.role}) ${'⭐'.repeat(rev.rating)}`;
                  return (
                    <tr key={rev.id}>
                      <td>
                        <strong style={{ color: '#c99700', letterSpacing: '1px' }}>
                          {'★'.repeat(rev.rating)}{'☆'.repeat(Math.max(0, 5 - rev.rating))}
                        </strong>
                        <span className={styles.cellSub}>{rev.rating} / 5 stars</span>
                      </td>
                      <td>
                        <strong>{rev.name}</strong>
                        <span className={styles.cellSub}>{rev.email}</span>
                      </td>
                      <td>
                        <span className={`${styles.badge} ${rev.verifiedBuyer ? styles.active : styles.neutral}`}>
                          {rev.productKey === 'both'
                            ? 'Bundle ($14)'
                            : rev.productKey === 'studio'
                              ? 'Studio ($9)'
                              : 'Fieldguide ($5)'}
                          {rev.verifiedBuyer ? ' · Verified' : ''}
                        </span>
                      </td>
                      <td style={{ whiteSpace: 'normal', maxWidth: '380px' }}>
                        <strong>{rev.headline}</strong>
                        <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#526058', lineHeight: 1.45 }}>
                          {rev.comment}
                        </p>
                      </td>
                      <td>
                        <span className={`${styles.badge} ${rev.published ? styles.active : styles.pending}`}>
                          {rev.published ? 'Published on Store' : 'Hidden'}
                        </span>
                      </td>
                      <td>
                        <div className={styles.rowActions}>
                          <button
                            type="button"
                            className={styles.trackedLinkBtn}
                            onClick={() => {
                              navigator.clipboard.writeText(shareQuote);
                              setCopiedId(rev.id);
                              setTimeout(() => setCopiedId(null), 1800);
                            }}
                          >
                            {copiedId === rev.id ? <Check size={12} /> : <Copy size={12} />}
                            {copiedId === rev.id ? 'Copied' : 'Copy Quote'}
                          </button>
                          <button
                            type="button"
                            className={styles.actionGrant}
                            onClick={() => void handleModerateReview(rev.id, 'toggle')}
                          >
                            {rev.published ? 'Hide' : 'Publish'}
                          </button>
                          <button
                            type="button"
                            className={styles.actionRevoke}
                            onClick={() => void handleModerateReview(rev.id, 'delete')}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* =====================================================================
          SUB-VIEW 3: SENT EMAIL LOG & DELIVERY HISTORY
         ===================================================================== */}
      {subView === 'history' && (
        <section
          style={{
            background: '#fff',
            border: '1px solid #dce3d6',
            borderRadius: '14px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}
        >
          <div className={styles.sectionTitle} style={{ marginBottom: 0 }}>
            <div>
              <div className={styles.eyebrow}>GMAIL DELIVERY AUDIT LOG</div>
              <h2>Sent emails history ({sentLogs.length})</h2>
            </div>
            <span>Tracks both Manual Admin sends &amp; Auto-Send dispatches</span>
          </div>

          {sentLogs.length === 0 ? (
            <p className={styles.empty}>
              No emails have been sent yet. Connect your Gmail above and click Send on any audience segment!
            </p>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Sent At</th>
                    <th>Recipient</th>
                    <th>Filter Segment</th>
                    <th>Template</th>
                    <th>Mode</th>
                    <th>Subject</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sentLogs.map((log) => (
                    <tr key={log.id}>
                      <td>
                        {new Date(log.sentAt).toLocaleString('en-IN', {
                          dateStyle: 'medium',
                          timeStyle: 'short'
                        })}
                      </td>
                      <td>
                        <strong>{log.to}</strong>
                      </td>
                      <td>
                        {EMAIL_SEGMENTS.find((s) => s.key === log.segment)?.shortLabel || log.segment}
                      </td>
                      <td>Template {log.templateSlot}</td>
                      <td>
                        <span className={`${styles.badge} ${log.mode === 'auto' ? styles.bundle : styles.neutral}`}>
                          {log.mode === 'auto' ? 'Auto-Send' : 'Manual'}
                        </span>
                      </td>
                      <td style={{ maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {log.subject}
                      </td>
                      <td>
                        <span className={`${styles.badge} ${log.status === 'sent' ? styles.active : styles.revoked}`}>
                          {log.status === 'sent' ? 'Sent via Gmail' : `Failed: ${log.error || ''}`}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
