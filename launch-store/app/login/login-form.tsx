'use client';
import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LogIn,
  ShieldCheck,
  Store
} from 'lucide-react';

type AuthMode = 'login' | 'recover';

export default function LoginForm({
  next,
  configured,
  initialMode = 'login',
  loggedOutInitially = false
}: {
  next: string;
  configured: boolean;
  initialMode?: AuthMode;
  loggedOutInitially?: boolean;
}) {
  const [showLoggedOut, setShowLoggedOut] = useState(loggedOutInitially);
  const [mode, setMode] = useState<AuthMode>(initialMode === 'recover' ? 'recover' : 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  function switchMode(value: AuthMode) {
    setShowLoggedOut(false);
    setMode(value);
    setMessage('');
    setIsError(false);
    setPassword('');
  }

  if (showLoggedOut) {
    return (
      <div className="logged-out-card" role="region" aria-label="Signed out confirmation">
        <div className="logged-out-badge">
          <CheckCircle2 size={22} />
          <span>ADMIN SESSION ENDED</span>
        </div>
        <h2>You’ve been signed out.</h2>
        <p>Your administrator session has been closed on this browser.</p>
        <div className="logged-out-actions">
          <button
            type="button"
            className="button dark"
            onClick={() => {
              setShowLoggedOut(false);
              setMode('login');
            }}
          >
            <LogIn size={17} /> Sign back in as Admin
          </button>
          <Link href="/" className="button outline">
            <Store size={17} /> Back to store
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form
      className="account-form"
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        setBusy(true);
        setMessage('');
        setIsError(false);
        try {
          const r = await fetch('/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, mode, next })
          });
          const d = await r.json();
          if (r.ok && d.url) {
            window.location.assign(d.url);
            return;
          }
          setIsError(!r.ok);
          setMessage(d.message || d.error || 'Please try again.');
        } catch {
          setIsError(true);
          setMessage('Could not connect. Please try again.');
        } finally {
          setBusy(false);
        }
      }}
    >
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          background: '#eef4ea',
          border: '1px solid #c9dec2',
          borderRadius: '999px',
          padding: '5px 12px',
          marginBottom: '14px',
          fontSize: '11.5px',
          fontWeight: 700,
          letterSpacing: '0.06em',
          color: '#173b31'
        }}
      >
        <ShieldCheck size={14} />
        <span>ADMINISTRATOR SIGN IN</span>
      </div>

      <div className="auth-mode-intro">
        {mode === 'login' && (
          <>
            <h2>Admin Sign In</h2>
            <p>
              Enter your administrator email and password to open the Sales &amp; Product Dashboard.
            </p>
          </>
        )}
        {mode === 'recover' && (
          <>
            <h2>Reset Admin Password</h2>
            <p>Enter your administrator email address to receive a password reset link.</p>
          </>
        )}
      </div>

      <div className="field-group">
        <label htmlFor="email">Admin email address</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="admin@example.com"
          disabled={busy}
        />
      </div>

      {mode !== 'recover' && (
        <div className="field-group">
          <div className="field-label-row">
            <label htmlFor="password">Password</label>
            <button
              type="button"
              className="password-toggle-btn"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <>
                  <EyeOff size={14} /> Hide
                </>
              ) : (
                <>
                  <Eye size={14} /> Show
                </>
              )}
            </button>
          </div>
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            minLength={1}
            maxLength={128}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Your admin password"
            disabled={busy}
          />
        </div>
      )}

      <button className="button dark auth-submit-btn" disabled={!configured || busy}>
        <span>
          {busy
            ? 'Verifying admin credentials…'
            : mode === 'login'
              ? 'Sign in to Admin Dashboard'
              : 'Send password reset link'}
        </span>
        <ArrowRight size={17} />
      </button>

      <p
        role="status"
        className={`auth-status-note ${message ? (isError ? 'is-error' : 'is-success') : ''}`}
      >
        {message ||
          (!configured
            ? 'Authentication is not configured yet.'
            : mode === 'login'
              ? 'Customers do not need to sign in—all purchases deliver immediately after Dodo checkout.'
              : 'Check your inbox after requesting a password link.')}
      </p>

      <div className="auth-bottom-links">
        {mode !== 'recover' ? (
          <button
            type="button"
            className="auth-link"
            disabled={busy}
            onClick={() => switchMode('recover')}
          >
            <KeyRound size={14} /> Reset admin password
          </button>
        ) : (
          <button
            type="button"
            className="auth-link"
            disabled={busy}
            onClick={() => switchMode('login')}
          >
            <ArrowLeft size={14} /> Back to admin sign in
          </button>
        )}
        <Link href="/" className="auth-store-link">
          Return to storefront
        </Link>
      </div>
    </form>
  );
}
