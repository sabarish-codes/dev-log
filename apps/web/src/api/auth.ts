import { api } from '../lib/axios';

export interface User {
  id: number;
  username: string;
  email: string;
  createdAt: string;
}

export interface AuthResponse {
  data: {
    user: User;
    accessToken: string;
  };
}

export async function registerApi(payload: {
  username: string;
  email: string;
  password: string;
}) {
  const { data } = await api.post<AuthResponse>(
    '/api/v1/auth/register',
    payload,
  );
  return data.data;
}

export async function loginApi(payload: { email: string; password: string }) {
  const { data } = await api.post<AuthResponse>('/api/v1/auth/login', payload);
  return data.data;
}

export async function logoutApi() {
  await api.post('/api/v1/auth/logout');
}

export async function getMeApi() {
  const { data } = await api.get<{ data: { user: User } }>('/api/v1/auth/me');
  return data.data.user;
}
