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
        <h2>Hey {user.firstName}, ready to <span>explore a document?</span></h2>
        <p>Upload a PDF, Word doc, or text file and I'll answer any questions about its contents.</p>

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
          <div className="upload-zone__icon">
            {dragging ? '📂' : '📎'}
          </div>
          <div className="upload-zone__text">
            {dragging ? 'Drop it here!' : 'Click to upload or drag & drop'}
          </div>
          <div className="upload-zone__hint">Max 10MB</div>
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
              Processing <strong>{fileName}</strong>...
            </div>
          </div>
        )}

        {error && (
          <div className="error-toast" style={{ marginTop: '16px' }}>
            ⚠️ {error}
          </div>
        )}
      </div>
    </div>
  );
}
