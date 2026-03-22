import React, { useState, useEffect, useCallback } from 'react';
import client from '../api/client.js';

function formatDateLocal(date) {
  const d = date instanceof Date ? date : new Date(date);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export default function ExpenseForm({ expense, onSave, onDelete, onClose, categories: propCategories }) {
  const isEdit = !!expense;

  const [amount, setAmount] = useState(expense ? String(expense.amount) : '');
  const [categoryId, setCategoryId] = useState(expense?.category_id || null);
  const [date, setDate] = useState(expense?.expense_date || formatDateLocal(new Date()));
  const [note, setNote] = useState(expense?.note || '');
  const [categories, setCategories] = useState(propCategories || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!propCategories || propCategories.length === 0) {
      client.get('/api/categories').then(({ data }) => {
        setCategories(data.categories || []);
        if (!categoryId && data.categories?.length > 0) {
          setCategoryId(data.categories[0].id);
        }
      });
    } else {
      if (!categoryId && propCategories.length > 0) {
        setCategoryId(propCategories[0].id);
      }
    }
  }, []);

  const handleAmountChange = (e) => {
    const val = e.target.value.replace(/[^0-9.]/g, '');
    const parts = val.split('.');
    if (parts.length > 2) return;
    if (parts[1] && parts[1].length > 2) return;
    setAmount(val);
  };

  const handleSubmit = useCallback(async () => {
    setError('');
    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid amount.');
      return;
    }
    if (!categoryId) {
      setError('Please select a category.');
      return;
    }
    if (!date) {
      setError('Please select a date.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        amount: numAmount,
        category_id: categoryId,
        expense_date: date,
        note: note.trim() || null,
      };

      let saved;
      if (isEdit) {
        const { data } = await client.put(`/api/expenses/${expense.id}`, payload);
        saved = data.expense || data;
      } else {
        const { data } = await client.post('/api/expenses', payload);
        saved = data.expense || data;
      }
      onSave(saved);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [amount, categoryId, date, note, isEdit, expense, onSave]);

  const handleDelete = useCallback(async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    try {
      await client.delete(`/api/expenses/${expense.id}`);
      onDelete(expense.id);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not delete expense.');
      setDeleting(false);
      setConfirmDelete(false);
    }
  }, [confirmDelete, expense, onDelete]);

  return (
    <div style={{ paddingBottom: 8 }}>
      {/* Amount Input */}
      <div
        style={{
          textAlign: 'center',
          padding: '24px 0 20px',
          borderBottom: '2px solid var(--accent)',
          marginBottom: 24,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'center',
            gap: 4,
          }}
        >
          <span style={{ fontSize: '2rem', fontWeight: 300, color: 'var(--text-secondary)' }}>$</span>
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={handleAmountChange}
            placeholder="0.00"
            autoFocus
            style={{
              fontSize: '3rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
              textAlign: 'center',
              width: '100%',
              maxWidth: 240,
              letterSpacing: '-0.02em',
              caretColor: 'var(--accent)',
            }}
          />
        </div>
      </div>

      {/* Category Dropdown */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 10 }}>
          Category
        </label>
        <div style={{ position: 'relative' }}>
          {/* Selected category icon preview */}
          {categoryId && (() => {
            const selected = categories.find(c => c.id === categoryId);
            return selected ? (
              <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: '1.1rem', pointerEvents: 'none', zIndex: 1 }}>
                {selected.icon || '📦'}
              </span>
            ) : null;
          })()}
          <select
            value={categoryId || ''}
            onChange={e => setCategoryId(e.target.value)}
            style={{
              width: '100%',
              padding: categoryId ? '12px 40px 12px 42px' : '12px 40px 12px 16px',
              background: 'var(--bg-surface)',
              borderRadius: 12,
              color: categoryId ? 'var(--text-primary)' : 'var(--text-tertiary)',
              fontSize: '1rem',
              fontWeight: 500,
              border: '1px solid var(--border)',
              appearance: 'none',
              colorScheme: 'dark',
              cursor: 'pointer',
            }}
          >
            <option value="" disabled>Select a category…</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>
                {cat.icon || '📦'} {cat.name}
              </option>
            ))}
          </select>
          {/* Chevron */}
          <svg
            style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
            width="16" height="16" viewBox="0 0 16 16" fill="none"
          >
            <path d="M4 6l4 4 4-4" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      {/* Date */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 10 }}>
          Date
        </label>
        <input
          type="date"
          value={date}
          max={formatDateLocal(new Date())}
          onChange={(e) => setDate(e.target.value)}
          style={{
            width: '100%',
            padding: '12px 16px',
            background: 'var(--bg-surface)',
            borderRadius: 12,
            color: 'var(--text-primary)',
            fontSize: '1rem',
            border: '1px solid var(--border)',
            colorScheme: 'dark',
          }}
        />
      </div>

      {/* Note */}
      <div style={{ marginBottom: 28 }}>
        <label style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 10 }}>
          Note <span style={{ fontWeight: 400, textTransform: 'none', opacity: 0.5 }}>(optional)</span>
        </label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add a note…"
          maxLength={140}
          style={{
            width: '100%',
            padding: '12px 16px',
            background: 'var(--bg-surface)',
            borderRadius: 12,
            color: 'var(--text-primary)',
            fontSize: '1rem',
            border: '1px solid var(--border)',
          }}
        />
      </div>

      {/* Error */}
      {error && (
        <p style={{ color: 'var(--danger)', fontSize: '0.875rem', marginBottom: 16, textAlign: 'center' }}>
          {error}
        </p>
      )}

      {/* Submit */}
      <button
        className="btn-primary"
        onClick={handleSubmit}
        disabled={loading}
        style={{ marginBottom: isEdit ? 12 : 0 }}
      >
        {loading ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Expense'}
      </button>

      {/* Delete (edit mode) */}
      {isEdit && (
        <button
          onClick={handleDelete}
          disabled={deleting}
          style={{
            width: '100%',
            height: 52,
            borderRadius: 9999,
            background: confirmDelete ? 'var(--danger)' : 'rgba(239,68,68,0.12)',
            color: 'var(--danger)',
            fontWeight: 600,
            fontSize: '1rem',
            transition: 'background 0.15s, color 0.15s',
          }}
        >
          {deleting ? 'Deleting…' : confirmDelete ? 'Tap again to confirm' : 'Delete Expense'}
        </button>
      )}
    </div>
  );
}
