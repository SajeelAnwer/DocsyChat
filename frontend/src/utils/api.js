import axios from 'axios';

const API = axios.create({ baseURL: '/api' });

// Attach JWT token to every request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('docsychat_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Auth ──────────────────────────────────────────────────────────────────
export const signup = (data) => API.post('/auth/signup', data).then(r => r.data);
export const verifyEmail = (userId, code) => API.post('/auth/verify', { userId, code }).then(r => r.data);
export const resendCode = (userId) => API.post('/auth/resend', { userId }).then(r => r.data);
export const login = (data) => API.post('/auth/login', data).then(r => r.data);
export const getMe = () => API.get('/auth/me').then(r => r.data);
export const deleteAccount = () => API.delete('/auth/account').then(r => r.data);
export const forgotPassword = (email) => API.post('/auth/forgot-password', { email }).then(r => r.data);
export const verifyResetCode = (userId, code) => API.post('/auth/verify-reset-code', { userId, code }).then(r => r.data);
export const resetPassword = (resetToken, newPassword) => API.post('/auth/reset-password', { resetToken, newPassword }).then(r => r.data);

// ── Documents / Threads ───────────────────────────────────────────────────
export const uploadDocument = async (file) => {
  const formData = new FormData();
  formData.append('document', file);
  const res = await API.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return res.data;
};

export const getThreads = () => API.get('/threads').then(r => r.data);
export const deleteThread = (threadId) => API.delete(`/threads/${threadId}`).then(r => r.data);
export const renameThread = (threadId, custom_title) =>
  API.patch(`/threads/${threadId}`, { custom_title }).then(r => r.data);
export const starThread = (threadId, is_starred) =>
  API.patch(`/threads/${threadId}`, { is_starred }).then(r => r.data);

// ── Chat ──────────────────────────────────────────────────────────────────
export const sendMessage = (threadId, message) =>
  API.post(`/chat/${threadId}`, { message }).then(r => r.data);

export const getMessages = (threadId) =>
  API.get(`/chat/${threadId}/messages`).then(r => r.data);
