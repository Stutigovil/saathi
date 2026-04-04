import { auth } from '@/lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = auth.getToken();
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers || {})
    },
    cache: 'no-store'
  });

  if (!response.ok) {
    const raw = await response.text();
    let message = raw;
    try {
      const parsed = JSON.parse(raw);
      message = parsed?.message || raw;
    } catch {
      // ignore non-JSON body
    }
    throw new Error(message || `Request failed: ${response.status}`);
  }

  return response.json();
}

export const api = {
  signUp: (payload: { name: string; email: string; password: string }) =>
    request<{ token: string; user: { id: string; name: string; email: string } }>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  signIn: (payload: { email: string; password: string }) =>
    request<{ token: string; user: { id: string; name: string; email: string } }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  me: () => request<{ user: { id: string; name: string; email: string } }>('/api/auth/me'),
  getElders: () => request<any[]>('/api/elders'),
  getElderDashboard: (id: string) => request<any>(`/api/dashboard/elder/${id}`),
  getMoodTrend: (id: string, days = 7) => request<any[]>(`/api/dashboard/mood-trend/${id}?days=${days}`),
  getArmorLog: (id: string) => request<any[]>(`/api/dashboard/armoriq-log/${id}`),
  getWeeklyStats: (id: string) => request<any>(`/api/dashboard/weekly-stats/${id}`),
  createElder: (payload: any) =>
    request<any>('/api/elders', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  updateElder: (elderId: string, payload: any) =>
    request<any>(`/api/elders/${elderId}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    }),
  triggerCall: (elderId: string) =>
    request<any>(`/api/calls/trigger/${elderId}`, {
      method: 'POST'
    })
};
