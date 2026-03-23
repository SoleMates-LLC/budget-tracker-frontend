import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

function inputStyle(hasError) {
  return {
    width: '100%',
    height: 48,
    borderRadius: 12,
    background: 'var(--bg-surface)',
    border: `1px solid ${hasError ? 'var(--danger)' : 'var(--border)'}`,
    color: 'var(--text-primary)',
    fontSize: '1rem',
    padding: '0 14px',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s',
  };
}

function EiBLogo({ size = 64 }) {
  return (
    <img
      src="/logo.webp"
      alt="eIFB Logo"
      width={size}
      height={size}
      style={{ borderRadius: size * 0.18, boxShadow: '0 8px 32px rgba(0,0,0,0.4)', flexShrink: 0 }}
    />
  );
}

function AppleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.7 9.05 7.4c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 3.99zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ animation: 'spin 0.8s linear infinite' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <circle cx="9" cy="9" r="7" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
      <path d="M9 2a7 7 0 0 1 7 7" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// ── Digit code input (shared by forgot + reset flows) ─────────────────────────
function CodeInput({ onComplete }) {
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef([]);

  useEffect(() => {
    if (digits.every(d => d !== '')) onComplete(digits.join(''));
  }, [digits]);

  function handleChange(i, val) {
    const cleaned = val.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[i] = cleaned;
    setDigits(next);
    if (cleaned && i < 5) inputRefs.current[i + 1]?.focus();
  }

  function handleKeyDown(i, e) {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      const next = [...digits];
      next[i - 1] = '';
      setDigits(next);
      inputRefs.current[i - 1]?.focus();
    }
  }

  function handlePaste(e) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const next = [...digits];
    for (let i = 0; i < 6; i++) next[i] = pasted[i] || '';
    setDigits(next);
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
  }

  const cellStyle = (filled) => ({
    width: 44,
    height: 54,
    borderRadius: 12,
    border: `2px solid ${filled ? '#ef4444' : 'var(--border)'}`,
    background: filled ? 'rgba(239,68,68,0.08)' : 'var(--bg-surface)',
    color: 'var(--text-primary)',
    fontSize: '1.5rem',
    fontWeight: 700,
    textAlign: 'center',
    outline: 'none',
    caretColor: 'transparent',
  });

  return (
    <div style={{ display: 'flex', gap: 8 }} onPaste={handlePaste}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={el => inputRefs.current[i] = el}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)}
          style={cellStyle(!!d)}
          autoFocus={i === 0}
        />
      ))}
    </div>
  );
}

// ── Main LoginPage ─────────────────────────────────────────────────────────────
export default function LoginPage() {
  const { signInWithApple, signInWithEmail, signUp, devSignIn, forgotPassword, resetPassword } = useAuth();

  // mode: 'signin' | 'signup' | 'forgot' | 'reset'
  const [mode, setMode]         = useState('signin');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  function goToMode(m) {
    setMode(m);
    setError('');
    setSuccessMsg('');
    setResetCode('');
    setNewPassword('');
    setConfirmPassword('');
  }

  // ── Sign in / Sign up ──────────────────────────────────────────────────────
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'signup') {
        await signUp({ email, password, full_name: fullName });
      } else {
        await signInWithEmail({ email, password });
      }
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.details?.[0]?.msg ||
        err.message ||
        'Something went wrong.';
      setError(msg);
      setPassword(''); // Clear password on error; keep email so user doesn't retype it
    } finally {
      setLoading(false);
    }
  };

  // ── Forgot password — send code ────────────────────────────────────────────
  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await forgotPassword(email);
      setSuccessMsg('Check your email for a 6-digit reset code.');
      goToMode('reset');
      setSuccessMsg('Check your email for a 6-digit reset code.');
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  // ── Reset password — submit new password ───────────────────────────────────
  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!resetCode || resetCode.length !== 6) {
      setError('Please enter the 6-digit code from your email.');
      return;
    }
    setLoading(true);
    try {
      await resetPassword({ email, code: resetCode, newPassword });
      setSuccessMsg('Password reset! You can now sign in.');
      goToMode('signin');
      setSuccessMsg('Password reset successfully. Sign in with your new password.');
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithApple();
    } catch (err) {
      setError(err.message || 'Sign in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 'calc(var(--safe-top) + 48px) 32px calc(var(--safe-bottom) + 40px)',
        minHeight: '100%',
        overflowY: 'auto',
      }}
    >
      {/* Logo + Title */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, marginBottom: 32 }}>
        <EiBLogo size={72} />
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 6 }}>
            eIFB Budget Tracker
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
            Track smarter. Spend better.
          </p>
        </div>
      </div>

      <div style={{ width: '100%' }}>

        {/* ── Forgot password — email entry ─────────────────────────────────── */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgotSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ marginBottom: 8 }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 6px' }}>Forgot your password?</h2>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                Enter your email and we'll send you a reset code.
              </p>
            </div>

            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={e => { setEmail(e.target.value); setError(''); }}
              required
              autoComplete="email"
              style={inputStyle(!!error)}
            />

            {error && (
              <p style={{ color: 'var(--danger)', fontSize: '0.875rem', textAlign: 'center', lineHeight: 1.4, margin: 0 }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                height: 50, borderRadius: 9999,
                background: loading ? '#333' : 'var(--accent)',
                color: '#fff', fontWeight: 600, fontSize: '1rem',
                border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4,
              }}
            >
              {loading && <SpinnerIcon />}
              Send Reset Code
            </button>

            <button
              type="button"
              onClick={() => goToMode('signin')}
              style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', marginTop: 4 }}
            >
              ← Back to Sign In
            </button>
          </form>
        )}

        {/* ── Reset password — code + new password ─────────────────────────── */}
        {mode === 'reset' && (
          <form onSubmit={handleResetSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ marginBottom: 8 }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 6px' }}>Reset your password</h2>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                Enter the 6-digit code sent to <strong style={{ color: 'var(--text-primary)' }}>{email}</strong> and choose a new password.
              </p>
            </div>

            {successMsg && (
              <p style={{ color: '#4ade80', fontSize: '0.875rem', textAlign: 'center', lineHeight: 1.4, margin: 0 }}>
                {successMsg}
              </p>
            )}

            {/* Code digits */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
              <CodeInput onComplete={code => setResetCode(code)} />
            </div>

            <input
              type="password"
              placeholder="New password (min 8 characters)"
              value={newPassword}
              onChange={e => { setNewPassword(e.target.value); setError(''); }}
              required
              autoComplete="new-password"
              minLength={8}
              style={inputStyle(!!error && error.toLowerCase().includes('password'))}
            />
            <input
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={e => { setConfirmPassword(e.target.value); setError(''); }}
              required
              autoComplete="new-password"
              style={inputStyle(!!error && error.toLowerCase().includes('match'))}
            />

            {error && (
              <p style={{ color: 'var(--danger)', fontSize: '0.875rem', textAlign: 'center', lineHeight: 1.4, margin: 0 }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                height: 50, borderRadius: 9999,
                background: loading ? '#333' : '#ef4444',
                color: '#fff', fontWeight: 600, fontSize: '1rem',
                border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4,
              }}
            >
              {loading && <SpinnerIcon />}
              Reset Password
            </button>

            <button
              type="button"
              onClick={() => goToMode('forgot')}
              style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', fontSize: '0.875rem', cursor: 'pointer', marginTop: 4 }}
            >
              Resend code
            </button>
          </form>
        )}

        {/* ── Sign In / Sign Up ─────────────────────────────────────────────── */}
        {(mode === 'signin' || mode === 'signup') && (
          <>
            {successMsg && (
              <p style={{ color: '#4ade80', fontSize: '0.875rem', textAlign: 'center', lineHeight: 1.4, marginBottom: 12, padding: '10px 14px', background: 'rgba(74,222,128,0.08)', borderRadius: 10, border: '1px solid rgba(74,222,128,0.2)' }}>
                {successMsg}
              </p>
            )}

            {/* Sign In / Sign Up toggle */}
            <div
              style={{
                display: 'flex',
                background: 'var(--bg-surface)',
                borderRadius: 12,
                padding: 4,
                marginBottom: 20,
                border: '1px solid var(--border)',
              }}
            >
              {['signin', 'signup'].map((m) => (
                <button
                  key={m}
                  onClick={() => goToMode(m)}
                  style={{
                    flex: 1, height: 36, borderRadius: 9, border: 'none',
                    background: mode === m ? 'var(--accent)' : 'transparent',
                    color: mode === m ? '#fff' : 'var(--text-secondary)',
                    fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  {m === 'signin' ? 'Sign In' : 'Sign Up'}
                </button>
              ))}
            </div>

            <form onSubmit={handleEmailSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {mode === 'signup' && (
                <input
                  type="text"
                  placeholder="Full name (optional)"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoComplete="name"
                  style={inputStyle(false)}
                />
              )}
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                required
                autoComplete="email"
                style={inputStyle(!!error)}
              />
              <input
                type="password"
                placeholder={mode === 'signup' ? 'Password (min 8 characters)' : 'Password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                required
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                minLength={8}
                style={inputStyle(!!error)}
              />

              {error && (
                <p style={{ color: 'var(--danger)', fontSize: '0.875rem', textAlign: 'center', lineHeight: 1.4, margin: 0 }}>
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  height: 50, borderRadius: 9999,
                  background: loading ? '#333' : 'var(--accent)',
                  color: '#fff', fontWeight: 600, fontSize: '1rem',
                  border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4,
                }}
              >
                {loading && <SpinnerIcon />}
                {mode === 'signup' ? 'Create Account' : 'Sign In'}
              </button>

              {mode === 'signin' && (
                <button
                  type="button"
                  onClick={() => goToMode('forgot')}
                  style={{
                    background: 'none', border: 'none',
                    color: 'var(--text-tertiary)', fontSize: '0.8125rem',
                    cursor: 'pointer', padding: '2px 0', textAlign: 'center',
                  }}
                >
                  Forgot your password?
                </button>
              )}
            </form>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              <span style={{ color: 'var(--text-tertiary)', fontSize: '0.8125rem' }}>or</span>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            </div>

            {/* Apple Sign In */}
            <button
              onClick={handleAppleSignIn}
              disabled={loading}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                width: '100%', height: 50, borderRadius: 9999,
                background: '#000', color: '#fff', fontWeight: 600, fontSize: '1rem',
                border: '1px solid rgba(255,255,255,0.15)', cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              <AppleIcon />
              Sign in with Apple
            </button>

            <p style={{ marginTop: 14, textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
              Your data is private and secure.
            </p>

            {import.meta.env.DEV && (
              <button
                onClick={devSignIn}
                style={{
                  display: 'block', width: '100%', marginTop: 12, padding: '12px',
                  background: 'transparent', border: '1px dashed rgba(245,212,40,0.4)',
                  borderRadius: 12, color: 'rgba(245,212,40,0.6)', fontSize: '0.8125rem',
                  fontWeight: 500, cursor: 'pointer',
                }}
              >
                Dev Bypass — Skip Sign In
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
