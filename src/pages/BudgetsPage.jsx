import React, { useState, useEffect, useCallback } from 'react';
import MonthPicker from '../components/MonthPicker.jsx';
import CategoryEditor from '../components/CategoryEditor.jsx';
import client from '../api/client.js';

function fmt(num) {
  return (num || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function Toast({ message, type, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2200);
    return () => clearTimeout(t);
  }, [onDone]);
  return <div className={`toast ${type}`}>{message}</div>;
}

function SkeletonRow() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
      <div className="skeleton" style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div className="skeleton" style={{ height: 14, width: '45%' }} />
      </div>
      <div className="skeleton" style={{ width: 80, height: 36, borderRadius: 8 }} />
    </div>
  );
}

function DonutChart({ categories, budgets }) {
  const R = 70;
  const CX = 100;
  const CY = 100;
  const CIRC = 2 * Math.PI * R;
  const SW = 30; // stroke width

  const slices = categories
    .map(cat => ({ ...cat, amount: parseFloat(budgets[cat.id]) || 0 }))
    .filter(s => s.amount > 0);

  const total = slices.reduce((sum, s) => sum + s.amount, 0);

  if (total === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '20px 0' }}>
        <svg viewBox="0 0 200 200" width="180" height="180">
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={SW} />
          <text x={CX} y={CY - 8} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="11" fontWeight="600">TOTAL</text>
          <text x={CX} y={CY + 12} textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize="14">$0.00</text>
        </svg>
        <p style={{ color: 'var(--text-tertiary)', fontSize: '0.8125rem' }}>Set amounts below to see your budget breakdown</p>
      </div>
    );
  }

  let cumPct = 0;
  const segments = slices.map(s => {
    const pct = s.amount / total;
    const rotation = cumPct * 360 - 90;
    cumPct += pct;
    return { ...s, pct, rotation };
  });

  // Top 5 for legend
  const legendItems = [...slices].sort((a, b) => b.amount - a.amount).slice(0, 5);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
      {/* Chart */}
      <div style={{ position: 'relative', width: 200, height: 200 }}>
        <svg viewBox="0 0 200 200" width="200" height="200" style={{ transform: 'rotateY(0)' }}>
          {/* Track */}
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={SW} />
          {/* Segments */}
          {segments.map(seg => (
            <circle
              key={seg.id}
              cx={CX} cy={CY} r={R}
              fill="none"
              stroke={seg.color || '#526080'}
              strokeWidth={SW}
              strokeDasharray={`${seg.pct * CIRC} ${CIRC}`}
              transform={`rotate(${seg.rotation} ${CX} ${CY})`}
              strokeLinecap="butt"
              style={{ transition: 'stroke-dasharray 0.35s ease' }}
            />
          ))}
          {/* Center label */}
          <text x={CX} y={CY - 10} textAnchor="middle" fill="rgba(255,255,255,0.45)" fontSize="10" fontWeight="700" letterSpacing="1">BUDGET</text>
          <text x={CX} y={CY + 8} textAnchor="middle" fill="white" fontSize="15" fontWeight="700">{fmt(total)}</text>
          <text x={CX} y={CY + 24} textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize="10">{slices.length} categories</text>
        </svg>
      </div>

      {/* Legend */}
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {legendItems.map(item => (
          <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: item.color || '#526080', flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: '0.8125rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {item.icon} {item.name}
            </span>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              {Math.round((item.amount / total) * 100)}%
            </span>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, minWidth: 72, textAlign: 'right' }}>
              {fmt(item.amount)}
            </span>
          </div>
        ))}
        {slices.length > 5 && (
          <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textAlign: 'center', marginTop: 2 }}>
            +{slices.length - 5} more categories
          </p>
        )}
      </div>
    </div>
  );
}

export default function BudgetsPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [categories, setCategories] = useState([]);
  const [budgets, setBudgets] = useState({});
  const [savedBudgets, setSavedBudgets] = useState({});
  const [income, setIncome] = useState('');
  const [savedIncome, setSavedIncome] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorInitial, setEditorInitial] = useState(null); // null = add, object = edit
  const [hideZero, setHideZero] = useState(false);

  const fetchAll = useCallback(async (y, m) => {
    setLoading(true);
    setError('');
    try {
      const [catRes, budgetRes, incomeRes] = await Promise.all([
        client.get('/api/categories'),
        client.get('/api/budgets', { params: { year: y, month: m } }),
        client.get('/api/income', { params: { year: y, month: m } }),
      ]);
      const cats = catRes.data.categories || [];
      const bList = budgetRes.data.budgets || [];
      setCategories(cats);
      const map = {};
      cats.forEach(c => { map[c.id] = ''; });
      bList.forEach(b => { map[b.category_id] = String(b.amount); });
      setBudgets(map);
      setSavedBudgets({ ...map });
      const inc = incomeRes.data.income > 0 ? String(incomeRes.data.income) : '';
      setIncome(inc);
      setSavedIncome(inc);
    } catch {
      setError('Failed to load budget data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(year, month); }, [year, month, fetchAll]);

  const handleAmountChange = (catId, val) => {
    const cleaned = val.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) return;
    if (parts[1] && parts[1].length > 2) return;
    setBudgets(prev => ({ ...prev, [catId]: cleaned }));
  };

  const handleIncomeChange = (val) => {
    const cleaned = val.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) return;
    if (parts[1] && parts[1].length > 2) return;
    setIncome(cleaned);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const budgetList = Object.entries(budgets)
        .filter(([, val]) => val !== '' && !isNaN(parseFloat(val)))
        .map(([category_id, val]) => ({ category_id, amount: parseFloat(val) }));

      const saves = [client.put('/api/budgets', { year, month, budgets: budgetList })];
      if (income !== savedIncome) {
        saves.push(client.put('/api/income', { year, month, amount: parseFloat(income) || 0 }));
      }
      await Promise.all(saves);

      setSavedBudgets({ ...budgets });
      setSavedIncome(income);
      setToast({ message: 'Saved!', type: 'success' });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const openAddCategory = () => { setEditorInitial(null); setEditorOpen(true); };
  const openEditCategory = (cat) => { setEditorInitial(cat); setEditorOpen(true); };
  const closeEditor = () => setEditorOpen(false);

  const handleCategorySave = async ({ name, icon, color }) => {
    try {
      if (editorInitial) {
        await client.put(`/api/categories/${editorInitial.id}`, { name, icon, color });
        setToast({ message: 'Category updated!', type: 'success' });
      } else {
        await client.post('/api/categories', { name, icon, color });
        setToast({ message: 'Category added!', type: 'success' });
      }
      closeEditor();
      fetchAll(year, month);
    } catch (err) {
      setToast({ message: err.response?.data?.message || 'Failed to save category.', type: 'error' });
    }
  };

  const handleCategoryDelete = async () => {
    if (!editorInitial) return;
    try {
      await client.delete(`/api/categories/${editorInitial.id}`);
      setToast({ message: 'Category deleted.', type: 'success' });
      closeEditor();
      fetchAll(year, month);
    } catch (err) {
      setToast({ message: err.response?.data?.message || 'Failed to delete category.', type: 'error' });
    }
  };

  const incomeVal = parseFloat(income) || 0;
  const hasChanges =
    Object.keys(budgets).some(id => (budgets[id] || '') !== (savedBudgets[id] || '')) ||
    (income || '') !== (savedIncome || '');

  const totalBudget = Object.values(budgets).reduce((sum, val) => {
    const n = parseFloat(val);
    return isNaN(n) ? sum : sum + n;
  }, 0);

  const sorted = [...categories].sort((a, b) => {
    if (a.is_system && !b.is_system) return -1;
    if (!a.is_system && b.is_system) return 1;
    return (a.sort_order || 99) - (b.sort_order || 99);
  });

  const visibleSorted = hideZero
    ? sorted.filter(cat => parseFloat(budgets[cat.id]) > 0)
    : sorted;
  const hiddenCount = sorted.length - visibleSorted.length;

  return (
    <>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h1 style={{ fontSize: '1.375rem', fontWeight: 700 }}>Budgets</h1>
        </div>
        <MonthPicker year={year} month={month} onChange={(y, m) => { setYear(y); setMonth(m); }} />
      </div>

      <div className="page-scrollable" style={{ padding: '0 16px' }}>

        {/* Monthly Income card */}
        <div className="card" style={{ marginBottom: 16 }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
            Monthly Income
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              background: 'var(--bg-surface)',
              borderRadius: 10,
              border: incomeVal > 0 ? '1.5px solid #4ade8066' : '1px solid var(--border)',
              overflow: 'hidden',
            }}>
              <span style={{ padding: '0 12px', fontSize: '1rem', color: 'var(--text-tertiary)' }}>$</span>
              <input
                type="text"
                inputMode="decimal"
                value={income}
                onChange={e => handleIncomeChange(e.target.value)}
                placeholder="0.00"
                style={{
                  flex: 1,
                  padding: '12px 12px 12px 0',
                  fontSize: '1.125rem',
                  fontWeight: 700,
                  color: incomeVal > 0 ? '#4ade80' : 'var(--text-tertiary)',
                }}
              />
            </div>
            {incomeVal > 0 && totalBudget > 0 && (
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <p style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', marginBottom: 2 }}>Remaining</p>
                <p style={{
                  fontSize: '1rem',
                  fontWeight: 700,
                  color: incomeVal - totalBudget >= 0 ? '#4ade80' : 'var(--danger)',
                }}>
                  {fmt(incomeVal - totalBudget)}
                </p>
              </div>
            )}
          </div>
          {incomeVal > 0 && totalBudget > 0 && (
            <div style={{ marginTop: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                  {Math.min(Math.round((totalBudget / incomeVal) * 100), 100)}% budgeted
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                  {fmt(totalBudget)} / {fmt(incomeVal)}
                </span>
              </div>
              <div style={{ height: 6, borderRadius: 9999, background: 'rgba(255,255,255,0.08)' }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min((totalBudget / incomeVal) * 100, 100)}%`,
                  borderRadius: 9999,
                  background: totalBudget > incomeVal ? 'var(--danger)' : '#4ade80',
                  transition: 'width 0.3s ease',
                }} />
              </div>
            </div>
          )}
        </div>

        {/* Donut chart card */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Budget Breakdown
            </p>
            <p style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--accent)' }}>
              {loading ? '—' : fmt(totalBudget)}
            </p>
          </div>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
              <div className="skeleton" style={{ width: 200, height: 200, borderRadius: '50%' }} />
            </div>
          ) : (
            <DonutChart categories={sorted} budgets={budgets} />
          )}
        </div>

        {error && (
          <p style={{ color: 'var(--danger)', fontSize: '0.875rem', marginBottom: 16, textAlign: 'center' }}>
            {error}
          </p>
        )}

        {/* Category inputs */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 24 }}>
          <div style={{ padding: '12px 16px 8px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Monthly Allocations
            </p>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {/* Hide/show zero toggle */}
              <button
                onClick={() => setHideZero(h => !h)}
                title={hideZero ? 'Show all categories' : 'Hide unset categories'}
                style={{
                  height: 28, padding: '0 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: hideZero ? 'rgba(99,102,241,0.18)' : 'var(--bg-surface)',
                  color: hideZero ? 'var(--accent)' : 'var(--text-tertiary)',
                  fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.04em',
                  display: 'flex', alignItems: 'center', gap: 5,
                }}
              >
                {/* Eye icon */}
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  {hideZero ? (
                    <>
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </>
                  ) : (
                    <>
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </>
                  )}
                </svg>
                {hideZero ? 'Show All' : 'Hide Empty'}
              </button>
              {/* Add category */}
              <button
                onClick={openAddCategory}
                style={{
                  width: 28, height: 28, borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: 'var(--accent)', color: '#fff', fontSize: '1.1rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700,
                }}
              >
                +
              </button>
            </div>
          </div>
          {loading ? (
            [1, 2, 3, 4, 5, 6].map(i => <SkeletonRow key={i} />)
          ) : sorted.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-tertiary)' }}>No categories found.</div>
          ) : visibleSorted.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>
              All categories are unset.{' '}
              <button onClick={() => setHideZero(false)} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontWeight: 600, fontSize: 'inherit' }}>
                Show all
              </button>
            </div>
          ) : (
            <>
            {visibleSorted.map((cat, i) => (
              <div
                key={cat.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '11px 16px',
                  borderBottom: (i < visibleSorted.length - 1 || hiddenCount > 0) ? '1px solid var(--border)' : 'none',
                }}
              >
                {/* Color dot + icon */}
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: `${cat.color || '#526080'}22`,
                    border: `1.5px solid ${cat.color || '#526080'}55`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.125rem',
                    flexShrink: 0,
                  }}
                >
                  {cat.icon || '📦'}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 500, fontSize: '0.9375rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {cat.name}
                  </p>
                  {totalBudget > 0 && parseFloat(budgets[cat.id]) > 0 && (
                    <p style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', marginTop: 1 }}>
                      {Math.round((parseFloat(budgets[cat.id]) / totalBudget) * 100)}% of total
                    </p>
                  )}
                </div>

                {!cat.is_system && (
                  <button
                    onClick={() => openEditCategory(cat)}
                    style={{
                      width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer',
                      background: 'var(--bg-surface)', color: 'var(--text-tertiary)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" strokeWidth="2" stroke="currentColor">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                )}

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    background: 'var(--bg-surface)',
                    borderRadius: 8,
                    border: parseFloat(budgets[cat.id]) > 0
                      ? `1.5px solid ${cat.color || '#526080'}66`
                      : '1px solid var(--border)',
                    overflow: 'hidden',
                    flexShrink: 0,
                    transition: 'border-color 0.2s',
                  }}
                >
                  <span style={{ padding: '0 8px', fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={budgets[cat.id] || ''}
                    onChange={e => handleAmountChange(cat.id, e.target.value)}
                    placeholder="0"
                    style={{
                      width: 80,
                      padding: '9px 8px 9px 0',
                      fontSize: '0.9375rem',
                      fontWeight: 600,
                      color: parseFloat(budgets[cat.id]) > 0 ? 'var(--text-primary)' : 'var(--text-tertiary)',
                      textAlign: 'right',
                    }}
                  />
                </div>
              </div>
            ))}
            {hiddenCount > 0 && (
              <button
                onClick={() => setHideZero(false)}
                style={{
                  width: '100%', padding: '12px 16px', background: 'none', border: 'none',
                  cursor: 'pointer', color: 'var(--text-tertiary)', fontSize: '0.8125rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
                {hiddenCount} unset {hiddenCount === 1 ? 'category' : 'categories'} hidden · tap to show
              </button>
            )}
            </>
          )}
        </div>

        {/* Always pad for bottom nav; extra space when save bar is visible */}
        <div style={{ height: hasChanges ? 140 : 24 }} />
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />}

      {/* Category Editor Modal */}
      {editorOpen && (
        <div
          onClick={closeEditor}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
            zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 430, background: 'var(--bg-secondary)',
              borderRadius: '20px 20px 0 0', padding: '20px 20px 40px',
              boxShadow: '0 -8px 40px rgba(0,0,0,0.5)',
              maxHeight: '90vh', overflowY: 'auto',
            }}
          >
            {/* Handle */}
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)', margin: '0 auto 20px' }} />
            <p style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 20 }}>
              {editorInitial ? 'Edit Category' : 'New Category'}
            </p>
            <CategoryEditor
              initial={editorInitial}
              onSave={handleCategorySave}
              onDelete={handleCategoryDelete}
              onClose={closeEditor}
            />
          </div>
        </div>
      )}

      {/* Sticky save bar — slides up when there are unsaved changes */}
      <div
        style={{
          position: 'fixed',
          bottom: `calc(64px + env(safe-area-inset-bottom))`,
          left: 0,
          right: 0,
          padding: '12px 16px',
          background: 'var(--bg-secondary)',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          transform: hasChanges ? 'translateY(0)' : 'translateY(120%)',
          transition: 'transform 0.25s ease',
          visibility: hasChanges ? 'visible' : 'hidden',
          zIndex: 50,
          boxShadow: '0 -8px 24px rgba(0,0,0,0.3)',
        }}
      >
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>Unsaved changes</p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{fmt(totalBudget)} total budget</p>
        </div>
        <button
          className="btn-primary"
          onClick={handleSave}
          disabled={saving}
          style={{ width: 'auto', padding: '12px 28px' }}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </>
  );
}
