import React, { useState } from 'react';
import { signup, login, verifyEmail, resendCode } from '../utils/api';

const DocIcon = () => (
  <svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 2a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V7.414A2 2 0 0017.414 6L14 2.586A2 2 0 0012.586 2H4zm0 2h8v3a1 1 0 001 1h3v9H4V4zm9 .414L15.586 7H13V4.414z"/>
  </svg>
);

// ── Shared Layout ─────────────────────────────────────────────────────────
function AuthCard({ children }) {
  return (
    <div className="welcome">
      <div className="welcome__bg" />
      <div className="welcome__card" style={{ maxWidth: 440 }}>
        <div className="welcome__logo">
          <div className="welcome__logo-mark"><DocIcon /></div>
          <h1>DocsyChat</h1>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Login Form ────────────────────────────────────────────────────────────
function LoginForm({ onSwitch, onAuthSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const data = await login({ email, password });
      onAuthSuccess(data.token, data.user);
    } catch (err) {
      const resp = err.response?.data;
      if (resp?.needsVerification) {
        onSwitch('verify', { userId: resp.userId, email });
      } else {
        setError(resp?.error || 'Login failed.');
      }
    } finally { setLoading(false); }
  };

  return (
    <AuthCard>
      <p className="welcome__heading">Welcome back to<br /><em>DocsyChat</em></p>
      <p className="welcome__sub">Sign in to continue chatting with your documents.</p>
      <div className="welcome__divider" />
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Email</label>
          <input className="form-input" type="email" value={email}
            onChange={e => { setEmail(e.target.value); setError(''); }}
            placeholder="you@example.com" autoFocus required />
        </div>
        <div className="form-group">
          <label className="form-label">Password</label>
          <input className="form-input" type="password" value={password}
            onChange={e => { setPassword(e.target.value); setError(''); }}
            placeholder="••••••••" required />
        </div>
        {error && <p className="auth-error">{error}</p>}
        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
      </form>
      <p className="auth-switch">
        Don't have an account?{' '}
        <button onClick={() => onSwitch('signup')} className="auth-link">Sign up</button>
      </p>
    </AuthCard>
  );
}

// ── Signup Form ───────────────────────────────────────────────────────────
function SignupForm({ onSwitch }) {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const update = (k, v) => { setForm(p => ({ ...p, [k]: v })); setError(''); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setError(''); setLoading(true);
    try {
      const data = await signup(form);
      onSwitch('verify', { userId: data.userId, email: form.email, firstName: form.firstName });
    } catch (err) {
      setError(err.response?.data?.error || 'Signup failed.');
    } finally { setLoading(false); }
  };

  return (
    <AuthCard>
      <p className="welcome__heading">Create your<br /><em>DocsyChat</em> account</p>
      <p className="welcome__sub">Upload documents and ask questions. Free, no credit card needed.</p>
      <div className="welcome__divider" />
      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">First Name</label>
            <input className="form-input" type="text" value={form.firstName}
              onChange={e => update('firstName', e.target.value)}
              placeholder="Alex" autoFocus required />
          </div>
          <div className="form-group">
            <label className="form-label">Last Name</label>
            <input className="form-input" type="text" value={form.lastName}
              onChange={e => update('lastName', e.target.value)}
              placeholder="Smith" required />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Email</label>
          <input className="form-input" type="email" value={form.email}
            onChange={e => update('email', e.target.value)}
            placeholder="you@example.com" required />
        </div>
        <div className="form-group">
          <label className="form-label">Password</label>
          <input className="form-input" type="password" value={form.password}
            onChange={e => update('password', e.target.value)}
            placeholder="Min. 8 characters" required />
        </div>
        {error && <p className="auth-error">{error}</p>}
        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? 'Creating account…' : 'Create Account'}
        </button>
      </form>
      <p className="auth-switch">
        Already have an account?{' '}
        <button onClick={() => onSwitch('login')} className="auth-link">Sign in</button>
      </p>
    </AuthCard>
  );
}

// ── Verify Email Form ─────────────────────────────────────────────────────
function VerifyForm({ userId, email, firstName, onAuthSuccess, onSwitch }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resent, setResent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (code.trim().length !== 6) { setError('Please enter the 6-digit code.'); return; }
    setError(''); setLoading(true);
    try {
      const data = await verifyEmail(userId, code.trim());
      onAuthSuccess(data.token, data.user);
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid code.');
    } finally { setLoading(false); }
  };

  const handleResend = async () => {
    try {
      await resendCode(userId);
      setResent(true);
      setTimeout(() => setResent(false), 5000);
    } catch { setError('Failed to resend code.'); }
  };

  return (
    <AuthCard>
      <p className="welcome__heading">Check your<br /><em>email</em></p>
      <p className="welcome__sub">
        We sent a 6-digit verification code to <strong>{email}</strong>. It expires in 15 minutes.
      </p>
      <div className="welcome__divider" />
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Verification Code</label>
          <input
            className="form-input"
            type="text"
            value={code}
            onChange={e => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }}
            placeholder="123456"
            maxLength={6}
            autoFocus
            style={{ fontSize: '22px', letterSpacing: '6px', textAlign: 'center', fontFamily: 'monospace' }}
          />
        </div>
        {error && <p className="auth-error">{error}</p>}
        {resent && <p className="auth-success">New code sent!</p>}
        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? 'Verifying…' : 'Verify Email'}
        </button>
      </form>
      <p className="auth-switch">
        Didn't get it?{' '}
        <button onClick={handleResend} className="auth-link">Resend code</button>
        {' · '}
        <button onClick={() => onSwitch('signup')} className="auth-link">Back</button>
      </p>
    </AuthCard>
  );
}

// ── Main AuthScreen ───────────────────────────────────────────────────────
export default function AuthScreen({ onAuthSuccess }) {
  const [screen, setScreen] = useState('login');
  const [verifyData, setVerifyData] = useState(null);

  const handleSwitch = (to, data = null) => {
    if (data) setVerifyData(data);
    setScreen(to);
  };

  if (screen === 'signup') return <SignupForm onSwitch={handleSwitch} />;
  if (screen === 'verify' && verifyData) {
    return (
      <VerifyForm
        userId={verifyData.userId}
        email={verifyData.email}
        firstName={verifyData.firstName}
        onAuthSuccess={onAuthSuccess}
        onSwitch={handleSwitch}
      />
    );
  }
  return <LoginForm onSwitch={handleSwitch} onAuthSuccess={onAuthSuccess} />;
}
