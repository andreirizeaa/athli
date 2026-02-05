'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '../../api/auth/auth-service';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, firstName: string, lastName: string) => Promise<{ requiresVerification: boolean }>;
  logout: () => Promise<void>;
  verifyEmail: (email: string, otp: string) => Promise<void>;
  resendOTP: (email: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (email: string, otp: string, newPassword: string) => Promise<void>;
  googleAuth: (credential: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Load token and user from localStorage on mount
    const storedToken = localStorage.getItem(TOKEN_KEY);
    const storedUser = localStorage.getItem(USER_KEY);

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      // Optionally verify token validity
      verifyToken(storedToken);
    }
    setIsLoading(false);
  }, []);

  const verifyToken = async (token: string) => {
    try {
      const response = await authService.getCurrentUser(token);
      if (response.data?.user) {
        setUser(response.data.user);
        localStorage.setItem(USER_KEY, JSON.stringify(response.data.user));
      }
    } catch (error) {
      // Token is invalid, clear auth state
      clearAuth();
    }
  };

  const saveAuth = (token: string, user: User) => {
    setToken(token);
    setUser(user);
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  };

  const clearAuth = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  };

  const login = async (email: string, password: string) => {
    const response = await authService.login({ email, password });
    if (response.data?.token && response.data?.user) {
      saveAuth(response.data.token, response.data.user);
      router.push('/home');
    } else {
      throw new Error('Login failed');
    }
  };

  const register = async (
    email: string,
    password: string,
    firstName: string,
    lastName: string
  ): Promise<{ requiresVerification: boolean }> => {
    const response = await authService.register({
      email,
      password,
      firstName,
      lastName,
    });
    return {
      requiresVerification: response.data?.requiresVerification ?? true,
    };
  };

  const verifyEmail = async (email: string, otp: string) => {
    const response = await authService.verifyEmail({ email, otp });
    if (response.data?.token && response.data?.user) {
      saveAuth(response.data.token, response.data.user);
      router.push('/home');
    } else {
      throw new Error('Verification failed');
    }
  };

  const resendOTP = async (email: string) => {
    await authService.resendOTP(email);
  };

  const forgotPassword = async (email: string) => {
    await authService.forgotPassword(email);
  };

  const resetPassword = async (email: string, otp: string, newPassword: string) => {
    await authService.resetPassword({ email, otp, newPassword });
    router.push('/auth/login');
  };

  const googleAuth = async (credential: string) => {
    const response = await authService.googleAuth(credential);
    if (response.data?.token && response.data?.user) {
      saveAuth(response.data.token, response.data.user);
      router.push('/home');
    } else {
      throw new Error('Google authentication failed');
    }
  };

  const logout = async () => {
    if (token) {
      try {
        await authService.logout(token);
      } catch (error) {
        console.error('Logout error:', error);
      }
    }
    clearAuth();
    router.push('/auth/login');
  };

  const value = {
    user,
    token,
    isLoading,
    login,
    register,
    logout,
    verifyEmail,
    resendOTP,
    forgotPassword,
    resetPassword,
    googleAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
