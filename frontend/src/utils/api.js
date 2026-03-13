import axios from 'axios';

const API = axios.create({ baseURL: '/api' });

export const uploadDocument = async (file, firstName, lastName, userId) => {
  const formData = new FormData();
  formData.append('document', file);
  formData.append('firstName', firstName);
  formData.append('lastName', lastName);
  formData.append('userId', userId);
  const res = await API.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return res.data;
};

export const sendMessage = async (threadId, message) => {
  const res = await API.post(`/chat/${threadId}`, { message });
  return res.data;
};

export const getMessages = async (threadId) => {
  const res = await API.get(`/chat/${threadId}/messages`);
  return res.data;
};

export const getThreads = async (userId) => {
  const res = await API.get(`/threads/${userId}`);
  return res.data;
};

export const deleteThread = async (threadId) => {
  const res = await API.delete(`/threads/${threadId}`);
  return res.data;
};
