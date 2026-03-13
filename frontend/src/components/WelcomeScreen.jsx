import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

const DocIcon = () => (
  <svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 2a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V7.414A2 2 0 0017.414 6L14 2.586A2 2 0 0012.586 2H4zm0 2h8v3a1 1 0 001 1h3v9H4V4zm9 .414L15.586 7H13V4.414z"/>
  </svg>
);

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
          <div className="welcome__logo-mark"><DocIcon /></div>
          <h1>DocuChat</h1>
        </div>

        <p className="welcome__heading">
          Ask anything about<br /><em>your documents</em>
        </p>
        <p className="welcome__sub">
          Upload a PDF, Word doc, or text file. The AI reads it and answers only from what's inside — nothing made up.
        </p>

        <div className="welcome__divider" />

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">First Name</label>
              <input
                className="form-input"
                type="text"
                value={firstName}
                onChange={e => { setFirstName(e.target.value); setError(''); }}
                placeholder="Alex"
                autoFocus
              />
            </div>
            <div className="form-group">
              <label className="form-label">Last Name</label>
              <input
                className="form-input"
                type="text"
                value={lastName}
                onChange={e => { setLastName(e.target.value); setError(''); }}
                placeholder="Smith"
              />
            </div>
          </div>

          {error && (
            <p style={{ color: 'var(--accent)', fontSize: '13px', marginBottom: '10px' }}>
              {error}
            </p>
          )}

          <button type="submit" className="btn-primary">
            Get Started
          </button>
        </form>

        <p className="welcome__footer">No account needed · session only</p>
      </div>
    </div>
  );
}
