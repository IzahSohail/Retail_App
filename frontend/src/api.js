import axios from 'axios';

const backendBase = process.env.REACT_APP_BACKEND_BASE || 'http://localhost:3001';
export const api = axios.create({
  baseURL: `${backendBase}/api`,
  withCredentials: true,
});
