import React, { useState, useEffect, useCallback } from 'react';
import client from '../api/client.js';

function fmt(n) {
  return (n || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

// ── Amortization engine ───────────────────────────────────────────────────────
function calcPayoff(balance, aprPct, totalMonthly) {
  if (balance <= 0) return { months: 0, totalInterest: 0, paid: true };
  if (totalMonthly <= 0) return null;

  const rate = aprPct / 100 / 12;

  if (rate === 0) {
    return { months: Math.ceil(balance / totalMonthly), totalInterest: 0 };
  }

  // If payment doesn't cover first month's interest, never pays off
  if (totalMonthly <= balance * rate) return null;

  let b = balance;
  let totalInterest = 0;
  let months = 0;
  while (b > 0.005 && months < 1200) {
    const interest = b * rate;
    totalInterest += interest;
    b = b + interest - totalMonthly;
    months++;
  }
  return { months, totalInterest: Math.max(0, totalInterest) };
}

function payoffLabel(months) {
  if (months <= 0) return 'Paid off';
  const y = Math.floor(months / 12);
  const m = months % 12;
  const parts = [];
  if (y > 0) parts.push(`${y}y`);
  if (m > 0) parts.push(`${m}mo`);
  return parts.join(' ');
}

function payoffDate(months) {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

// Format months into years/months string
function fmtTerm(months) {
  if (!months) return null;
  const y = Math.floor(months / 12);
  const m = months % 12;
  const parts = [];
  if (y > 0) parts.push(`${y} yr`);
  if (m > 0) parts.push(`${m} mo`);
  return parts.join(' ');
}

// ── Debt types ────────────────────────────────────────────────────────────────
const DEBT_TYPES = [
  { value: 'mortgage',      label: 'Mortgage',       icon: '🏠' },
  { value: 'car_loan',      label: 'Car Loan',        icon: '🚗' },
  { value: 'student_loan',  label: 'Student Loan',    icon: '🎓' },
  { value: 'credit_card',   label: 'Credit Card',     icon: '💳' },
  { value: 'personal_loan', label: 'Personal Loan',   icon: '🤝' },
  { value: 'other',         label: 'Other',           icon: '📋' },
];

// ── Amortization schedule ─────────────────────────────────────────────────────
// Returns month-by-month rows: { month, payment, principal, interest, balance }
function buildSchedule(balance, aprPct, totalMonthly) {
  if (balance <= 0 || totalMonthly <= 0) return [];
  const rate = aprPct / 100 / 12;
  if (rate > 0 && totalMonthly <= balance * rate) return [];

  const rows = [];
  let b = balance;
  let month = 0;
  while (b > 0.005 && month < 600) {
    month++;
    const interest  = b * rate;
    const principal = Math.min(totalMonthly - interest, b);
    const payment   = interest + principal;
    b = Math.max(0, b - principal);
    rows.push({ month, payment, principal, interest, balance: b });
  }
  return rows;
}

// Collapse monthly rows into yearly summary rows
function yearlyRollup(schedule) {
  const years = {};
  for (const row of schedule) {
    const yr = Math.ceil(row.month / 12);
    if (!years[yr]) years[yr] = { year: yr, payment: 0, principal: 0, interest: 0, balance: row.balance };
    years[yr].payment   += row.payment;
    years[yr].principal += row.principal;
    years[yr].interest  += row.interest;
    years[yr].balance    = row.balance; // end-of-year balance
  }
  return Object.values(years);
}

// ── Amortization Table component ──────────────────────────────────────────────
function AmortizationTable({ balance, aprPct, totalMonthly, debtType }) {
  const [expanded, setExpanded] = useState(false);
  const [view, setView]         = useState('yearly'); // 'yearly' | 'monthly'

  const schedule = buildSchedule(balance, aprPct, totalMonthly);
  if (!schedule.length) return null;

  const yearly  = yearlyRollup(schedule);
  const isLong  = schedule.length > 24; // > 2 years — default to yearly view

  const rows    = view === 'monthly' ? schedule : yearly;
  const preview = rows.slice(0, view === 'monthly' ? 6 : 3);
  const shown   = expanded ? rows : preview;

  const hdr = { fontSize: '0.6875rem', color: 'var(--text-tertiary)', fontWeight: 700, textAlign: 'right', padding: '6px 8px' };
  const cell = { fontSize: '0.75rem', textAlign: 'right', padding: '7px 8px', borderTop: '1px solid var(--border)' };
  const cellFirst = { ...cell, textAlign: 'left', color: 'var(--text-secondary)' };

  return (
    <div style={{ marginTop: 14 }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Amortization Schedule
        </p>
        {schedule.length > 12 && (
          <div style={{ display: 'flex', gap: 4 }}>
            {['yearly', 'monthly'].map(v => (
              <button key={v} onClick={() => { setView(v); setExpanded(false); }}
                style={{ padding: '3px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: '0.6875rem', fontWeight: 600,
                  background: view === v ? 'var(--accent)' : 'var(--bg-surface)', color: view === v ? '#fff' : 'var(--text-tertiary)' }}>
                {v === 'yearly' ? 'Yearly' : 'Monthly'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid var(--border)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
          <thead>
            <tr style={{ background: 'var(--bg-surface)' }}>
              <th style={{ ...hdr, textAlign: 'left' }}>{view === 'monthly' ? 'Month' : 'Year'}</th>
              <th style={hdr}>Payment</th>
              <th style={hdr}>Principal</th>
              <th style={{ ...hdr, color: '#f97316' }}>Interest</th>
              <th style={hdr}>Balance</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((row, i) => {
              const isLast = row.balance < 0.01;
              return (
                <tr key={i} style={{ background: isLast ? 'rgba(74,222,128,0.06)' : i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}>
                  <td style={{ ...cellFirst, fontWeight: 600, color: isLast ? '#4ade80' : 'var(--text-primary)' }}>
                    {view === 'monthly' ? `Mo ${row.month}` : `Yr ${row.year}`}
                    {isLast ? ' ✓' : ''}
                  </td>
                  <td style={cell}>{fmt(row.payment)}</td>
                  <td style={{ ...cell, color: '#4ade80' }}>{fmt(row.principal)}</td>
                  <td style={{ ...cell, color: '#f97316' }}>{fmt(row.interest)}</td>
                  <td style={{ ...cell, fontWeight: 600 }}>{fmt(row.balance)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Show more / less */}
      {rows.length > preview.length && (
        <button onClick={() => setExpanded(e => !e)}
          style={{ width: '100%', marginTop: 6, padding: '8px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontSize: '0.8125rem', fontWeight: 600 }}>
          {expanded ? `Hide ${rows.length - preview.length} rows ▲` : `Show all ${rows.length} ${view === 'monthly' ? 'months' : 'years'} ▼`}
        </button>
      )}
    </div>
  );
}

// ── Chart helpers ─────────────────────────────────────────────────────────────
const DEBT_COLORS = ['#3b82f6','#f97316','#8b5cf6','#4ade80','#ef4444','#06b6d4','#d946ef','#f59e0b'];

// Returns array of monthly balances starting from current balance (index 0 = today)
function projectionPoints(balance, aprPct, totalMonthly) {
  if (balance <= 0) return [0];
  if (totalMonthly <= 0) return null;
  const rate = aprPct / 100 / 12;
  if (rate > 0 && totalMonthly <= balance * rate) return null; // never pays off
  const pts = [balance];
  let b = balance;
  while (b > 0.01 && pts.length < 601) {
    const interest = b * rate;
    b = Math.max(0, b + interest - totalMonthly);
    pts.push(b);
  }
  return pts;
}

function DebtChart({ debts }) {
  if (!debts.length) return null;

  const today = new Date();
  today.setDate(1);

  // Build per-debt line data
  const lines = debts.map((debt, idx) => {
    const totalMonthly = parseFloat(debt.monthly_payment) + parseFloat(debt.extra_payment || 0);
    const balance  = parseFloat(debt.current_balance);
    const original = parseFloat(debt.original_balance);
    const apr      = parseFloat(debt.interest_rate);

    // History: straight line estimate from created_at → today
    const created = new Date(debt.created_at);
    created.setDate(1);
    const histMonths = Math.max(0, Math.round((today - created) / (1000 * 60 * 60 * 24 * 30.44)));

    const proj = projectionPoints(balance, apr, totalMonthly);

    return {
      id: debt.id, name: debt.name,
      color: DEBT_COLORS[idx % DEBT_COLORS.length],
      histMonths, original, balance, proj,
    };
  });

  const maxHistMonths = Math.max(...lines.map(l => l.histMonths), 0);
  const maxProjMonths = Math.max(...lines.map(l => l.proj ? l.proj.length - 1 : 0), 1);
  const maxBalance    = Math.max(...lines.map(l => Math.max(l.original, l.balance)), 1);
  const totalMonths   = maxHistMonths + maxProjMonths;

  const W = 340, H = 210, PAD_L = 50, PAD_B = 36, PAD_T = 16, PAD_R = 8;
  const cW = W - PAD_L - PAD_R;
  const cH = H - PAD_T - PAD_B;

  // month 0 = today; negative = past; positive = future
  const xOf = (m) => PAD_L + ((m + maxHistMonths) / totalMonths) * cW;
  const yOf = (b) => PAD_T + cH - Math.max(0, (b / maxBalance)) * cH;
  const todayX = xOf(0);

  // Y-axis ticks
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(f => ({ val: maxBalance * f, y: yOf(maxBalance * f) }));

  // X-axis labels — pick ~5 evenly spaced
  const labelStep = Math.max(Math.ceil(totalMonths / 5), 1);
  const xLabels = [];
  for (let m = -maxHistMonths; m <= maxProjMonths + 1; m += labelStep) {
    const d = new Date(today);
    d.setMonth(d.getMonth() + m);
    xLabels.push({ m, x: xOf(m), label: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }) });
  }

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ overflow: 'visible' }}>
        {/* Grid + Y labels */}
        {yTicks.map((t, i) => (
          <g key={i}>
            <line x1={PAD_L} x2={W - PAD_R} y1={t.y} y2={t.y}
              stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
            <text x={PAD_L - 5} y={t.y + 4} textAnchor="end"
              fill="rgba(255,255,255,0.28)" fontSize="9" fontFamily="system-ui">
              {t.val >= 1000 ? `$${(t.val / 1000).toFixed(0)}k` : `$${Math.round(t.val)}`}
            </text>
          </g>
        ))}

        {/* Shaded projection region */}
        <rect x={todayX} y={PAD_T} width={W - PAD_R - todayX} height={cH}
          fill="rgba(255,255,255,0.015)" />

        {/* Today divider */}
        <line x1={todayX} x2={todayX} y1={PAD_T} y2={PAD_T + cH}
          stroke="rgba(255,255,255,0.25)" strokeWidth="1" strokeDasharray="4 3" />
        <text x={todayX + 3} y={PAD_T + 9} fill="rgba(255,255,255,0.35)" fontSize="8" fontFamily="system-ui">
          Today
        </text>

        {/* X labels */}
        {xLabels.map((l, i) => (
          <text key={i} x={l.x} y={H - 2} textAnchor="middle"
            fill="rgba(255,255,255,0.28)" fontSize="8" fontFamily="system-ui">
            {l.label}
          </text>
        ))}

        {/* Per-debt lines */}
        {lines.map(line => {
          const histPath = line.histMonths > 0
            ? `M ${xOf(-line.histMonths)},${yOf(line.original)} L ${xOf(0)},${yOf(line.balance)}`
            : null;

          const projPathD = line.proj
            ? line.proj.map((b, i) => `${i === 0 ? 'M' : 'L'} ${xOf(i)},${yOf(b)}`).join(' ')
            : null;

          return (
            <g key={line.id}>
              {/* History — dashed, slightly faded */}
              {histPath && (
                <path d={histPath} fill="none" stroke={line.color}
                  strokeWidth="2" strokeDasharray="5 3" opacity="0.55" />
              )}
              {/* Projection — solid */}
              {projPathD && (
                <path d={projPathD} fill="none" stroke={line.color}
                  strokeWidth="2.5" opacity="0.9" />
              )}
              {/* No-payoff indicator */}
              {!line.proj && (
                <text x={xOf(6)} y={yOf(line.balance) - 6} fill={line.color} fontSize="8" fontFamily="system-ui" opacity="0.7">
                  payment too low
                </text>
              )}
              {/* Current balance dot */}
              <circle cx={xOf(0)} cy={yOf(line.balance)} r="4"
                fill={line.color} stroke="var(--bg-secondary)" strokeWidth="2" />
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', marginTop: 10 }}>
        {lines.map(line => (
          <div key={line.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 20, height: 3, borderRadius: 9999, background: line.color }} />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{line.name}</span>
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="20" height="3" viewBox="0 0 20 3">
            <line x1="0" y1="1.5" x2="20" y2="1.5" stroke="rgba(255,255,255,0.35)" strokeWidth="2" strokeDasharray="4 3" />
          </svg>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>History (est.)</span>
        </div>
      </div>
    </div>
  );
}

// ── Debt Form ─────────────────────────────────────────────────────────────────
function DebtForm({ initial, recurring, onSave, onClose }) {
  const isEdit = !!initial;

  const [name, setName]                   = useState(initial?.name || '');
  const [debtType, setDebtType]           = useState(initial?.debt_type || 'other');
  const [startDate, setStartDate]         = useState(() => {
    if (!initial?.start_date) return '';
    const s = typeof initial.start_date === 'string' ? initial.start_date : initial.start_date.toISOString();
    return s.slice(0, 10);
  });
  const [loanTermMonths, setLoanTermMonths] = useState(initial?.loan_term_months ? String(initial.loan_term_months) : '');
  const [currentBalance, setCurrentBalance] = useState(initial ? String(initial.current_balance) : '');
  const [originalBalance, setOriginalBalance] = useState(initial ? String(initial.original_balance) : '');
  const [interestRate, setInterestRate]   = useState(initial ? String(initial.interest_rate) : '');
  const [monthlyPayment, setMonthlyPayment] = useState(initial ? String(initial.monthly_payment) : '');
  const [extraPayment, setExtraPayment]   = useState(initial ? String(initial.extra_payment) : '');
  const [linkedId, setLinkedId]           = useState(initial?.linked_recurring_id || '');
  const [saving, setSaving]               = useState(false);
  const [error, setError]                 = useState('');

  // When a recurring payment is selected, pre-fill monthly payment
  const handleLinkedChange = (id) => {
    setLinkedId(id);
    if (id) {
      const rec = recurring.find(r => r.id === id);
      if (rec) setMonthlyPayment(String(rec.amount));
    }
  };

  const numField = (setter) => (e) => {
    const v = e.target.value.replace(/[^0-9.]/g, '');
    const parts = v.split('.');
    if (parts.length > 2) return;
    if (parts[1]?.length > 2) return;
    setter(v);
  };

  const handleSubmit = async () => {
    if (!name.trim())          { setError('Name is required.'); return; }
    if (!currentBalance || isNaN(parseFloat(currentBalance))) { setError('Enter current balance.'); return; }
    if (!interestRate && interestRate !== '0') { setError('Enter interest rate (0 if none).'); return; }
    if (!monthlyPayment || parseFloat(monthlyPayment) <= 0) { setError('Enter a monthly payment.'); return; }
    setError(''); setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        debt_type:         debtType,
        start_date:        startDate || null,
        loan_term_months:  loanTermMonths ? parseInt(loanTermMonths) : null,
        current_balance:   parseFloat(currentBalance),
        original_balance:  parseFloat(originalBalance || currentBalance),
        interest_rate:     parseFloat(interestRate) || 0,
        monthly_payment:   parseFloat(monthlyPayment),
        extra_payment:     parseFloat(extraPayment) || 0,
        linked_recurring_id: linkedId || null,
      };
      if (isEdit) {
        await client.put(`/api/debts/${initial.id}`, payload);
      } else {
        await client.post('/api/debts', payload);
      }
      onSave();
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong.');
    } finally { setSaving(false); }
  };

  const inputStyle = {
    width: '100%', padding: '12px 14px', background: 'var(--bg-surface)',
    borderRadius: 12, border: '1px solid var(--border)',
    color: 'var(--text-primary)', fontSize: '1rem', boxSizing: 'border-box',
  };
  const labelStyle = {
    fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 700,
    letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 8,
  };
  const amtInput = (val, setter, placeholder) => (
    <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-surface)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden', minWidth: 0 }}>
      <span style={{ padding: '0 10px', color: 'var(--text-tertiary)', fontSize: '1rem', flexShrink: 0 }}>$</span>
      <input type="text" inputMode="decimal" value={val} onChange={numField(setter)} placeholder={placeholder}
        style={{ flex: 1, minWidth: 0, padding: '12px 8px 12px 0', fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }} />
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 8, overflowX: 'hidden', width: '100%' }}>
      {/* Debt type selector */}
      <div>
        <label style={labelStyle}>Type</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {DEBT_TYPES.map(t => (
            <button key={t.value} type="button" onClick={() => setDebtType(t.value)}
              style={{ padding: '8px 14px', borderRadius: 20, border: '1.5px solid', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600, transition: 'all 0.12s',
                borderColor: debtType === t.value ? 'var(--accent)' : 'var(--border)',
                background: debtType === t.value ? 'rgba(38,99,235,0.12)' : 'var(--bg-surface)',
                color: debtType === t.value ? 'var(--accent)' : 'var(--text-tertiary)' }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Name */}
      <div>
        <label style={labelStyle}>Debt Name</label>
        <input type="text" value={name} onChange={e => setName(e.target.value)}
          placeholder="e.g. Car Loan, Credit Card" style={inputStyle} />
      </div>

      {/* Link to recurring */}
      <div>
        <label style={labelStyle}>Linked Recurring Payment <span style={{ fontWeight: 400, textTransform: 'none', opacity: 0.5 }}>(optional)</span></label>
        <div style={{ position: 'relative' }}>
          {linkedId && (() => {
            const sel = recurring.find(r => r.id === linkedId);
            return sel ? <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: '1rem', pointerEvents: 'none', zIndex: 1 }}>🔄</span> : null;
          })()}
          <select value={linkedId} onChange={e => handleLinkedChange(e.target.value)}
            style={{ ...inputStyle, padding: linkedId ? '12px 40px 12px 40px' : '12px 40px 12px 14px', appearance: 'none', colorScheme: 'dark', cursor: 'pointer' }}>
            <option value="">No linked payment</option>
            {recurring.filter(r => r.is_active).map(r => (
              <option key={r.id} value={r.id}>{r.name} · {fmt(r.amount)}/mo</option>
            ))}
          </select>
          <svg style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M4 6l4 4 4-4" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      {/* Balances */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <label style={labelStyle}>Current Balance</label>
          {amtInput(currentBalance, setCurrentBalance, '0.00')}
        </div>
        <div style={{ minWidth: 0 }}>
          <label style={labelStyle}>Original Balance <span style={{ fontWeight: 400, textTransform: 'none', opacity: 0.5 }}>(opt)</span></label>
          {amtInput(originalBalance, setOriginalBalance, 'Same as current')}
        </div>
      </div>

      {/* Loan term */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <label style={labelStyle}>Start Date <span style={{ fontWeight: 400, textTransform: 'none', opacity: 0.5 }}>(opt)</span></label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
            style={{ ...inputStyle, colorScheme: 'dark', minWidth: 0 }} />
        </div>
        <div style={{ minWidth: 0 }}>
          <label style={labelStyle}>Term <span style={{ fontWeight: 400, textTransform: 'none', opacity: 0.5 }}>(opt)</span></label>
          <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-surface)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
            <input type="text" inputMode="numeric" value={loanTermMonths} onChange={e => setLoanTermMonths(e.target.value.replace(/\D/g, ''))}
              placeholder="360" style={{ flex: 1, minWidth: 0, padding: '12px 8px 12px 14px', fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }} />
            <span style={{ padding: '0 12px', color: 'var(--text-tertiary)', fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>mo</span>
          </div>
        </div>
      </div>
      {/* Common term quick-picks */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: -8 }}>
        {[{ label: '1yr', v: 12 }, { label: '2yr', v: 24 }, { label: '3yr', v: 36 }, { label: '5yr', v: 60 }, { label: '7yr', v: 84 }, { label: '10yr', v: 120 }, { label: '15yr', v: 180 }, { label: '20yr', v: 240 }, { label: '30yr', v: 360 }].map(t => (
          <button key={t.v} type="button" onClick={() => setLoanTermMonths(String(t.v))}
            style={{ padding: '5px 11px', borderRadius: 16, border: '1px solid', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600,
              borderColor: loanTermMonths === String(t.v) ? 'var(--accent)' : 'var(--border)',
              background: loanTermMonths === String(t.v) ? 'rgba(38,99,235,0.12)' : 'transparent',
              color: loanTermMonths === String(t.v) ? 'var(--accent)' : 'var(--text-tertiary)' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Interest rate */}
      <div>
        <label style={labelStyle}>Interest Rate (APR %)</label>
        <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-surface)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
          <input type="text" inputMode="decimal" value={interestRate} onChange={numField(setInterestRate)} placeholder="0.00"
            style={{ flex: 1, padding: '12px 12px 12px 14px', fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }} />
          <span style={{ padding: '0 14px', color: 'var(--text-tertiary)', fontSize: '1rem' }}>%</span>
        </div>
      </div>

      {/* Payments */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <label style={labelStyle}>Monthly Payment</label>
          {amtInput(monthlyPayment, setMonthlyPayment, '0.00')}
        </div>
        <div style={{ minWidth: 0 }}>
          <label style={labelStyle}>Extra Monthly <span style={{ fontWeight: 400, textTransform: 'none', opacity: 0.5 }}>(opt)</span></label>
          {amtInput(extraPayment, setExtraPayment, '0.00')}
        </div>
      </div>

      {/* Live preview of payoff */}
      {currentBalance && monthlyPayment && parseFloat(monthlyPayment) > 0 && (() => {
        const result = calcPayoff(parseFloat(currentBalance), parseFloat(interestRate) || 0, parseFloat(monthlyPayment) + (parseFloat(extraPayment) || 0));
        if (!result) return <p style={{ fontSize: '0.8125rem', color: 'var(--danger)', textAlign: 'center' }}>⚠️ Payment too low to cover interest</p>;
        if (result.paid) return null;
        return (
          <div style={{ background: 'rgba(38,99,235,0.08)', border: '1px solid rgba(38,99,235,0.2)', borderRadius: 12, padding: '12px 16px', display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Payoff</p>
              <p style={{ fontWeight: 700, color: 'var(--accent)' }}>{payoffDate(result.months)} <span style={{ fontWeight: 400, color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>({payoffLabel(result.months)})</span></p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Total Interest</p>
              <p style={{ fontWeight: 700, color: '#f97316' }}>{fmt(result.totalInterest)}</p>
            </div>
          </div>
        );
      })()}

      {error && <p style={{ color: 'var(--danger)', fontSize: '0.875rem', textAlign: 'center' }}>{error}</p>}

      <button className="btn-primary" onClick={handleSubmit} disabled={saving}>
        {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Debt'}
      </button>
    </div>
  );
}

// ── Debt Card ─────────────────────────────────────────────────────────────────
function DebtCard({ debt, onEdit, confirmDelete, setConfirmDelete, onDelete }) {
  const totalMonthly = parseFloat(debt.monthly_payment) + parseFloat(debt.extra_payment || 0);
  const balance      = parseFloat(debt.current_balance);
  const original     = parseFloat(debt.original_balance);
  const apr          = parseFloat(debt.interest_rate);
  const result       = calcPayoff(balance, apr, totalMonthly);
  const paidPct      = original > 0 ? Math.min(((original - balance) / original) * 100, 100) : 0;

  // Accent color based on interest rate
  const rateColor = apr === 0 ? '#4ade80' : apr < 10 ? 'var(--accent)' : apr < 20 ? '#f97316' : '#ef4444';

  return (
    <div className="card" style={{ marginBottom: 14 }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
            <span style={{ fontWeight: 700, fontSize: '1rem' }}>{debt.name}</span>
            {debt.linked_recurring_id && (
              <span style={{ fontSize: '0.6875rem', fontWeight: 600, padding: '2px 8px', borderRadius: 9999, background: 'rgba(38,99,235,0.12)', color: 'var(--accent)' }}>
                🔄 {debt.recurring_name}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em' }}>{fmt(balance)}</span>
            <span style={{ fontSize: '0.8125rem', color: rateColor, fontWeight: 700 }}>{apr}% APR</span>
          </div>
        </div>
        <button onClick={() => onEdit(debt)} style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--bg-surface)', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" strokeWidth="2" stroke="currentColor">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {/* Progress bar */}
      {original > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{Math.round(paidPct)}% paid off</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Original {fmt(original)}</span>
          </div>
          <div style={{ height: 6, borderRadius: 9999, background: 'rgba(255,255,255,0.08)' }}>
            <div style={{ height: '100%', width: `${paidPct}%`, borderRadius: 9999, background: 'linear-gradient(90deg, var(--accent), #4ade80)', transition: 'width 0.4s ease' }} />
          </div>
        </div>
      )}

      {/* Payment info row */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <div style={{ flex: 1, background: 'var(--bg-surface)', borderRadius: 10, padding: '10px 12px' }}>
          <p style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', marginBottom: 3 }}>Monthly Payment</p>
          <p style={{ fontWeight: 700, fontSize: '0.9375rem' }}>{fmt(debt.monthly_payment)}</p>
          {parseFloat(debt.extra_payment) > 0 && (
            <p style={{ fontSize: '0.6875rem', color: '#4ade80', marginTop: 2 }}>+{fmt(debt.extra_payment)} extra</p>
          )}
        </div>
        <div style={{ flex: 1, background: 'var(--bg-surface)', borderRadius: 10, padding: '10px 12px' }}>
          <p style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', marginBottom: 3 }}>Total / Month</p>
          <p style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--accent)' }}>{fmt(totalMonthly)}</p>
        </div>
      </div>

      {/* Payoff projection */}
      {result === null ? (
        <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '10px 14px' }}>
          <p style={{ fontSize: '0.8125rem', color: 'var(--danger)', fontWeight: 600 }}>⚠️ Payment too low to cover interest</p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 3 }}>Minimum needed: {fmt(balance * (apr / 100 / 12) + 0.01)}</p>
        </div>
      ) : result.paid ? (
        <div style={{ background: 'rgba(74,222,128,0.08)', borderRadius: 10, padding: '10px 14px', textAlign: 'center' }}>
          <p style={{ fontWeight: 700, color: '#4ade80' }}>✓ Paid Off!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1, background: 'rgba(38,99,235,0.08)', border: '1px solid rgba(38,99,235,0.15)', borderRadius: 10, padding: '10px 12px' }}>
            <p style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', marginBottom: 3 }}>Payoff Date</p>
            <p style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--accent)' }}>{payoffDate(result.months)}</p>
            <p style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', marginTop: 2 }}>{payoffLabel(result.months)} remaining</p>
          </div>
          <div style={{ flex: 1, background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.15)', borderRadius: 10, padding: '10px 12px' }}>
            <p style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', marginBottom: 3 }}>Total Interest</p>
            <p style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#f97316' }}>{fmt(result.totalInterest)}</p>
            <p style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', marginTop: 2 }}>Total cost {fmt(balance + result.totalInterest)}</p>
          </div>
        </div>
      )}

      {/* Loan term info */}
      {(debt.start_date || debt.loan_term_months) && (() => {
        const termMonths = debt.loan_term_months ? parseInt(debt.loan_term_months) : null;
        const startD = (() => {
          if (!debt.start_date) return null;
          const s = typeof debt.start_date === 'string' ? debt.start_date : debt.start_date.toISOString();
          const d = new Date(s.slice(0, 10) + 'T00:00:00');
          return isNaN(d.getTime()) ? null : d;
        })();
        const now = new Date();
        const monthsElapsed = startD
          ? Math.max(0, (now.getFullYear() - startD.getFullYear()) * 12 + (now.getMonth() - startD.getMonth()))
          : null;
        const scheduledEnd = startD && termMonths ? new Date(startD.getFullYear(), startD.getMonth() + termMonths, 1) : null;
        const scheduledEndLabel = scheduledEnd
          ? scheduledEnd.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
          : null;
        const termPct = termMonths && monthsElapsed !== null
          ? Math.min((monthsElapsed / termMonths) * 100, 100)
          : null;
        const moRemaining = termMonths && monthsElapsed !== null ? Math.max(0, termMonths - monthsElapsed) : null;
        const projMonths = result && !result.paid ? result.months : 0;
        const delta = moRemaining !== null && projMonths ? moRemaining - projMonths : null; // positive = ahead of schedule

        return (
          <div style={{ marginTop: 12, padding: '12px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
            <p style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>
              Loan Terms
            </p>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: termPct !== null ? 10 : 0 }}>
              {startD && (
                <div>
                  <p style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', marginBottom: 2 }}>Start Date</p>
                  <p style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                    {startD.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </p>
                </div>
              )}
              {termMonths && (
                <div>
                  <p style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', marginBottom: 2 }}>Term</p>
                  <p style={{ fontSize: '0.875rem', fontWeight: 600 }}>{fmtTerm(termMonths)}</p>
                </div>
              )}
              {scheduledEndLabel && (
                <div>
                  <p style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', marginBottom: 2 }}>Scheduled End</p>
                  <p style={{ fontSize: '0.875rem', fontWeight: 600 }}>{scheduledEndLabel}</p>
                </div>
              )}
              {delta !== null && (
                <div>
                  <p style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', marginBottom: 2 }}>vs. Schedule</p>
                  <p style={{ fontSize: '0.875rem', fontWeight: 700, color: delta >= 0 ? '#4ade80' : '#f97316' }}>
                    {delta >= 0 ? `${delta} mo ahead` : `${Math.abs(delta)} mo behind`}
                  </p>
                </div>
              )}
            </div>
            {termPct !== null && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>
                    {monthsElapsed} of {termMonths} mo elapsed
                  </span>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>{Math.round(termPct)}%</span>
                </div>
                <div style={{ height: 5, borderRadius: 9999, background: 'rgba(255,255,255,0.08)' }}>
                  <div style={{ height: '100%', width: `${termPct}%`, borderRadius: 9999, background: 'var(--accent)', transition: 'width 0.4s ease' }} />
                </div>
              </>
            )}
          </div>
        );
      })()}

      {/* Amortization schedule */}
      {result && !result.paid && (
        <AmortizationTable balance={balance} aprPct={apr} totalMonthly={totalMonthly} debtType={debt.debt_type} />
      )}

      {/* Delete */}
      <button
        onClick={() => confirmDelete === debt.id ? onDelete(debt.id) : setConfirmDelete(debt.id)}
        onBlur={() => setTimeout(() => setConfirmDelete(null), 200)}
        style={{ width: '100%', marginTop: 12, padding: '8px', borderRadius: 9, border: 'none', cursor: 'pointer', background: confirmDelete === debt.id ? 'rgba(239,68,68,0.15)' : 'transparent', color: confirmDelete === debt.id ? 'var(--danger)' : 'var(--text-tertiary)', fontSize: '0.8125rem', fontWeight: 600 }}>
        {confirmDelete === debt.id ? 'Tap again to delete' : 'Remove Debt'}
      </button>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function DebtPage() {
  const [debts, setDebts]         = useState([]);
  const [recurring, setRecurring] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [editing, setEditing]     = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [toast, setToast]         = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [debtRes, recRes] = await Promise.all([
        client.get('/api/debts'),
        client.get('/api/recurring'),
      ]);
      setDebts(debtRes.data.debts || []);
      setRecurring(recRes.data.recurring || []);
    } catch { } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  const handleDelete = async (id) => {
    try {
      await client.delete(`/api/debts/${id}`);
      setDebts(prev => prev.filter(d => d.id !== id));
      setConfirmDelete(null);
      showToast('Debt removed.');
    } catch { showToast('Failed to delete.'); }
  };

  // Summary totals
  const totalBalance  = debts.reduce((s, d) => s + parseFloat(d.current_balance), 0);
  const totalMonthly  = debts.reduce((s, d) => s + parseFloat(d.monthly_payment) + parseFloat(d.extra_payment || 0), 0);
  const latestPayoff  = debts.reduce((max, d) => {
    const r = calcPayoff(parseFloat(d.current_balance), parseFloat(d.interest_rate), parseFloat(d.monthly_payment) + parseFloat(d.extra_payment || 0));
    return r && !r.paid ? Math.max(max, r.months) : max;
  }, 0);

  return (
    <>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <h1 style={{ fontSize: '1.375rem', fontWeight: 700 }}>Debt</h1>
          <button onClick={() => { setEditing(null); setShowForm(true); }}
            style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--accent)', border: 'none', color: '#fff', fontSize: '1.25rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            +
          </button>
        </div>
        {debts.length > 0 && (
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>
            {fmt(totalBalance)} total · {fmt(totalMonthly)}/mo
            {latestPayoff > 0 ? ` · Debt-free ${payoffDate(latestPayoff)}` : ''}
          </p>
        )}
      </div>

      <div className="page-scrollable" style={{ padding: '0 16px' }}>
        {/* Payoff chart */}
        {!loading && debts.length > 0 && (
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Payoff Projection
              </p>
              {latestPayoff > 0 && (
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent)' }}>
                  Debt-free {payoffDate(latestPayoff)}
                </span>
              )}
            </div>
            <DebtChart debts={debts} />
          </div>
        )}

        {loading ? (
          [1, 2].map(i => (
            <div key={i} className="card" style={{ marginBottom: 14 }}>
              <div className="skeleton" style={{ height: 20, width: '55%', marginBottom: 10 }} />
              <div className="skeleton" style={{ height: 32, width: '40%', marginBottom: 10 }} />
              <div className="skeleton" style={{ height: 6, width: '100%', borderRadius: 9999 }} />
            </div>
          ))
        ) : debts.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '40px 24px' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>💳</div>
            <p style={{ fontWeight: 600, marginBottom: 6 }}>No debts tracked</p>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', marginBottom: 20 }}>
              Add loans, credit cards, or any balance you're paying down
            </p>
            <button className="btn-primary" style={{ width: 'auto', padding: '12px 24px', margin: '0 auto' }}
              onClick={() => { setEditing(null); setShowForm(true); }}>
              Add First Debt
            </button>
          </div>
        ) : (
          debts.map(d => (
            <DebtCard
              key={d.id}
              debt={d}
              onEdit={(debt) => { setEditing(debt); setShowForm(true); }}
              confirmDelete={confirmDelete}
              setConfirmDelete={setConfirmDelete}
              onDelete={handleDelete}
            />
          ))
        )}

        {/* Extra payment impact tip */}
        {debts.length > 0 && (
          <div style={{ marginBottom: 12, padding: '12px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
              💡 Increasing any monthly payment saves interest. Edit a debt to model the impact.
            </p>
          </div>
        )}

        <div style={{ height: 24 }} />
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)', background: '#1e293b', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 20px', fontSize: '0.875rem', fontWeight: 600, color: '#fff', zIndex: 300, whiteSpace: 'nowrap' }}>
          {toast}
        </div>
      )}

      {/* Add / Edit modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 400, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          onClick={e => { if (e.target === e.currentTarget) { setShowForm(false); setEditing(null); } }}>
          <div style={{ width: '100%', maxWidth: 430, background: 'var(--bg-secondary)', borderRadius: '20px 20px 0 0', padding: '24px 20px', maxHeight: '92vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700 }}>{editing ? 'Edit Debt' : 'Add Debt'}</h2>
              <button onClick={() => { setShowForm(false); setEditing(null); }}
                style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--bg-surface)', border: 'none', color: 'var(--text-secondary)', fontSize: '1.125rem', cursor: 'pointer' }}>
                ✕
              </button>
            </div>
            <DebtForm
              initial={editing}
              recurring={recurring}
              onSave={() => { setShowForm(false); setEditing(null); fetchAll(); }}
              onClose={() => { setShowForm(false); setEditing(null); }}
            />
          </div>
        </div>
      )}
    </>
  );
}
