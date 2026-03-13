import React, { useState, useRef } from 'react';
import { uploadDocument } from '../utils/api';

export default function UploadZone({ user, onUploadComplete }) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');
  const inputRef = useRef(null);

  const processFile = async (file) => {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['pdf', 'docx', 'txt'].includes(ext)) {
      setError('Only PDF, DOCX, and TXT files are supported.');
      return;
    }
    setError('');
    setFileName(file.name);
    setUploading(true);
    try {
      const result = await uploadDocument(file, user.firstName, user.lastName, user.id);
      onUploadComplete(result);
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed. Please try again.');
      setFileName('');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    processFile(e.dataTransfer.files[0]);
  };

  return (
    <div className="upload-prompt">
      <div className="upload-prompt__inner">
        <div className="upload-prompt__eyebrow">
          <span>✦</span> Document Q&A
        </div>

        <h2>
          Hey {user.firstName},<br />
          what are we <em>reading today?</em>
        </h2>

        <p className="upload-prompt__sub">
          Drop any document below and I'll answer your questions based strictly on its contents.
        </p>

        <div
          className={`upload-zone ${dragging ? 'dragging' : ''}`}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => !uploading && inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.docx,.txt"
            onChange={e => processFile(e.target.files[0])}
            disabled={uploading}
          />
          <div className="upload-zone__row">
            <div className="upload-zone__icon-wrap">
              {dragging ? '📂' : '📎'}
            </div>
            <div className="upload-zone__text-group">
              <div className="upload-zone__text">
                {dragging ? 'Release to upload' : 'Click to browse or drag & drop'}
              </div>
              <div className="upload-zone__hint">Max 10 MB document</div>
            </div>
          </div>
          <div className="upload-zone__types">
            <span className="badge">PDF</span>
            <span className="badge">DOCX</span>
            <span className="badge">TXT</span>
          </div>
        </div>

        {uploading && (
          <div className="upload-progress">
            <div className="upload-spinner" />
            <div className="upload-progress-text">
              Reading <strong>{fileName}</strong>…
            </div>
          </div>
        )}

        {error && (
          <div className="error-toast" style={{ marginTop: '14px' }}>
            ⚠️ {error}
          </div>
        )}
      </div>
    </div>
  );
}
