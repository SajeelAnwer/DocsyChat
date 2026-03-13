import React, { useState, useEffect } from 'react';
import './styles/globals.css';
import './styles/app.css';
import WelcomeScreen from './components/WelcomeScreen';
import ChatLayout from './components/ChatLayout';

function App() {
  const [user, setUser] = useState(null);

  // Persist user session in localStorage
  useEffect(() => {
    const saved = localStorage.getItem('docuchat_user');
    if (saved) {
      try { setUser(JSON.parse(saved)); } catch {}
    }
  }, []);

  const handleUserSet = (userData) => {
    localStorage.setItem('docuchat_user', JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('docuchat_user');
    setUser(null);
  };

  if (!user) {
    return <WelcomeScreen onUserSet={handleUserSet} />;
  }

  return <ChatLayout user={user} onLogout={handleLogout} />;
}

export default App;
