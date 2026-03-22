import React from 'react';
import { NavLink } from 'react-router-dom';

const tabs = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" strokeWidth="1.75">
        <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" />
      </svg>
    ),
  },
  {
    to: '/expenses',
    label: 'Expenses',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" strokeWidth="1.75">
        <path
          d="M4 6h16M4 10h16M4 14h10M4 18h7"
          stroke="currentColor"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    to: '/budgets',
    label: 'Budgets',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" strokeWidth="1.75">
        <rect x="2" y="7" width="20" height="14" rx="2.5" stroke="currentColor" />
        <path
          d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"
          stroke="currentColor"
          strokeLinecap="round"
        />
        <circle cx="12" cy="14" r="2" stroke="currentColor" />
      </svg>
    ),
  },
  {
    to: '/recurring',
    label: 'Auto Pay',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" strokeWidth="1.75">
        <path d="M4 12a8 8 0 0 1 14.93-4" stroke="currentColor" strokeLinecap="round" />
        <path d="M20 12a8 8 0 0 1-14.93 4" stroke="currentColor" strokeLinecap="round" />
        <path d="M19 5l-1.5 2.5L15 6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5 19l1.5-2.5L9 18" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    to: '/debt',
    label: 'Debt',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" strokeWidth="1.75">
        <rect x="2" y="5" width="20" height="14" rx="2.5" stroke="currentColor" />
        <path d="M2 10h20" stroke="currentColor" strokeLinecap="round" />
        <path d="M6 15h4" stroke="currentColor" strokeLinecap="round" />
        <path d="M14 15h4" stroke="currentColor" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    to: '/profile',
    label: 'Profile',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" strokeWidth="1.75">
        <circle cx="12" cy="8" r="4" stroke="currentColor" />
        <path
          d="M4 20c0-4 3.582-7 8-7s8 3 8 7"
          stroke="currentColor"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
];

export default function BottomNav() {
  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: 430,
        height: 'calc(64px + var(--safe-bottom))',
        background: 'var(--bg-secondary)',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'flex-start',
        paddingTop: 4,
        zIndex: 200,
      }}
    >
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          style={{ flex: 1, textDecoration: 'none' }}
        >
          {({ isActive }) => (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 3,
                padding: '6px 0',
                color: isActive ? 'var(--accent)' : 'var(--text-tertiary)',
                transition: 'color 0.15s ease',
              }}
            >
              {tab.icon}
              <span
                style={{
                  fontSize: '0.6rem',
                  fontWeight: isActive ? 600 : 400,
                  letterSpacing: '0.02em',
                }}
              >
                {tab.label}
              </span>
            </div>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
