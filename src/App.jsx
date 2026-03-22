import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import BottomNav from './components/BottomNav.jsx';
import LoginPage from './pages/LoginPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import ExpensesPage from './pages/ExpensesPage.jsx';
import BudgetsPage from './pages/BudgetsPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import RecurringPage from './pages/RecurringPage.jsx';
import DebtPage from './pages/DebtPage.jsx';

// ─── Protected Layout ──────────────────────────────────────────
function ProtectedLayout() {
  const { user, loading, autoLogResult, clearAutoLog } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          width: '100%',
          maxWidth: 430,
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-primary)',
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: 'var(--bg-surface)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>eIB</span>
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              width: 12,
              height: 3,
              background: 'var(--accent)',
              borderRadius: '2px 0 0 0',
            }}
          />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="page">
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <Outlet />
      </div>
      <BottomNav />

      {/* Auto-recurring payment toast */}
      {autoLogResult && (
        <div
          onClick={clearAutoLog}
          style={{
            position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
            background: '#0f2b1a', border: '1px solid #22c55e44',
            borderRadius: 14, padding: '12px 18px', zIndex: 500,
            display: 'flex', alignItems: 'center', gap: 10,
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)', cursor: 'pointer',
            maxWidth: 340, width: 'calc(100% - 32px)',
          }}
        >
          <span style={{ fontSize: '1.25rem' }}>🔄</span>
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 700, fontSize: '0.875rem', color: '#4ade80' }}>
              {autoLogResult.processed} recurring payment{autoLogResult.processed !== 1 ? 's' : ''} logged
            </p>
            <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginTop: 1 }}>
              {autoLogResult.items.map(i => i.name).join(', ')}
            </p>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)' }}>✕</span>
        </div>
      )}
    </div>
  );
}

// ─── Login Guard ───────────────────────────────────────────────
function LoginGuard() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;
  return (
    <div className="page">
      <LoginPage />
    </div>
  );
}

// ─── App ───────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginGuard />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route element={<ProtectedLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/expenses" element={<ExpensesPage />} />
            <Route path="/budgets" element={<BudgetsPage />} />
            <Route path="/recurring" element={<RecurringPage />} />
            <Route path="/debt" element={<DebtPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
