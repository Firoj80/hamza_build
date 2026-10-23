'use client';
import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Download, Search, PlusCircle, ShieldOff, Loader2 } from 'lucide-react';
import styles from './sales.module.css';

export type CustomerRecord = {
  userId: string;
  email: string;
  customerName?: string | null;
  ownsStudio: boolean;
  ownsFieldguide: boolean;
  ownsBundle?: boolean;
  triedStudio: number;
  triedFieldguide: number;
  triedBundle?: number;
  workspaceKeys: number;
  workspaceSummary: string | null;
  nicheLabel: string | null;
  checksCompleted: number;
  workspaceUpdatedAtFormatted: string | null;
  spentFormatted: string;
  hasPaid: boolean;
  lastActivityFormatted: string;
  lastActivityIso: string;
  sourceLabel?: string;
};

export type PaymentExportRow = {
  type: 'payment' | 'checkout_attempt';
  id: string;
  customer: string;
  product: string;
  status: string;
  amount: string;
  dateIso: string;
};

function downloadCsv(
  filename: string,
  headers: string[],
  rows: (string | number | boolean)[][]
) {
  const escapeCell = (val: string | number | boolean) => {
    const str = String(val ?? '');
    return str.includes(',') || str.includes('"') || str.includes('\n')
      ? `"${str.replace(/"/g, '""')}"`
      : str;
  };
  const csv = [
    headers.map(escapeCell).join(','),
    ...rows.map((r) => r.map(escapeCell).join(','))
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function CustomerAdmin({
  customers,
  paymentExportRows
}: {
  customers: CustomerRecord[];
  paymentExportRows: PaymentExportRow[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [segment, setSegment] = useState<'all' | 'paid' | 'upgrade' | 'abandoned' | 'workspace'>(
    'all'
  );
  const [grantEmail, setGrantEmail] = useState('');
  const [grantProduct, setGrantProduct] = useState<'studio' | 'fieldguide' | 'bundle'>('bundle');
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return customers.filter((c) => {
      if (
        q &&
        !c.email.toLowerCase().includes(q) &&
        !(c.customerName || '').toLowerCase().includes(q) &&
        !c.userId.toLowerCase().includes(q) &&
        !(c.nicheLabel || '').toLowerCase().includes(q)
      ) {
        return false;
      }
      if (segment === 'paid') return c.hasPaid;
      if (segment === 'upgrade') return c.ownsFieldguide && !c.ownsStudio;
      if (segment === 'abandoned')
        return !c.hasPaid && c.triedStudio + c.triedFieldguide + (c.triedBundle || 0) > 0;
      if (segment === 'workspace') return c.ownsStudio && c.workspaceKeys > 0;
      return true;
    });
  }, [customers, query, segment]);

  async function handleAccess(params: {
    userId?: string;
    email?: string;
    productKey: 'studio' | 'fieldguide' | 'bundle';
    action: 'grant' | 'revoke';
    key: string;
  }) {
    setBusyKey(params.key);
    setStatusMsg(null);
    try {
      const res = await fetch('/api/admin/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: params.userId,
          email: params.email,
          productKey: params.productKey,
          action: params.action
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatusMsg({ type: 'err', text: data.error || 'Could not update product access' });
      } else {
        const prodName =
          params.productKey === 'bundle'
            ? 'Complete Creator Bundle ($12)'
            : params.productKey === 'studio'
              ? 'Launchpad Studio ($9)'
              : 'Fieldguide ($5)';
        setStatusMsg({
          type: 'ok',
          text:
            params.action === 'grant'
              ? `Granted ${prodName} access.`
              : `Revoked ${prodName} access.`
        });
        if (params.email) setGrantEmail('');
        router.refresh();
      }
    } catch {
      setStatusMsg({ type: 'err', text: 'Network error while updating access' });
    } finally {
      setBusyKey(null);
    }
  }

  function exportCustomers() {
    downloadCsv(
      `dodo-buyers-and-customers-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        'Email',
        'Name',
        'Customer ID',
        'Owns Fieldguide ($5)',
        'Owns Studio ($9)',
        'Owns Bundle ($12)',
        'Studio Checkouts',
        'Fieldguide Checkouts',
        'Total Paid',
        'Source',
        'Last Active'
      ],
      filtered.map((c) => [
        c.email,
        c.customerName || '',
        c.userId,
        c.ownsFieldguide,
        c.ownsStudio,
        Boolean(c.ownsBundle),
        c.triedStudio,
        c.triedFieldguide,
        c.spentFormatted,
        c.sourceLabel || 'Dodo / Store',
        c.lastActivityIso
      ])
    );
  }

  function exportLedger() {
    downloadCsv(
      `sales-and-dodo-payments-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Record Type', 'ID', 'Customer', 'Product', 'Status', 'Amount', 'Timestamp'],
      paymentExportRows.map((r) => [
        r.type,
        r.id,
        r.customer,
        r.product,
        r.status,
        r.amount,
        r.dateIso
      ])
    );
  }

  return (
    <div className={styles.adminWrap}>
      <div className={styles.adminToolbar}>
        <div className={styles.searchBox}>
          <Search size={14} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Dodo buyer email, name, or ID..."
            aria-label="Search Dodo buyer email, name, or ID"
          />
        </div>
        <div className={styles.segmentTabs}>
          <button
            type="button"
            className={segment === 'all' ? styles.segActive : ''}
            onClick={() => setSegment('all')}
          >
            All ({customers.length})
          </button>
          <button
            type="button"
            className={segment === 'paid' ? styles.segActive : ''}
            onClick={() => setSegment('paid')}
          >
            Paid Dodo buyers ({customers.filter((c) => c.hasPaid).length})
          </button>
          <button
            type="button"
            className={segment === 'upgrade' ? styles.segActive : ''}
            onClick={() => setSegment('upgrade')}
          >
            Upgrade leads ({customers.filter((c) => c.ownsFieldguide && !c.ownsStudio).length})
          </button>
          <button
            type="button"
            className={segment === 'abandoned' ? styles.segActive : ''}
            onClick={() => setSegment('abandoned')}
          >
            Abandoned (
            {
              customers.filter(
                (c) => !c.hasPaid && c.triedStudio + c.triedFieldguide + (c.triedBundle || 0) > 0
              ).length
            }
            )
          </button>
          <button
            type="button"
            className={segment === 'workspace' ? styles.segActive : ''}
            onClick={() => setSegment('workspace')}
          >
            Active Studio ({customers.filter((c) => c.ownsStudio && c.workspaceKeys > 0).length})
          </button>
        </div>
        <div className={styles.exportActions}>
          <button type="button" className={styles.copyButton} onClick={exportCustomers}>
            <Download size={14} /> Buyers CSV
          </button>
          <button type="button" className={styles.copyButton} onClick={exportLedger}>
            <Download size={14} /> Dodo Payments CSV
          </button>
        </div>
      </div>

      <form
        className={styles.grantBar}
        onSubmit={(e) => {
          e.preventDefault();
          if (!grantEmail.trim()) return;
          handleAccess({
            email: grantEmail,
            productKey: grantProduct,
            action: 'grant',
            key: 'email_grant'
          });
        }}
      >
        <span className={styles.grantLabel}>Manual buyer access grant:</span>
        <input
          type="email"
          required
          value={grantEmail}
          onChange={(e) => setGrantEmail(e.target.value)}
          placeholder="Buyer email address..."
          className={styles.grantInput}
        />
        <select
          value={grantProduct}
          onChange={(e) => setGrantProduct(e.target.value as 'studio' | 'fieldguide' | 'bundle')}
          className={styles.grantSelect}
          aria-label="Select product to grant"
        >
          <option value="bundle">Complete Creator Bundle ($12 · PDF + HTML)</option>
          <option value="studio">Launchpad Studio ($9 · HTML App)</option>
          <option value="fieldguide">Idea-to-Income Fieldguide ($5 · PDF)</option>
        </select>
        <button type="submit" disabled={busyKey === 'email_grant'} className={styles.grantBtn}>
          {busyKey === 'email_grant' ? (
            <Loader2 size={14} className="spin" />
          ) : (
            <PlusCircle size={14} />
          )}
          Grant complimentary access
        </button>
        {statusMsg && (
          <span className={statusMsg.type === 'ok' ? styles.msgOk : styles.msgErr}>
            {statusMsg.text}
          </span>
        )}
      </form>

      {filtered.length === 0 ? (
        <p className={styles.empty}>No buyers or customers match the current filter.</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Buyer (Dodo / Store)</th>
                <th>Purchased products</th>
                <th>Delivery &amp; Workspace</th>
                <th>Lifecycle / upgrade signal</th>
                <th>Total paid</th>
                <th>Quick access control</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 60).map((c) => {
                const ownershipLabel = c.ownsBundle
                  ? 'Complete Bundle ($12 · PDF + HTML)'
                  : c.ownsStudio && c.ownsFieldguide
                    ? 'Fieldguide + Studio ($14)'
                    : c.ownsStudio
                      ? 'Launchpad Studio ($9)'
                      : c.ownsFieldguide
                        ? 'Fieldguide ($5)'
                        : 'None yet';
                const ownershipBadge =
                  c.ownsBundle || (c.ownsStudio && c.ownsFieldguide)
                    ? styles.bundle
                    : c.ownsStudio || c.ownsFieldguide
                      ? styles.active
                      : styles.neutral;
                const wsText =
                  c.workspaceKeys > 0
                    ? c.workspaceSummary || `Active · ${c.workspaceKeys} saved keys`
                    : c.ownsBundle
                      ? 'PDF + HTML App delivered'
                      : c.ownsStudio
                        ? 'HTML App delivered'
                        : c.ownsFieldguide
                          ? 'PDF Guide delivered'
                          : '—';
                const totalTries = c.triedStudio + c.triedFieldguide + (c.triedBundle || 0);
                const signal =
                  c.ownsBundle || (c.ownsStudio && c.ownsFieldguide)
                    ? { text: 'Full-stack bundle buyer', cls: styles.bundle }
                    : c.ownsFieldguide && !c.ownsStudio
                      ? {
                          text:
                            c.triedStudio > 0
                              ? 'Warm lead · tried Studio checkout'
                              : 'Upgrade candidate → Studio ($9)',
                          cls: styles.upgrade
                        }
                      : c.ownsStudio && !c.ownsFieldguide
                        ? {
                            text:
                              c.checksCompleted >= 7
                                ? 'Completed launch checklist'
                                : 'Studio HTML buyer',
                            cls: styles.active
                          }
                        : totalTries > 0
                          ? {
                              text: `Abandoned checkout (${totalTries}x)`,
                              cls: styles.abandoned
                            }
                          : { text: 'Store record', cls: styles.neutral };
                return (
                  <tr key={c.userId}>
                    <td>
                      <strong>{c.email}</strong>
                      <span className={styles.cellSub}>
                        {c.customerName ? `${c.customerName} · ` : ''}
                        {c.sourceLabel ? `${c.sourceLabel} · ` : ''}
                        {c.lastActivityFormatted}
                      </span>
                    </td>
                    <td>
                      <span className={`${styles.badge} ${ownershipBadge}`}>{ownershipLabel}</span>
                    </td>
                    <td>
                      {wsText}
                      {c.workspaceUpdatedAtFormatted && (
                        <span className={styles.cellSub}>
                          {c.nicheLabel ? `${c.nicheLabel} · ` : ''}Synced{' '}
                          {c.workspaceUpdatedAtFormatted}
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={`${styles.badge} ${signal.cls}`}>{signal.text}</span>
                    </td>
                    <td>
                      <strong>{c.spentFormatted}</strong>
                    </td>
                    <td>
                      <div className={styles.rowActions}>
                        {!c.ownsStudio ? (
                          <button
                            type="button"
                            disabled={busyKey === `${c.userId}:studio`}
                            onClick={() =>
                              handleAccess({
                                userId: c.userId,
                                email: c.email.includes('@') ? c.email : undefined,
                                productKey: 'studio',
                                action: 'grant',
                                key: `${c.userId}:studio`
                              })
                            }
                            className={styles.actionGrant}
                          >
                            <PlusCircle size={12} /> Grant Studio
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={busyKey === `${c.userId}:studio`}
                            onClick={() =>
                              handleAccess({
                                userId: c.userId,
                                email: c.email.includes('@') ? c.email : undefined,
                                productKey: 'studio',
                                action: 'revoke',
                                key: `${c.userId}:studio`
                              })
                            }
                            className={styles.actionRevoke}
                          >
                            <ShieldOff size={12} /> Revoke Studio
                          </button>
                        )}
                        {!c.ownsFieldguide ? (
                          <button
                            type="button"
                            disabled={busyKey === `${c.userId}:fieldguide`}
                            onClick={() =>
                              handleAccess({
                                userId: c.userId,
                                email: c.email.includes('@') ? c.email : undefined,
                                productKey: 'fieldguide',
                                action: 'grant',
                                key: `${c.userId}:fieldguide`
                              })
                            }
                            className={styles.actionGrant}
                          >
                            <PlusCircle size={12} /> Grant Guide
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={busyKey === `${c.userId}:fieldguide`}
                            onClick={() =>
                              handleAccess({
                                userId: c.userId,
                                email: c.email.includes('@') ? c.email : undefined,
                                productKey: 'fieldguide',
                                action: 'revoke',
                                key: `${c.userId}:fieldguide`
                              })
                            }
                            className={styles.actionRevoke}
                          >
                            <ShieldOff size={12} /> Revoke Guide
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
