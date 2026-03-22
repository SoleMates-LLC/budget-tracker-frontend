import React, { useState, useEffect, useCallback } from 'react';
import client from '../api/client.js';

const FREQ_LABELS = { weekly: 'Weekly', monthly: 'Monthly', yearly: 'Yearly' };
const FREQ_OPTIONS = ['weekly', 'monthly', 'yearly'];

function fmt(num) {
  return (num || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function daysUntil(dateStr) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due   = new Date(dateStr + 'T00:00:00');
  return Math.round((due - today) / 86400000);
}

function DueBadge({ dateStr }) {
  const days = daysUntil(dateStr);
  let bg, color, label;
  if (days < 0)      { bg = 'rgba(239,68,68,0.15)';  color = '#ef4444'; label = `${Math.abs(days)}d overdue`; }
  else if (days === 0) { bg = 'rgba(239,68,68,0.15)'; color = '#ef4444'; label = 'Due today'; }
  else if (days <= 3)  { bg = 'rgba(251,146,60,0.15)'; color = '#f97316'; label = `${days}d`; }
  else if (days <= 7)  { bg = 'rgba(250,204,21,0.12)'; color = '#facc15'; label = `${days}d`; }
  else                 { bg = 'rgba(255,255,255,0.06)'; color = 'var(--text-tertiary)'; label = `${days}d`; }
  return (
    <span style={{ fontSize: '0.6875rem', fontWeight: 700, padding: '2px 8px', borderRadius: 9999, background: bg, color }}>
      {label}
    </span>
  );
}

// Safely convert any date value (string, Date object, ISO timestamp) to YYYY-MM-DD
function toDateInput(val) {
  if (!val) return '';
  // Already a plain YYYY-MM-DD string
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  // ISO timestamp string or Date object — parse safely in local time
  const raw = typeof val === 'string' ? val : val.toISOString();
  // Strip time component and parse as local midnight to avoid UTC shift
  const datePart = raw.slice(0, 10);
  const d = new Date(datePart + 'T00:00:00');
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function RecurringForm({ initial, categories, onSave, onClose }) {
  const isEdit = !!initial;
  const [name, setName]             = useState(initial?.name || '');
  const [amount, setAmount]         = useState(initial ? String(initial.amount) : '');
  const [categoryId, setCategoryId] = useState(initial?.category_id || (categories[0]?.id || ''));
  const [frequency, setFrequency]   = useState(initial?.frequency || 'monthly');
  const [nextDue, setNextDue]       = useState(toDateInput(initial?.next_due_date) || toDateInput(new Date()));
  const [note, setNote]             = useState(initial?.note || '');
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');

  const handleAmount = (e) => {
    const val = e.target.value.replace(/[^0-9.]/g, '');
    const parts = val.split('.');
    if (parts.length > 2) return;
    if (parts[1]?.length > 2) return;
    setAmount(val);
  };

  const handleSubmit = async () => {
    if (!name.trim()) { setError('Name is required.'); return; }
    const numAmt = parseFloat(amount);
    if (!amount || isNaN(numAmt) || numAmt <= 0) { setError('Enter a valid amount.'); return; }
    setError(''); setLoading(true);
    try {
      const payload = { name: name.trim(), amount: numAmt, category_id: categoryId || null, frequency, next_due_date: nextDue, note: note.trim() || null };
      if (isEdit) {
        await client.put(`/api/recurring/${initial.id}`, payload);
      } else {
        await client.post('/api/recurring', payload);
      }
      onSave();
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong.');
    } finally { setLoading(false); }
  };

  const inputStyle = { width: '100%', padding: '12px 14px', background: 'var(--bg-surface)', borderRadius: 12, border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: '1rem', boxSizing: 'border-box' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 8 }}>
      {/* Name */}
      <div>
        <label style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Name</label>
        <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Netflix, Rent" style={inputStyle} />
      </div>

      {/* Amount */}
      <div>
        <label style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Amount</label>
        <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-surface)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
          <span style={{ padding: '0 12px', color: 'var(--text-tertiary)', fontSize: '1rem' }}>$</span>
          <input type="text" inputMode="decimal" value={amount} onChange={handleAmount} placeholder="0.00"
            style={{ flex: 1, padding: '12px 12px 12px 0', fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }} />
        </div>
      </div>

      {/* Category */}
      <div>
        <label style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Category</label>
        <div style={{ position: 'relative' }}>
          {categoryId && (() => {
            const sel = categories.find(c => c.id === categoryId);
            return sel ? <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: '1.1rem', pointerEvents: 'none', zIndex: 1 }}>{sel.icon || '📦'}</span> : null;
          })()}
          <select value={categoryId} onChange={e => setCategoryId(e.target.value)}
            style={{ ...inputStyle, padding: '12px 40px 12px 42px', appearance: 'none', colorScheme: 'dark', cursor: 'pointer' }}>
            <option value="">No category</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
          <svg style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M4 6l4 4 4-4" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      {/* Frequency */}
      <div>
        <label style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Frequency</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {FREQ_OPTIONS.map(f => (
            <button key={f} onClick={() => setFrequency(f)}
              style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: '1px solid', borderColor: frequency === f ? 'var(--accent)' : 'var(--border)', background: frequency === f ? 'rgba(38,99,235,0.15)' : 'var(--bg-surface)', color: frequency === f ? 'var(--accent)' : 'var(--text-secondary)', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}>
              {FREQ_LABELS[f]}
            </button>
          ))}
        </div>
      </div>

      {/* Next due date */}
      <div>
        <label style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Next Due Date</label>
        <input type="date" value={nextDue} onChange={e => setNextDue(e.target.value)} style={{ ...inputStyle, colorScheme: 'dark' }} />
      </div>

      {/* Note */}
      <div>
        <label style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
          Note <span style={{ fontWeight: 400, textTransform: 'none', opacity: 0.5 }}>(optional)</span>
        </label>
        <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="Add a note…" maxLength={140} style={inputStyle} />
      </div>

      {error && <p style={{ color: 'var(--danger)', fontSize: '0.875rem', textAlign: 'center' }}>{error}</p>}

      <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
        {loading ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Recurring Payment'}
      </button>
    </div>
  );
}

export default function RecurringPage() {
  const [recurring, setRecurring] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [toast, setToast] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [recRes, catRes] = await Promise.all([
        client.get('/api/recurring'),
        client.get('/api/categories'),
      ]);
      setRecurring(recRes.data.recurring || []);
      setCategories(catRes.data.categories || []);
    } catch { } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);  // fetchAll runs after mount; next_due_dates are already up-to-date from startup auto-process

  const handleDelete = async (id) => {
    if (deleting !== id) { setDeleting(id); return; }
    try {
      await client.delete(`/api/recurring/${id}`);
      setRecurring(prev => prev.filter(r => r.id !== id));
      setDeleting(null);
    } catch { setDeleting(null); }
  };

  const handleToggle = async (r) => {
    try {
      await client.put(`/api/recurring/${r.id}`, { is_active: !r.is_active });
      setRecurring(prev => prev.map(x => x.id === r.id ? { ...x, is_active: !r.is_active } : x));
    } catch { }
  };

  const active   = recurring.filter(r => r.is_active);
  const inactive = recurring.filter(r => !r.is_active);

  const totalMonthly = active.reduce((sum, r) => {
    if (r.frequency === 'weekly')  return sum + parseFloat(r.amount) * 52 / 12;
    if (r.frequency === 'monthly') return sum + parseFloat(r.amount);
    if (r.frequency === 'yearly')  return sum + parseFloat(r.amount) / 12;
    return sum;
  }, 0);

  return (
    <>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <h1 style={{ fontSize: '1.375rem', fontWeight: 700 }}>Auto Payment</h1>
          <button onClick={() => { setEditing(null); setShowForm(true); }}
            style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--accent)', border: 'none', color: '#fff', fontSize: '1.25rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            +
          </button>
        </div>
        {active.length > 0 && (
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>
            {fmt(totalMonthly)}/mo across {active.length} active payment{active.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      <div className="page-scrollable" style={{ padding: '0 16px' }}>
        {loading ? (
          [1,2,3].map(i => (
            <div key={i} className="card" style={{ marginBottom: 12 }}>
              <div className="skeleton" style={{ height: 20, width: '50%', marginBottom: 8 }} />
              <div className="skeleton" style={{ height: 14, width: '30%' }} />
            </div>
          ))
        ) : active.length === 0 && inactive.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '40px 24px' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🔄</div>
            <p style={{ fontWeight: 600, marginBottom: 6 }}>No recurring payments</p>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', marginBottom: 20 }}>
              Add subscriptions, rent, or any automatic recurring expense
            </p>
            <button className="btn-primary" style={{ width: 'auto', padding: '12px 24px', margin: '0 auto' }}
              onClick={() => { setEditing(null); setShowForm(true); }}>
              Add First Payment
            </button>
          </div>
        ) : (
          <>
            {/* Active */}
            {active.map(r => (
              <div key={r.id} className="card" style={{ marginBottom: 12, opacity: 1 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  {/* Icon */}
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: `${r.category_color || '#526080'}22`, border: `1.5px solid ${r.category_color || '#526080'}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.125rem', flexShrink: 0 }}>
                    {r.category_icon || '🔄'}
                  </div>
                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{r.name}</span>
                      <DueBadge dateStr={r.next_due_date} />
                    </div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--accent)' }}>{fmt(r.amount)}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{FREQ_LABELS[r.frequency]}</span>
                      {r.category_name && <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>· {r.category_name}</span>}
                    </div>
                    {r.note && <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 3 }}>{r.note}</p>}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                  <button onClick={() => { setEditing(r); setShowForm(true); }}
                    style={{ flex: 1, padding: '9px 0', borderRadius: 9, background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}>
                    Edit
                  </button>
                  <button onClick={() => handleToggle(r)}
                    style={{ padding: '9px 12px', borderRadius: 9, background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-tertiary)', fontSize: '0.75rem', cursor: 'pointer' }}>
                    Pause
                  </button>
                </div>
              </div>
            ))}

            {/* Inactive */}
            {inactive.length > 0 && (
              <>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '20px 0 10px' }}>
                  Paused ({inactive.length})
                </p>
                {inactive.map(r => (
                  <div key={r.id} className="card" style={{ marginBottom: 10, opacity: 0.55 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 9, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>
                        {r.category_icon || '🔄'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>{r.name}</span>
                        <span style={{ marginLeft: 8, fontSize: '0.875rem', color: 'var(--accent)', fontWeight: 600 }}>{fmt(r.amount)}</span>
                        <span style={{ marginLeft: 6, fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{FREQ_LABELS[r.frequency]}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => handleToggle(r)}
                          style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: '#22c55e', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>
                          Resume
                        </button>
                        <button onClick={() => handleDelete(r.id)}
                          style={{ padding: '6px 10px', borderRadius: 8, background: deleting === r.id ? 'rgba(239,68,68,0.15)' : 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--danger)', fontSize: '0.75rem', cursor: 'pointer' }}>
                          {deleting === r.id ? 'Sure?' : '✕'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </>
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
          <div style={{ width: '100%', maxWidth: 430, background: 'var(--bg-secondary)', borderRadius: '20px 20px 0 0', padding: '24px 20px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700 }}>{editing ? 'Edit Payment' : 'New Recurring Payment'}</h2>
              <button onClick={() => { setShowForm(false); setEditing(null); }}
                style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--bg-surface)', border: 'none', color: 'var(--text-secondary)', fontSize: '1.125rem', cursor: 'pointer' }}>
                ✕
              </button>
            </div>
            <RecurringForm
              initial={editing}
              categories={categories}
              onSave={() => { setShowForm(false); setEditing(null); fetchAll(); }}
              onClose={() => { setShowForm(false); setEditing(null); }}
            />
          </div>
        </div>
      )}
    </>
  );
}
