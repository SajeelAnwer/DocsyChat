import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

export default function WelcomeScreen({ onUserSet }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!firstName.trim()) { setError('Please enter your first name'); return; }
    if (!lastName.trim()) { setError('Please enter your last name'); return; }
    setError('');
    onUserSet({
      id: uuidv4(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      fullName: `${firstName.trim()} ${lastName.trim()}`
    });
  };

  return (
    <div className="welcome">
      <div className="welcome__bg" />
      <div className="welcome__card">
        <div className="welcome__logo">
          <div className="welcome__logo-icon">📄</div>
          <h1>DocuChat</h1>
        </div>

        <p className="welcome__tagline">
          Upload any document and ask questions about it. Your AI assistant will only answer based on <strong>what's in your file</strong>.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={e => { setFirstName(e.target.value); setError(''); }}
                placeholder="Alex"
                autoFocus
              />
            </div>
            <div className="form-group">
              <label>Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={e => { setLastName(e.target.value); setError(''); }}
                placeholder="Smith"
              />
            </div>
          </div>

          {error && (
            <p style={{ color: '#e05252', fontSize: '13px', marginBottom: '12px' }}>
              {error}
            </p>
          )}

          <button type="submit" className="btn-primary">
            Start Chatting →
          </button>
        </form>

        <p style={{ marginTop: '20px', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>
          No signup required. Your data stays in this session.
        </p>
      </div>
    </div>
  );
}
