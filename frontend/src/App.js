import React, { useState, useEffect } from 'react';
import './styles/globals.css';
import './styles/app.css';
import AuthScreen from './components/AuthScreen';
import ChatLayout from './components/ChatLayout';
import { getMe } from './utils/api';

// Read cached user data from localStorage — no network call needed on load.
// The JWT is validated on every API request server-side, so this is safe.
function getCachedUser() {
  try {
    const token = localStorage.getItem('docsychat_token');
    const userData = localStorage.getItem('docsychat_user');
    if (!token || !userData) return null;

    // Check token expiry locally by decoding the payload (no verification needed here —
    // the server verifies on every request; we just don't want to show stale UI)
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      localStorage.removeItem('docsychat_token');
      localStorage.removeItem('docsychat_user');
      return null;
    }

    return JSON.parse(userData);
  } catch {
    return null;
  }
}

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cached = getCachedUser();

    if (cached) {
      // Restore from cache instantly — no network call
      setUser(cached);
      setLoading(false);

      // Quietly validate in the background and refresh user data if needed
      getMe()
        .then(data => setUser(data.user))
        .catch(() => {
          // Token rejected by server — clear and go to login
          localStorage.removeItem('docsychat_token');
          localStorage.removeItem('docsychat_user');
          setUser(null);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const handleAuthSuccess = (token, userData) => {
    localStorage.setItem('docsychat_token', token);
    localStorage.setItem('docsychat_user', JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('docsychat_token');
    localStorage.removeItem('docsychat_user');
    setUser(null);
  };

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)' }}>
        <div className="upload-spinner" style={{ width: 28, height: 28 }} />
      </div>
    );
  }

  if (!user) return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
  return <ChatLayout user={user} onLogout={handleLogout} />;
}

export default App;
