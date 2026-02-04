// lib/api-client.ts (versi baru – lebih sederhana)
export async function apiClient(endpoint: string, options: RequestInit = {}) {
  return fetch(endpoint, {
    ...options,
    credentials: 'include',  // <-- Penting! Kirim cookie ke server
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
}