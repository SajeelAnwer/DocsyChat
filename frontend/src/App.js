import React, { useState, useEffect } from 'react';
import './styles/globals.css';
import './styles/app.css';
import AuthScreen from './components/AuthScreen';
import ChatLayout from './components/ChatLayout';
import { getMe } from './utils/api';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('docsychat_token');
    if (!token) { setLoading(false); return; }
    getMe()
      .then(data => setUser(data.user))
      .catch(() => { localStorage.removeItem('docsychat_token'); })
      .finally(() => setLoading(false));
  }, []);

  const handleAuthSuccess = (token, userData) => {
    localStorage.setItem('docsychat_token', token);
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('docsychat_token');
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
