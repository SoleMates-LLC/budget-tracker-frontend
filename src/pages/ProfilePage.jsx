import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

function ChevronRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ActionRow({ label, icon, onPress, danger, disabled }) {
  const [pressed, setPressed] = useState(false);
  return (
    <button
      onClick={onPress}
      disabled={disabled}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        width: '100%',
        padding: '15px 16px',
        background: pressed ? 'rgba(255,255,255,0.04)' : 'transparent',
        transition: 'background 0.1s ease',
        textAlign: 'left',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 9,
          background: danger ? 'rgba(239,68,68,0.12)' : 'var(--bg-surface-2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: danger ? 'var(--danger)' : 'var(--text-secondary)',
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <span
        style={{
          flex: 1,
          fontSize: '0.9375rem',
          fontWeight: 500,
          color: danger ? 'var(--danger)' : 'var(--text-primary)',
        }}
      >
        {label}
      </span>
      <span style={{ color: 'var(--text-tertiary)' }}>
        <ChevronRight />
      </span>
    </button>
  );
}

export default function ProfilePage() {
  const { user, signOut, signOutAll } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [signingOutAll, setSigningOutAll] = useState(false);
  const [error, setError] = useState('');

  const initial = (user?.full_name || user?.email || 'U').charAt(0).toUpperCase();

  const handleSignOut = async () => {
    setError('');
    setSigningOut(true);
    try {
      await signOut();
    } catch {
      setError('Failed to sign out. Please try again.');
      setSigningOut(false);
    }
  };

  const handleSignOutAll = async () => {
    setError('');
    setSigningOutAll(true);
    try {
      await signOutAll();
    } catch {
      setError('Failed to sign out all devices.');
      setSigningOutAll(false);
    }
  };

  return (
    <div className="page-scrollable" style={{ padding: '0' }}>
      {/* Header area */}
      <div
        style={{
          paddingTop: 'calc(var(--safe-top) + 24px)',
          paddingBottom: 32,
          paddingLeft: 20,
          paddingRight: 20,
        }}
      >
        <h1 style={{ fontSize: '1.375rem', fontWeight: 700, marginBottom: 28 }}>Profile</h1>

        {/* Avatar + info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 4px 16px rgba(245,212,40,0.3)',
            }}
          >
            <span style={{ fontSize: '1.625rem', fontWeight: 700, color: '#1a1a1a' }}>
              {initial}
            </span>
          </div>
          <div style={{ minWidth: 0 }}>
            <p
              style={{
                fontSize: '1.125rem',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {user?.full_name || 'eIFB User'}
            </p>
            {user?.email && (
              <p
                style={{
                  fontSize: '0.875rem',
                  color: 'var(--text-secondary)',
                  marginTop: 2,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {user.email}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'var(--border)', marginBottom: 8 }} />

      {/* Account section */}
      <div style={{ padding: '8px 16px 4px' }}>
        <p style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-tertiary)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4, paddingLeft: 4 }}>
          Account
        </p>
      </div>

      <div
        className="card"
        style={{ margin: '0 16px', padding: 0, overflow: 'hidden' }}
      >
        <ActionRow
          label={signingOut ? 'Signing out…' : 'Sign Out'}
          disabled={signingOut}
          icon={
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" strokeWidth="1.5">
              <path d="M6.75 15.75H3.75A1.5 1.5 0 0 1 2.25 14.25V3.75A1.5 1.5 0 0 1 3.75 2.25h3" stroke="currentColor" strokeLinecap="round" />
              <path d="M12 12.75L15.75 9 12 5.25" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M15.75 9H6.75" stroke="currentColor" strokeLinecap="round" />
            </svg>
          }
          onPress={handleSignOut}
          danger
        />

        <div style={{ height: 1, background: 'var(--border)', margin: '0 16px' }} />

        <ActionRow
          label={signingOutAll ? 'Signing out…' : 'Sign Out All Devices'}
          disabled={signingOutAll}
          icon={
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" strokeWidth="1.5">
              <rect x="1.5" y="3" width="10.5" height="9" rx="1.5" stroke="currentColor" />
              <path d="M13.5 6H15a1.5 1.5 0 0 1 1.5 1.5v6A1.5 1.5 0 0 1 15 15H6a1.5 1.5 0 0 1-1.5-1.5V13.5" stroke="currentColor" strokeLinecap="round" />
              <path d="M4.5 12H7.5" stroke="currentColor" strokeLinecap="round" />
            </svg>
          }
          onPress={handleSignOutAll}
          danger
        />
      </div>

      {error && (
        <p style={{ color: 'var(--danger)', fontSize: '0.875rem', margin: '16px 20px 0', textAlign: 'center' }}>
          {error}
        </p>
      )}

      {/* About section */}
      <div style={{ padding: '24px 16px 4px' }}>
        <p style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-tertiary)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4, paddingLeft: 4 }}>
          About
        </p>
      </div>

      <div className="card" style={{ margin: '0 16px', padding: 0, overflow: 'hidden' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 9,
                background: 'var(--bg-surface)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <span style={{ fontSize: 10, fontWeight: 700, color: '#fff' }}>eIB</span>
              <div style={{ position: 'absolute', bottom: 0, right: 0, width: 10, height: 2, background: 'var(--accent)' }} />
            </div>
            <span style={{ fontSize: '0.9375rem', fontWeight: 500 }}>eIFB Budget</span>
          </div>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>v0.1.0</span>
        </div>
      </div>

      {/* Bottom padding */}
      <div style={{ height: 32 }} />
    </div>
  );
}
