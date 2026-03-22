import React from 'react';

export default function ProgressBar({ value = 0, color = '#f5d428', height = 4 }) {
  const clamped = Math.min(Math.max(value, 0), 1);
  const isOver = value > 1;
  const fillColor = isOver ? 'var(--danger)' : color;

  return (
    <div
      style={{
        width: '100%',
        height: height,
        borderRadius: 9999,
        background: 'rgba(255,255,255,0.08)',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          height: '100%',
          width: `${(isOver ? 1 : clamped) * 100}%`,
          borderRadius: 9999,
          background: fillColor,
          transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      />
    </div>
  );
}
