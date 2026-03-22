import React, { useState, useEffect, useCallback } from 'react';
import MonthPicker from '../components/MonthPicker.jsx';
import Modal from '../components/Modal.jsx';
import ExpenseForm from '../components/ExpenseForm.jsx';
import client from '../api/client.js';

function fmt(num) {
  return (num || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function fmtShort(num) {
  const abs = Math.abs(num);
  if (abs >= 1000) return `$${(abs / 1000).toFixed(1)}k`;
  return `$${abs.toFixed(0)}`;
}

function SummaryCard({ label, value, sub, accent }) {
  return (
    <div className="card" style={{ flex: 1, padding: '14px 16px', minWidth: 0 }}>
      <p style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
        {label}
      </p>
      <p style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.02em', color: accent || 'var(--text-primary)', lineHeight: 1 }}>
        {value}
      </p>
      {sub && <p style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', marginTop: 4 }}>{sub}</p>}
    </div>
  );
}

function CategoryBar({ cat, maxVal }) {
  const spent = cat.total_spent || 0;
  const budget = cat.budget || 0;
  const isOver = budget > 0 && spent > budget;
  const under = budget > 0 && spent <= budget;
  const delta = budget > 0 ? budget - spent : null;

  const budgetPct = maxVal > 0 ? (budget / maxVal) * 100 : 0;
  const spentPct  = maxVal > 0 ? (spent  / maxVal) * 100 : 0;

  return (
    <div style={{ marginBottom: 18 }}>
      {/* Row: icon + name + delta tag */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 7,
            background: `${cat.category_color || '#526080'}22`,
            border: `1.5px solid ${cat.category_color || '#526080'}44`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.875rem',
            flexShrink: 0,
          }}
        >
          {cat.category_icon || '📦'}
        </div>
        <span style={{ flex: 1, fontSize: '0.875rem', fontWeight: 500, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {cat.category_name}
        </span>
        {delta !== null && (
          <span
            style={{
              fontSize: '0.6875rem',
              fontWeight: 700,
              padding: '2px 7px',
              borderRadius: 9999,
              background: isOver ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.12)',
              color: isOver ? '#ef4444' : '#22c55e',
              flexShrink: 0,
            }}
          >
            {isOver ? `▲ ${fmtShort(spent - budget)} over` : `▼ ${fmtShort(delta)} under`}
          </span>
        )}
        {delta === null && spent > 0 && (
          <span style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', flexShrink: 0 }}>no budget</span>
        )}
      </div>

      {/* Bar track */}
      <div style={{ position: 'relative', height: 28, borderRadius: 6, background: 'rgba(255,255,255,0.05)', overflow: 'visible' }}>

        {/* Budget bar (background) */}
        {budget > 0 && (
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              height: '100%',
              width: `${budgetPct}%`,
              borderRadius: 6,
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.1)',
              transition: 'width 0.4s ease',
            }}
          />
        )}

        {/* Spent bar (foreground) */}
        {spent > 0 && (
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              height: '100%',
              width: `${Math.min(spentPct, 100)}%`,
              borderRadius: 6,
              background: isOver
                ? 'linear-gradient(90deg, #ef4444cc, #ef4444)'
                : `linear-gradient(90deg, ${cat.category_color || '#526080'}bb, ${cat.category_color || '#526080'})`,
              transition: 'width 0.4s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              paddingRight: 8,
              overflow: 'hidden',
            }}
          >
            {spentPct > 18 && (
              <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'rgba(255,255,255,0.9)', whiteSpace: 'nowrap' }}>
                {fmt(spent)}
              </span>
            )}
          </div>
        )}

        {/* Over-budget overflow indicator */}
        {isOver && (
          <div
            style={{
              position: 'absolute',
              right: -2,
              top: -2,
              bottom: -2,
              width: 4,
              borderRadius: 9999,
              background: '#ef4444',
              boxShadow: '0 0 8px #ef4444',
            }}
          />
        )}

        {/* Labels: spent (if bar too small) | budget */}
        <div style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: 8, paddingRight: spentPct > 80 ? 0 : 8 }}>
          {spentPct <= 18 && spent > 0 && (
            <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: isOver ? '#ef4444' : 'var(--text-secondary)' }}>
              {fmt(spent)}
            </span>
          )}
        </div>
      </div>

      {/* Budget label below bar */}
      {budget > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, paddingRight: 2 }}>
          <span style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>
            {cat.transaction_count} {cat.transaction_count === 1 ? 'transaction' : 'transactions'}
          </span>
          <span style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>
            Budget: {fmt(budget)}
          </span>
        </div>
      )}
    </div>
  );
}

function SkeletonBar() {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <div className="skeleton" style={{ width: 28, height: 28, borderRadius: 7, flexShrink: 0 }} />
        <div className="skeleton" style={{ flex: 1, height: 13, maxWidth: 120 }} />
        <div className="skeleton" style={{ width: 72, height: 18, borderRadius: 9999 }} />
      </div>
      <div className="skeleton" style={{ height: 28, borderRadius: 6 }} />
    </div>
  );
}

const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function TrendChart({ trend }) {
  if (!trend || trend.length === 0) return null;

  const W = 340, H = 200, PAD_L = 44, PAD_B = 36, PAD_T = 12, PAD_R = 8;
  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_T - PAD_B;

  const maxVal = Math.max(
    ...trend.flatMap(d => [d.income, d.budget, d.spent]),
    1
  );

  const colW  = chartW / trend.length;
  const barW  = Math.max(Math.floor(colW * 0.22), 4);
  const gap   = Math.floor(colW * 0.04);

  const yScale = v => chartH - (v / maxVal) * chartH;

  // Y-axis ticks
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(f => ({
    val: maxVal * f,
    y: PAD_T + yScale(maxVal * f),
  }));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ overflow: 'visible' }}>
      {/* Grid lines */}
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={PAD_L} x2={W - PAD_R} y1={t.y} y2={t.y}
            stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="3 3" />
          <text x={PAD_L - 6} y={t.y + 4} textAnchor="end"
            fill="rgba(255,255,255,0.3)" fontSize="9" fontFamily="system-ui">
            {t.val >= 1000 ? `$${(t.val/1000).toFixed(0)}k` : `$${Math.round(t.val)}`}
          </text>
        </g>
      ))}

      {/* Bars */}
      {trend.map((d, i) => {
        const cx = PAD_L + i * colW + colW / 2;
        const totalBarW = 3 * barW + 2 * gap;
        const x0 = cx - totalBarW / 2;

        const incomeH  = (d.income / maxVal) * chartH;
        const budgetH  = (d.budget / maxVal) * chartH;
        const spentH   = (d.spent  / maxVal) * chartH;

        const barBase = PAD_T + chartH;

        return (
          <g key={i}>
            {/* Income bar — green */}
            {d.income > 0 && (
              <rect x={x0} y={barBase - incomeH} width={barW} height={incomeH}
                rx="2" fill="#4ade80" opacity="0.85" />
            )}
            {/* Budget bar — accent */}
            {d.budget > 0 && (
              <rect x={x0 + barW + gap} y={barBase - budgetH} width={barW} height={budgetH}
                rx="2" fill="var(--accent)" opacity="0.75" />
            )}
            {/* Spend bar — orange/red */}
            {d.spent > 0 && (
              <rect
                x={x0 + 2 * (barW + gap)} y={barBase - spentH} width={barW} height={spentH}
                rx="2"
                fill={d.spent > d.budget && d.budget > 0 ? '#ef4444' : '#f97316'}
                opacity="0.9"
              />
            )}
            {/* Savings dot */}
            {d.income > 0 && (
              <circle
                cx={cx}
                cy={PAD_T + yScale(Math.max(d.savings, 0))}
                r="3"
                fill={d.savings >= 0 ? '#4ade80' : '#ef4444'}
                opacity="0.9"
              />
            )}
            {/* Month label */}
            <text x={cx} y={H - 4} textAnchor="middle"
              fill="rgba(255,255,255,0.4)" fontSize="9" fontFamily="system-ui">
              {MONTH_LABELS[d.month - 1]}
            </text>
          </g>
        );
      })}

      {/* Savings connecting line */}
      {trend.filter(d => d.income > 0).length > 1 && (() => {
        const pts = trend
          .map((d, i) => {
            if (d.income === 0) return null;
            const cx = PAD_L + i * colW + colW / 2;
            const cy = PAD_T + yScale(Math.max(d.savings, 0));
            return `${cx},${cy}`;
          })
          .filter(Boolean)
          .join(' ');
        return (
          <polyline points={pts} fill="none"
            stroke={trend.every(d => d.savings >= 0) ? '#4ade80' : '#f97316'}
            strokeWidth="1.5" strokeDasharray="4 2" opacity="0.6" />
        );
      })()}
    </svg>
  );
}

export default function DashboardPage() {
  const now = new Date();
  const [year, setYear]     = useState(now.getFullYear());
  const [month, setMonth]   = useState(now.getMonth() + 1);
  const [summary, setSummary] = useState(null);
  const [trend, setTrend]   = useState([]);
  const [income, setIncome] = useState(0);
  const [debts, setDebts]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [categories, setCategories] = useState([]);

  const fetchSummary = useCallback(async (y, m) => {
    setLoading(true);
    setError('');
    try {
      const [summaryRes, trendRes, incomeRes, debtRes] = await Promise.all([
        client.get('/api/expenses/summary', { params: { year: y, month: m } }),
        client.get('/api/expenses/trend', { params: { months: 6 } }),
        client.get('/api/income', { params: { year: y, month: m } }),
        client.get('/api/debts'),
      ]);
      setSummary(summaryRes.data);
      setTrend(trendRes.data.trend || []);
      setIncome(parseFloat(incomeRes.data.income) || 0);
      setDebts(debtRes.data.debts || []);
    } catch {
      setError('Failed to load summary.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSummary(year, month); }, [year, month, fetchSummary]);
  useEffect(() => {
    client.get('/api/categories').then(({ data }) => setCategories(data.categories || []));
  }, []);

  const totalSpent  = summary?.total_spent  || 0;
  const totalBudget = summary?.total_budget || 0;
  const remaining   = totalBudget - totalSpent;
  const overallPct  = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : null;
  const byCategory  = summary?.by_category || [];

  // Scale bars relative to the largest single value
  const maxVal = Math.max(...byCategory.map(c => Math.max(c.total_spent || 0, c.budget || 0)), 1);

  // Financial health metrics
  const totalDebtPayments = debts.reduce((s, d) => s + parseFloat(d.monthly_payment || 0) + parseFloat(d.extra_payment || 0), 0);
  const dti          = income > 0 ? (totalDebtPayments / income) * 100 : null;
  const savingsRate  = income > 0 ? ((income - totalSpent) / income) * 100 : null;

  const dtiStatus = dti === null ? null
    : dti < 20  ? { label: 'Excellent', color: '#4ade80' }
    : dti < 36  ? { label: 'Healthy',   color: 'var(--accent)' }
    : dti < 50  ? { label: 'Fair',      color: '#f97316' }
    :             { label: 'High',       color: '#ef4444' };

  const srStatus = savingsRate === null ? null
    : savingsRate >= 20 ? { label: 'Great',    color: '#4ade80' }
    : savingsRate >= 10 ? { label: 'Good',     color: 'var(--accent)' }
    : savingsRate >= 0  ? { label: 'Low',      color: '#f97316' }
    :                     { label: 'Negative', color: '#ef4444' };

  // Split into over-budget and under-budget for ordering
  const overBudget  = byCategory.filter(c => c.budget > 0 && c.total_spent > c.budget);
  const underBudget = byCategory.filter(c => c.budget > 0 && c.total_spent <= c.budget);
  const noBudget    = byCategory.filter(c => !c.budget || c.budget === 0);
  const sorted = [...overBudget, ...underBudget, ...noBudget];

  return (
    <>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h1 style={{ fontSize: '1.375rem', fontWeight: 700 }}>Monthly Overview</h1>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>eIB</span>
            <div style={{ position: 'absolute', bottom: 0, right: 0, width: 9, height: 2, background: 'var(--accent)' }} />
          </div>
        </div>
        <MonthPicker year={year} month={month} onChange={(y, m) => { setYear(y); setMonth(m); }} />
      </div>

      <div className="page-scrollable" style={{ padding: '0 16px' }}>
        {error && (
          <p style={{ color: 'var(--danger)', fontSize: '0.875rem', marginBottom: 16, textAlign: 'center' }}>{error}</p>
        )}

        {/* Summary cards */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <SummaryCard label="Spent" value={fmt(totalSpent)} sub={overallPct !== null ? `${overallPct}% of budget` : undefined} />
          <SummaryCard label="Budget" value={fmt(totalBudget)} sub={`${byCategory.filter(c => c.budget > 0).length} categories`} />
          <SummaryCard
            label={remaining >= 0 ? 'Remaining' : 'Over Budget'}
            value={fmt(Math.abs(remaining))}
            accent={remaining < 0 ? 'var(--danger)' : remaining === 0 ? 'var(--text-primary)' : '#22c55e'}
          />
        </div>

        {/* Financial Health */}
        {(dti !== null || savingsRate !== null) && (
          <div className="card" style={{ marginBottom: 16 }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>
              Financial Health
            </p>
            <div style={{ display: 'flex', gap: 10 }}>

              {/* Debt-to-Income */}
              <div style={{ flex: 1, background: 'var(--bg-surface)', borderRadius: 12, padding: '14px 14px 12px' }}>
                <p style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', marginBottom: 6 }}>Debt-to-Income</p>
                {dti === null ? (
                  <p style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-tertiary)' }}>—</p>
                ) : (
                  <>
                    <p style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em', color: dtiStatus.color, lineHeight: 1, marginBottom: 4 }}>
                      {dti.toFixed(1)}%
                    </p>
                    <span style={{ fontSize: '0.6875rem', fontWeight: 700, padding: '2px 8px', borderRadius: 9999, background: `${dtiStatus.color}22`, color: dtiStatus.color }}>
                      {dtiStatus.label}
                    </span>
                    <p style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', marginTop: 8 }}>
                      {fmt(totalDebtPayments)}/mo debt payments
                    </p>
                    {/* DTI bar */}
                    <div style={{ marginTop: 8, height: 4, borderRadius: 9999, background: 'rgba(255,255,255,0.08)' }}>
                      <div style={{ height: '100%', width: `${Math.min(dti, 100)}%`, borderRadius: 9999, background: dtiStatus.color, transition: 'width 0.4s ease' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
                      <span style={{ fontSize: '0.5625rem', color: 'var(--text-tertiary)' }}>0%</span>
                      <span style={{ fontSize: '0.5625rem', color: 'var(--text-tertiary)' }}>50%+</span>
                    </div>
                  </>
                )}
                {dti === null && (
                  <p style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', marginTop: 4 }}>Set monthly income in Budgets</p>
                )}
              </div>

              {/* Savings Rate */}
              <div style={{ flex: 1, background: 'var(--bg-surface)', borderRadius: 12, padding: '14px 14px 12px' }}>
                <p style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', marginBottom: 6 }}>Savings Rate</p>
                {savingsRate === null ? (
                  <>
                    <p style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-tertiary)' }}>—</p>
                    <p style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', marginTop: 4 }}>Set monthly income in Budgets</p>
                  </>
                ) : (
                  <>
                    <p style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em', color: srStatus.color, lineHeight: 1, marginBottom: 4 }}>
                      {savingsRate.toFixed(1)}%
                    </p>
                    <span style={{ fontSize: '0.6875rem', fontWeight: 700, padding: '2px 8px', borderRadius: 9999, background: `${srStatus.color}22`, color: srStatus.color }}>
                      {srStatus.label}
                    </span>
                    <p style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', marginTop: 8 }}>
                      {fmt(Math.abs(income - totalSpent))} {income - totalSpent >= 0 ? 'saved' : 'over'} this month
                    </p>
                    {/* Savings bar */}
                    <div style={{ marginTop: 8, height: 4, borderRadius: 9999, background: 'rgba(255,255,255,0.08)' }}>
                      <div style={{ height: '100%', width: `${Math.min(Math.max(savingsRate, 0), 100)}%`, borderRadius: 9999, background: srStatus.color, transition: 'width 0.4s ease' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
                      <span style={{ fontSize: '0.5625rem', color: 'var(--text-tertiary)' }}>0%</span>
                      <span style={{ fontSize: '0.5625rem', color: 'var(--text-tertiary)' }}>20%+</span>
                    </div>
                  </>
                )}
              </div>

            </div>
          </div>
        )}

        {/* 6-month trend chart */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              6-Month Trend
            </p>
            {/* Legend */}
            <div style={{ display: 'flex', gap: 10 }}>
              {[['#4ade80','Income'],['var(--accent)','Budget'],['#f97316','Spend']].map(([c, l]) => (
                <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: c }} />
                  <span style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>{l}</span>
                </div>
              ))}
            </div>
          </div>
          {loading ? (
            <div className="skeleton" style={{ height: 200, borderRadius: 8 }} />
          ) : (
            <>
              <TrendChart trend={trend} />
              {/* Savings summary row */}
              <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                {(() => {
                  const totalIncome  = trend.reduce((s, d) => s + d.income, 0);
                  const totalSpent   = trend.reduce((s, d) => s + d.spent, 0);
                  const totalSavings = totalIncome - totalSpent;
                  const avgSavings   = trend.filter(d => d.income > 0).length > 0
                    ? totalSavings / trend.filter(d => d.income > 0).length
                    : 0;
                  return (
                    <>
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', marginBottom: 3 }}>Total Saved</p>
                        <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: totalSavings >= 0 ? '#4ade80' : '#ef4444' }}>
                          {fmt(totalSavings)}
                        </p>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', marginBottom: 3 }}>Avg / Month</p>
                        <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: avgSavings >= 0 ? '#4ade80' : '#ef4444' }}>
                          {fmt(avgSavings)}
                        </p>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', marginBottom: 3 }}>Save Rate</p>
                        <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {totalIncome > 0 ? `${Math.round((totalSavings / totalIncome) * 100)}%` : '—'}
                        </p>
                      </div>
                    </>
                  );
                })()}
              </div>
            </>
          )}
        </div>

        {/* Category bar chart */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Budget vs Spent
            </p>
            {overBudget.length > 0 && (
              <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#ef4444' }}>
                {overBudget.length} over budget
              </span>
            )}
          </div>

          {loading ? (
            [1, 2, 3, 4, 5].map(i => <SkeletonBar key={i} />)
          ) : sorted.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-tertiary)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>💸</div>
              <p style={{ fontWeight: 500, marginBottom: 4 }}>No expenses yet</p>
              <p style={{ fontSize: '0.875rem' }}>Tap + to add your first expense</p>
            </div>
          ) : (
            sorted.map(cat => (
              <CategoryBar key={cat.category_id} cat={cat} maxVal={maxVal} />
            ))
          )}
        </div>
      </div>

      {/* FAB */}
      <button className="fab" onClick={() => setModalOpen(true)} aria-label="Add expense">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </button>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add Expense">
        <ExpenseForm
          categories={categories}
          onSave={() => { setModalOpen(false); fetchSummary(year, month); }}
          onClose={() => setModalOpen(false)}
        />
      </Modal>
    </>
  );
}
