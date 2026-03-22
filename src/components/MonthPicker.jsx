import React, { useMemo } from 'react';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function MonthPicker({ year, month, onChange }) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-indexed

  const isAtCurrent = year === currentYear && month === currentMonth;

  const handlePrev = () => {
    if (month === 1) {
      onChange(year - 1, 12);
    } else {
      onChange(year, month - 1);
    }
  };

  const handleNext = () => {
    if (isAtCurrent) return;
    if (month === 12) {
      onChange(year + 1, 1);
    } else {
      onChange(year, month + 1);
    }
  };

  const label = useMemo(() => `${MONTHS[month - 1]} ${year}`, [year, month]);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
      }}
    >
      <button
        onClick={handlePrev}
        aria-label="Previous month"
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          background: 'var(--bg-surface)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-secondary)',
          flexShrink: 0,
          transition: 'background 0.15s ease',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M10 12L6 8l4-4"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <span
        style={{
          fontSize: '1rem',
          fontWeight: 600,
          color: 'var(--text-primary)',
          minWidth: 140,
          textAlign: 'center',
        }}
      >
        {label}
      </span>

      <button
        onClick={handleNext}
        disabled={isAtCurrent}
        aria-label="Next month"
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          background: 'var(--bg-surface)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: isAtCurrent ? 'var(--text-tertiary)' : 'var(--text-secondary)',
          flexShrink: 0,
          transition: 'background 0.15s ease',
          cursor: isAtCurrent ? 'default' : 'pointer',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M6 4l4 4-4 4"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}
