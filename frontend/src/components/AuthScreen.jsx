import React, { useState } from 'react';
import { signup, login, verifyEmail, resendCode, forgotPassword, verifyResetCode, resetPassword } from '../utils/api';

const DocIcon = () => (
  <svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 2a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V7.414A2 2 0 0017.414 6L14 2.586A2 2 0 0012.586 2H4zm0 2h8v3a1 1 0 001 1h3v9H4V4zm9 .414L15.586 7H13V4.414z"/>
  </svg>
);

// ── Shared split-layout shell ─────────────────────────────────────────────
function AuthShell({ children }) {
  return (
    <div className="auth-shell">
      <div className="auth-left">
        <div className="auth-brand">
          <div className="auth-brand-mark"><DocIcon /></div>
          <span className="auth-brand-name">DocsyChat</span>
        </div>
        <div className="auth-hero">
          <div className="auth-hero-eyebrow">✦ AI Document Q&A</div>
          <h2 className="auth-hero-title">Chat with your<br /><em>documents.</em></h2>
          <p className="auth-hero-sub">
            Upload any PDF, Word doc, or text file and ask questions —
            DocsyChat answers from what's actually in the file.
          </p>
        </div>
      </div>
      <div className="auth-right">
        <div className="auth-form-wrap">
          {children}
        </div>
      </div>
    </div>
  );
}

// ── Login Form ────────────────────────────────────────────────────────────
function LoginForm({ onSwitch, onAuthSuccess, passwordResetSuccess }) {
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
    <AuthShell>
      <h2 className="auth-form-heading">Welcome back to<br /><em>DocsyChat</em></h2>
      <p className="auth-form-sub">Sign in to continue chatting with your documents.</p>
      <div className="form-divider" />
      {passwordResetSuccess && (
        <p className="auth-success" style={{ marginBottom: "16px" }}>
          Password updated. Sign in with your new password.
        </p>
      )}
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
        <button onClick={() => onSwitch('forgot')} className="auth-link">Forgot password?</button>
      </p>
      <p className="auth-switch" style={{ marginTop: '8px' }}>
        Don't have an account?{' '}
        <button onClick={() => onSwitch('signup')} className="auth-link">Sign up</button>
      </p>
    </AuthShell>
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
    <AuthShell>
      <h2 className="auth-form-heading">Create your<br /><em>DocsyChat</em> account</h2>
      <p className="auth-form-sub">Free, no credit card needed.</p>
      <div className="form-divider" />
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
    </AuthShell>
  );
}

// ── Verify Email Form ─────────────────────────────────────────────────────
function VerifyForm({ userId, email, onAuthSuccess, onSwitch }) {
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
    <AuthShell>
      <h2 className="auth-form-heading">Check your<br /><em>email</em></h2>
      <p className="auth-form-sub">
        We sent a 6-digit verification code to <strong>{email}</strong>. It expires in 15 minutes.
      </p>
      <div className="form-divider" />
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
    </AuthShell>
  );
}

// ── Forgot Password — Step 1: Enter email ────────────────────────────────
function ForgotPasswordForm({ onSwitch }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const data = await forgotPassword(email);
      // userId may be undefined if email not found — we show the same screen either way
      onSwitch('reset-verify', { userId: data.userId, email });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send reset code. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <AuthShell>
      <h2 className="auth-form-heading">Reset your<br /><em>password</em></h2>
      <p className="auth-form-sub">
        Enter the email address on your account and we'll send you a reset code.
      </p>
      <div className="form-divider" />
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Email</label>
          <input className="form-input" type="email" value={email}
            onChange={e => { setEmail(e.target.value); setError(''); }}
            placeholder="you@example.com" autoFocus required />
        </div>
        {error && <p className="auth-error">{error}</p>}
        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? 'Sending code…' : 'Send Reset Code'}
        </button>
      </form>
      <p className="auth-switch">
        Remembered it?{' '}
        <button onClick={() => onSwitch('login')} className="auth-link">Back to sign in</button>
      </p>
    </AuthShell>
  );
}

// ── Forgot Password — Step 2: Enter code ─────────────────────────────────
function ResetVerifyForm({ userId, email, onSwitch }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (code.trim().length !== 6) { setError('Please enter the 6-digit code.'); return; }
    if (!userId) { setError('Something went wrong. Please start over.'); return; }
    setError(''); setLoading(true);
    try {
      const data = await verifyResetCode(userId, code.trim());
      onSwitch('reset-password', { resetToken: data.resetToken });
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid or expired code.');
    } finally { setLoading(false); }
  };

  return (
    <AuthShell>
      <h2 className="auth-form-heading">Check your<br /><em>email</em></h2>
      <p className="auth-form-sub">
        We sent a 6-digit reset code to <strong>{email}</strong>. It expires in 15 minutes.
      </p>
      <div className="form-divider" />
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Reset Code</label>
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
        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? 'Verifying…' : 'Verify Code'}
        </button>
      </form>
      <p className="auth-switch">
        <button onClick={() => onSwitch('forgot')} className="auth-link">← Start over</button>
      </p>
    </AuthShell>
  );
}

// ── Forgot Password — Step 3: Set new password ───────────────────────────
function ResetPasswordForm({ resetToken, onSwitch }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setError(''); setLoading(true);
    try {
      await resetPassword(resetToken, password);
      onSwitch('login', null, true); // true = show success message
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset password. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <AuthShell>
      <h2 className="auth-form-heading">Set a new<br /><em>password</em></h2>
      <p className="auth-form-sub">Choose a strong password for your account.</p>
      <div className="form-divider" />
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">New Password</label>
          <input className="form-input" type="password" value={password}
            onChange={e => { setPassword(e.target.value); setError(''); }}
            placeholder="Min. 8 characters" autoFocus required />
        </div>
        <div className="form-group">
          <label className="form-label">Confirm Password</label>
          <input className="form-input" type="password" value={confirm}
            onChange={e => { setConfirm(e.target.value); setError(''); }}
            placeholder="Repeat your password" required />
        </div>
        {error && <p className="auth-error">{error}</p>}
        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? 'Saving…' : 'Save New Password'}
        </button>
      </form>
    </AuthShell>
  );
}

// ── Main AuthScreen ───────────────────────────────────────────────────────
export default function AuthScreen({ onAuthSuccess }) {
  const [screen, setScreen] = useState('login');
  const [verifyData, setVerifyData] = useState(null);
  const [resetData, setResetData] = useState(null);
  const [passwordResetSuccess, setPasswordResetSuccess] = useState(false);

  const handleSwitch = (to, data = null, resetSuccess = false) => {
    if (resetSuccess) setPasswordResetSuccess(true);
    if (data) {
      if (to === 'verify' || to === 'reset-verify') setVerifyData(data);
      if (to === 'reset-password') setResetData(data);
    }
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

  if (screen === 'forgot') return <ForgotPasswordForm onSwitch={handleSwitch} />;

  if (screen === 'reset-verify' && verifyData) {
    return (
      <ResetVerifyForm
        userId={verifyData.userId}
        email={verifyData.email}
        onSwitch={handleSwitch}
      />
    );
  }

  if (screen === 'reset-password' && resetData) {
    return <ResetPasswordForm resetToken={resetData.resetToken} onSwitch={handleSwitch} />;
  }

  // Default: login
  return (
    <LoginForm
      onSwitch={handleSwitch}
      onAuthSuccess={onAuthSuccess}
      passwordResetSuccess={passwordResetSuccess}
    />
  );
}
