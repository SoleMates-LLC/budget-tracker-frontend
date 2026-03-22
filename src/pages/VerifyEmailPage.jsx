import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function VerifyEmailPage() {
  const { user, verifyEmail, resendVerification, signOut } = useAuth();
  const navigate = useNavigate();

  const [digits, setDigits]     = useState(['', '', '', '', '', '']);
  const [error, setError]       = useState('');
  const [submitting, setSub]    = useState(false);
  const [resending, setResend]  = useState(false);
  const [resendMsg, setResendMsg] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const inputRefs = useRef([]);

  // Start cooldown timer when resend is triggered
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // Auto-submit when all digits are filled
  useEffect(() => {
    if (digits.every(d => d !== '')) {
      handleSubmit(digits.join(''));
    }
  }, [digits]);

  function handleDigitChange(i, val) {
    const cleaned = val.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[i] = cleaned;
    setDigits(next);
    setError('');
    if (cleaned && i < 5) inputRefs.current[i + 1]?.focus();
  }

  function handleKeyDown(i, e) {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
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
    const focusIdx = Math.min(pasted.length, 5);
    inputRefs.current[focusIdx]?.focus();
  }

  async function handleSubmit(code) {
    if (submitting) return;
    setSub(true);
    setError('');
    try {
      await verifyEmail(code);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Incorrect code. Please try again.');
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setSub(false);
    }
  }

  async function handleResend() {
    if (resending || cooldown > 0) return;
    setResending(true);
    setResendMsg('');
    setError('');
    try {
      await resendVerification();
      setResendMsg('Code sent! Check your inbox.');
      setCooldown(60);
    } catch {
      setResendMsg('Failed to resend. Please try again.');
    } finally {
      setResending(false);
    }
  }

  const digitStyle = (filled) => ({
    width: 46,
    height: 56,
    borderRadius: 12,
    border: `2px solid ${filled ? 'var(--accent)' : 'var(--border)'}`,
    background: filled ? 'rgba(38,99,235,0.08)' : 'var(--bg-surface)',
    color: 'var(--text-primary)',
    fontSize: '1.5rem',
    fontWeight: 700,
    textAlign: 'center',
    outline: 'none',
    caretColor: 'transparent',
    transition: 'border-color 0.15s, background 0.15s',
  });

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 24px' }}>
      {/* Icon */}
      <div style={{ width: 64, height: 64, borderRadius: 20, background: 'rgba(38,99,235,0.12)', border: '1.5px solid rgba(38,99,235,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        </svg>
      </div>

      <h1 style={{ fontSize: '1.375rem', fontWeight: 700, marginBottom: 8, textAlign: 'center' }}>Check your email</h1>
      <p style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)', textAlign: 'center', lineHeight: 1.5, marginBottom: 32, maxWidth: 300 }}>
        We sent a 6-digit code to<br />
        <strong style={{ color: 'var(--text-primary)' }}>{user?.email}</strong>
      </p>

      {/* Code inputs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }} onPaste={handlePaste}>
        {digits.map((d, i) => (
          <input
            key={i}
            ref={el => inputRefs.current[i] = el}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={d}
            onChange={e => handleDigitChange(i, e.target.value)}
            onKeyDown={e => handleKeyDown(i, e)}
            style={digitStyle(!!d)}
            autoFocus={i === 0}
          />
        ))}
      </div>

      {/* Error */}
      {error && (
        <p style={{ color: 'var(--danger)', fontSize: '0.875rem', marginBottom: 16, textAlign: 'center' }}>
          {error}
        </p>
      )}

      {/* Loading indicator */}
      {submitting && (
        <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem', marginBottom: 16 }}>Verifying…</p>
      )}

      {/* Manual submit (fallback) */}
      {digits.some(d => d) && !submitting && (
        <button
          onClick={() => handleSubmit(digits.join(''))}
          disabled={digits.some(d => !d)}
          style={{ width: '100%', maxWidth: 300, padding: '14px', borderRadius: 14, border: 'none', background: digits.every(d => d) ? 'var(--accent)' : 'var(--bg-surface)', color: digits.every(d => d) ? '#fff' : 'var(--text-tertiary)', fontWeight: 700, fontSize: '1rem', cursor: digits.every(d => d) ? 'pointer' : 'default', marginBottom: 16 }}>
          Verify Email
        </button>
      )}

      {/* Resend */}
      <div style={{ textAlign: 'center', marginTop: 8 }}>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', marginBottom: 8 }}>Didn't receive it?</p>
        <button
          onClick={handleResend}
          disabled={resending || cooldown > 0}
          style={{ background: 'none', border: 'none', color: cooldown > 0 ? 'var(--text-tertiary)' : 'var(--accent)', fontSize: '0.875rem', fontWeight: 600, cursor: cooldown > 0 ? 'default' : 'pointer', padding: 0 }}>
          {resending ? 'Sending…' : cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
        </button>
        {resendMsg && (
          <p style={{ fontSize: '0.8125rem', color: resendMsg.includes('sent') ? '#4ade80' : 'var(--danger)', marginTop: 8 }}>
            {resendMsg}
          </p>
        )}
      </div>

      {/* Sign out link */}
      <button onClick={signOut} style={{ marginTop: 32, background: 'none', border: 'none', color: 'var(--text-tertiary)', fontSize: '0.8125rem', cursor: 'pointer', padding: 0 }}>
        Use a different account
      </button>
    </div>
  );
}
