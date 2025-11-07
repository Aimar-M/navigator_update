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
    
    const data = await response.json();
    console.log('Login response data:', { ...data, token: data.token ? '***' : undefined });
    
    // Check if account requires recovery (403 status with ACCOUNT_DELETED code)
    if (!response.ok && data.code === 'ACCOUNT_DELETED') {
      // Return recovery data instead of throwing error
      return data;
    }
    
    if (!response.ok) {
      const errorText = JSON.stringify(data);
      console.error('Login error response:', errorText);
      throw new Error(errorText || 'Failed to login');
    }
    
    // Check if account requires recovery (even if response is ok)
    if (data.requiresRecovery) {
      // Return recovery data instead of throwing error
      return data;
    }
    
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

  const data = await response.json();

  // Check if account requires recovery (403 status with ACCOUNT_DELETED code)
  if (!response.ok && data.code === 'ACCOUNT_DELETED') {
    // Return recovery data instead of throwing error
    return data;
  }

  if (!response.ok) {
    const error = JSON.stringify(data);
    throw new Error(error || 'Failed to register');
  }

  return data;
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