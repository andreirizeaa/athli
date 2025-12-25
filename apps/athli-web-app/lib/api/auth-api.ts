// API base URL - should NOT include /api/v1 path
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const API_URL = API_BASE_URL.replace(/\/api\/v1\/?$/, ''); // Remove /api/v1 if present

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface VerifyEmailData {
  email: string;
  otp: string;
}

export interface ResetPasswordData {
  email: string;
  otp: string;
  newPassword: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    token?: string;
    user?: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
    };
    userId?: string;
    requiresVerification?: boolean;
    isNew?: boolean;
  };
}

class AuthAPI {
  private async request(endpoint: string, options: RequestInit = {}): Promise<AuthResponse> {
    try {
      const response = await fetch(`${API_URL}/api/v1/auth${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'An error occurred');
      }

      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unexpected error occurred');
    }
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    return this.request('/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async login(data: LoginData): Promise<AuthResponse> {
    return this.request('/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async verifyEmail(data: VerifyEmailData): Promise<AuthResponse> {
    return this.request('/verify-email', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async resendOTP(email: string): Promise<AuthResponse> {
    return this.request('/resend-otp', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async forgotPassword(email: string): Promise<AuthResponse> {
    return this.request('/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(data: ResetPasswordData): Promise<AuthResponse> {
    return this.request('/reset-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async googleAuth(credential: string): Promise<AuthResponse> {
    return this.request('/google', {
      method: 'POST',
      body: JSON.stringify({ credential }),
    });
  }

  async getCurrentUser(token: string): Promise<AuthResponse> {
    return this.request('/me', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async logout(token: string): Promise<AuthResponse> {
    return this.request('/logout', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async sendSecurityOTP(email: string, token: string): Promise<AuthResponse> {
    return this.request('/send-security-otp', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ email }),
    });
  }

  async verifySecurityOTP(email: string, otp: string, token: string): Promise<AuthResponse> {
    return this.request('/verify-security-otp', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ email, otp }),
    });
  }

  async deleteAccount(token: string): Promise<AuthResponse> {
    return this.request('/delete-account', {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async newClient(coachId: string, token: string): Promise<AuthResponse> {
    return this.request('/new-client', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ coachId }),
    });
  }
}

export const authAPI = new AuthAPI();
