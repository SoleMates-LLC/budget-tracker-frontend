import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import client from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [autoLogResult, setAutoLogResult] = useState(null); // { processed, items } after startup

  const processRecurring = useCallback(async () => {
    try {
      const { data } = await client.post('/api/recurring/process');
      if (data.processed > 0) setAutoLogResult(data);
    } catch { /* silent — non-critical */ }
  }, []);

  // ─── Restore session on mount ──────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setLoading(false);
      return;
    }

    client
      .get('/api/auth/me')
      .then(({ data }) => {
        setUser(data.user);
        processRecurring();
      })
      .catch(() => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      })
      .finally(() => setLoading(false));
  }, []);

  // ─── Apple Sign In ─────────────────────────────────────────
  const signInWithApple = useCallback(async () => {
    // Dynamic import to avoid crashing on web
    let SignInWithApple;
    try {
      const module = await import('@capacitor-community/apple-sign-in');
      SignInWithApple = module.SignInWithApple;
    } catch {
      throw new Error('Apple Sign In is only available on iOS.');
    }

    let appleResponse;
    try {
      appleResponse = await SignInWithApple.authorize({
        clientId: 'com.eifb.budgettracker',
        redirectURI: 'https://eifb.app/auth/callback',
        scopes: 'email name',
        state: Math.random().toString(36).substring(2),
        nonce: Math.random().toString(36).substring(2),
      });
    } catch (err) {
      // User cancelled or platform unsupported
      if (
        err?.message?.includes('cancelled') ||
        err?.message?.includes('canceled') ||
        err?.message?.includes('dismiss')
      ) {
        throw new Error('Sign in was cancelled.');
      }
      throw new Error('Apple Sign In is only available on iOS.');
    }

    const { identityToken, authorizationCode, givenName, familyName } =
      appleResponse.response || appleResponse;

    const deviceName =
      navigator?.userAgent?.match(/iPhone|iPad/i)?.[0] || 'iOS Device';

    const { data } = await client.post('/api/auth/apple', {
      identityToken,
      authorizationCode,
      fullName: { givenName: givenName || '', familyName: familyName || '' },
      deviceName,
    });

    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    setUser(data.user);
    processRecurring();
    return data.user;
  }, [processRecurring]);

  // ─── Email / Password Register ─────────────────────────────
  const signUp = useCallback(async ({ email, password, full_name }) => {
    const { data } = await client.post('/api/auth/register', { email, password, full_name });
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    setUser(data.user);
    // Don't process recurring for unverified accounts
    if (data.user.email_verified) processRecurring();
    return data.user;
  }, [processRecurring]);

  // ─── Email / Password Login ────────────────────────────────
  const signInWithEmail = useCallback(async ({ email, password }) => {
    const { data } = await client.post('/api/auth/login', { email, password });
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    setUser(data.user);
    processRecurring();
    return data.user;
  }, [processRecurring]);

  // ─── Dev Bypass (development only) ────────────────────────
  const devSignIn = useCallback(async () => {
    const { data } = await client.post('/api/auth/dev-login');
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    setUser(data.user);
    processRecurring();
  }, [processRecurring]);

  // ─── Sign Out ──────────────────────────────────────────────
  const signOut = useCallback(async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    try {
      if (refreshToken) {
        await client.post('/api/auth/logout', { refreshToken });
      }
    } catch {
      // Swallow — we clear tokens regardless
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setUser(null);
    }
  }, []);

  // ─── Sign Out All Devices ──────────────────────────────────
  const signOutAll = useCallback(async () => {
    try {
      await client.post('/api/auth/logout-all');
    } catch {
      // Swallow
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setUser(null);
    }
  }, []);

  // ─── Email Verification ────────────────────────────────────
  const verifyEmail = useCallback(async (code) => {
    await client.post('/api/auth/verify-email', { code });
    setUser(prev => prev ? { ...prev, email_verified: true } : prev);
    processRecurring();
  }, [processRecurring]);

  const resendVerification = useCallback(async () => {
    await client.post('/api/auth/resend-verification');
  }, []);

  // ─── Forgot / Reset Password ──────────────────────────────
  const forgotPassword = useCallback(async (email) => {
    await client.post('/api/auth/forgot-password', { email });
  }, []);

  const resetPassword = useCallback(async ({ email, code, newPassword }) => {
    await client.post('/api/auth/reset-password', { email, code, newPassword });
  }, []);

  const clearAutoLog = useCallback(() => setAutoLogResult(null), []);

  return (
    <AuthContext.Provider value={{ user, loading, signInWithApple, signInWithEmail, signUp, signOut, signOutAll, devSignIn, verifyEmail, resendVerification, forgotPassword, resetPassword, autoLogResult, clearAutoLog }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
