// Simple auth utilities to handle login/register/logout

const API_BASE = import.meta.env.VITE_API_URL || '';

export async function loginUser(credentials: { identifier: string; password: string }) {
  try {
    const { identifier, password } = credentials;
    console.log('Sending login request for:', identifier);
    
    // Determine if identifier is email or username
    const isEmail = /\S+@\S+\.\S+/.test(identifier);
    const loginData = isEmail ? { email: identifier, password } : { username: identifier, password };
    
    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(loginData),
    });

    console.log('Login response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Login error response:', errorText);
      throw new Error(errorText || 'Failed to login');
    }

    const data = await response.json();
    console.log('Login successful, received data:', { ...data, token: '***' });
    return data;
  } catch (error) {
    console.error('Login request failed:', error);
    throw error;
  }
}

export async function registerUser(userData: {
  username: string;
  password: string;
  email: string;
  name: string;
}) {
  const response = await fetch(`${API_BASE}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(userData),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || 'Failed to register');
  }

  return response.json();
}

export async function logoutUser() {
  const response = await fetch(`${API_BASE}/api/auth/logout`, {
    method: 'POST',
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || 'Failed to logout');
  }

  return response.json();
}

export function getAuthToken() {
  return localStorage.getItem('auth_token');
}

export function setAuthToken(token: string) {
  localStorage.setItem('auth_token', token);
}

export function removeAuthToken() {
  localStorage.removeItem('auth_token');
}

export function getPendingInvitation() {
  return localStorage.getItem('pendingInvitation');
}

export function setPendingInvitation(token: string) {
  localStorage.setItem('pendingInvitation', token);
}

export function removePendingInvitation() {
  localStorage.removeItem('pendingInvitation');
}