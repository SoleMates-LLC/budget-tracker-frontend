import React, { useState, useEffect, useCallback } from 'react';
import MonthPicker from '../components/MonthPicker.jsx';
import Modal from '../components/Modal.jsx';
import ExpenseForm from '../components/ExpenseForm.jsx';
import client from '../api/client.js';

function fmt(num) {
  return (num || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

// Normalize any date value (ISO string, Date object, or YYYY-MM-DD) to YYYY-MM-DD
function toDateKey(val) {
  if (!val) return '';
  const s = typeof val === 'string' ? val : val.toISOString();
  return s.slice(0, 10);
}

function formatDateDisplay(dateStr) {
  const d = new Date(toDateKey(dateStr) + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDateFull(dateStr) {
  const d = new Date(toDateKey(dateStr) + 'T00:00:00');
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function SkeletonRow() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0' }}>
      <div className="skeleton" style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div className="skeleton" style={{ height: 14, width: '55%', marginBottom: 6 }} />
        <div className="skeleton" style={{ height: 11, width: '30%' }} />
      </div>
      <div className="skeleton" style={{ height: 14, width: 64 }} />
    </div>
  );
}

export default function ExpensesPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [expenses, setExpenses] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editExpense, setEditExpense] = useState(null);

  const fetchExpenses = useCallback(async (y, m) => {
    setLoading(true);
    setError('');
    try {
      const { data } = await client.get('/api/expenses', {
        params: { year: y, month: m, limit: 200, offset: 0 },
      });
      setExpenses(data.expenses || []);
      setTotal(data.total || 0);
    } catch {
      setError('Failed to load expenses.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExpenses(year, month);
  }, [year, month, fetchExpenses]);

  useEffect(() => {
    client.get('/api/categories').then(({ data }) => setCategories(data.categories || []));
  }, []);

  const handleMonthChange = (y, m) => {
    setYear(y);
    setMonth(m);
  };

  const handleSave = () => {
    setModalOpen(false);
    setEditExpense(null);
    fetchExpenses(year, month);
  };

  const handleDelete = () => {
    setModalOpen(false);
    setEditExpense(null);
    fetchExpenses(year, month);
  };

  const openEdit = (exp) => {
    setEditExpense(exp);
    setModalOpen(true);
  };

  const openAdd = () => {
    setEditExpense(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditExpense(null);
  };

  // Group by date descending
  const grouped = expenses.reduce((acc, exp) => {
    const key = toDateKey(exp.expense_date);
    if (!acc[key]) acc[key] = [];
    acc[key].push(exp);
    return acc;
  }, {});

  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  // Find category for expense
  const getCat = (catId) => categories.find((c) => c.id === catId) || {};

  return (
    <>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h1 style={{ fontSize: '1.375rem', fontWeight: 700 }}>Expenses</h1>
          {!loading && (
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
              {fmt(expenses.reduce((s, e) => s + Number(e.amount), 0))}
            </span>
          )}
        </div>
        <MonthPicker year={year} month={month} onChange={handleMonthChange} />
      </div>

      <div className="page-scrollable" style={{ padding: '0 16px' }}>
        {error && (
          <p style={{ color: 'var(--danger)', fontSize: '0.875rem', marginBottom: 16, textAlign: 'center' }}>
            {error}
          </p>
        )}

        {loading ? (
          <div className="card">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} style={{ borderBottom: i < 5 ? '1px solid var(--border)' : 'none' }}>
                <SkeletonRow />
              </div>
            ))}
          </div>
        ) : sortedDates.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--text-tertiary)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📋</div>
            <p style={{ fontWeight: 500, marginBottom: 4 }}>No expenses this month</p>
            <p style={{ fontSize: '0.875rem' }}>Tap + to log an expense</p>
          </div>
        ) : (
          sortedDates.map((dateKey) => {
            const dayExpenses = grouped[dateKey];
            const dayTotal = dayExpenses.reduce((s, e) => s + Number(e.amount), 0);
            return (
              <div key={dateKey} style={{ marginBottom: 16 }}>
                {/* Date Header */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 8,
                    padding: '0 4px',
                  }}
                >
                  <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    {formatDateFull(dateKey)}
                  </span>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>
                    {fmt(dayTotal)}
                  </span>
                </div>

                {/* Expense list */}
                <div className="card" style={{ padding: '4px 0' }}>
                  {dayExpenses.map((exp, i) => {
                    const cat = getCat(exp.category_id);
                    return (
                      <button
                        key={exp.id}
                        onClick={() => openEdit(exp)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          width: '100%',
                          padding: '12px 16px',
                          borderBottom: i < dayExpenses.length - 1 ? '1px solid var(--border)' : 'none',
                          textAlign: 'left',
                          transition: 'background 0.1s ease',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        {/* Category icon */}
                        <div
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 10,
                            background: `${cat.color || '#526080'}22`,
                            border: `1.5px solid ${cat.color || '#526080'}44`,
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
                          <p
                            style={{
                              fontWeight: 500,
                              fontSize: '0.9375rem',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              marginBottom: 2,
                            }}
                          >
                            {exp.note || cat.name || 'Expense'}
                          </p>
                          {exp.note && (
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                              {cat.name}
                            </p>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                          <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>
                            {fmt(exp.amount)}
                          </span>
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: 'var(--text-tertiary)', flexShrink: 0 }}>
                            <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* FAB */}
      <button className="fab" onClick={openAdd} aria-label="Add expense">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </button>

      {/* Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editExpense ? 'Edit Expense' : 'Add Expense'}
      >
        <ExpenseForm
          expense={editExpense}
          categories={categories}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={closeModal}
        />
      </Modal>
    </>
  );
}
