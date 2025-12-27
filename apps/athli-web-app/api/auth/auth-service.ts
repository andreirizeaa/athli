import { apiFetch } from '@/api/api-client';

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

class AuthService {
    /**
     * Common request handler for auth endpoints
     */
    private async authRequest(endpoint: string, options: any = {}): Promise<AuthResponse> {
        return apiFetch(`/auth${endpoint}`, {
            ...options,
            authenticated: options.authenticated ?? false, // Auth routes are mostly unauthenticated
        });
    }

    /**
     * Register a new coach account
     */
    async register(data: RegisterData): Promise<AuthResponse> {
        return this.authRequest('/coach/register', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    /**
     * Google OAuth login/registration for coaches
     */
    async googleAuth(credential: string): Promise<AuthResponse> {
        return this.authRequest('/coach/google', {
            method: 'POST',
            body: JSON.stringify({ credential }),
        });
    }

    /**
     * Get coach info by invite code (for client signup page)
     */
    async getCoachByInviteCode(code: string): Promise<AuthResponse> {
        return this.authRequest(`/client/invite/${code}`, {
            method: 'GET',
        });
    }

    /**
     * Accept coach invitation and create client account
     */
    async acceptClientInvite(data: {
        inviteCode: string;
        email: string;
        password: string;
        name: string;
    }): Promise<AuthResponse> {
        return this.authRequest('/client/accept-invite', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async login(data: LoginData): Promise<AuthResponse> {
        return this.authRequest('/login', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async verifyEmail(data: VerifyEmailData): Promise<AuthResponse> {
        return this.authRequest('/verify-email', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async resendOTP(email: string): Promise<AuthResponse> {
        return this.authRequest('/resend-otp', {
            method: 'POST',
            body: JSON.stringify({ email }),
        });
    }

    async forgotPassword(email: string): Promise<AuthResponse> {
        return this.authRequest('/forgot-password', {
            method: 'POST',
            body: JSON.stringify({ email }),
        });
    }

    async resetPassword(data: ResetPasswordData): Promise<AuthResponse> {
        return this.authRequest('/reset-password', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async getCurrentUser(token?: string): Promise<AuthResponse> {
        // We use apiFetch which handles token injection if authenticated=true
        // If a token is explicitly provided (rare in new structure but used in AuthProvider), we can pass it
        const options: any = { method: 'GET' };
        if (token) {
            options.headers = { 'Authorization': `Bearer ${token}` };
            options.authenticated = false; // Don't try to get session token if we have one
        }
        return apiFetch('/user/me', options);
    }

    async logout(token?: string): Promise<AuthResponse> {
        return this.authRequest('/logout', {
            method: 'POST',
            authenticated: true,
            // If token is provided, it will be handled by apiFetch or overridden by headers
            headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        });
    }

    async sendSecurityOTP(email: string, token?: string): Promise<AuthResponse> {
        return this.authRequest('/send-security-otp', {
            method: 'POST',
            authenticated: true,
            headers: token ? { 'Authorization': `Bearer ${token}` } : {},
            body: JSON.stringify({ email }),
        });
    }

    async verifySecurityOTP(email: string, otp: string, token?: string): Promise<AuthResponse> {
        return this.authRequest('/verify-security-otp', {
            method: 'POST',
            authenticated: true,
            headers: token ? { 'Authorization': `Bearer ${token}` } : {},
            body: JSON.stringify({ email, otp }),
        });
    }

    async deleteAccount(token?: string): Promise<AuthResponse> {
        return apiFetch('/user/delete-account', {
            method: 'DELETE',
            authenticated: !token,
            headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        });
    }

    async newClient(coachId: string, token?: string, invitationToken?: string): Promise<AuthResponse> {
        return apiFetch('/user/new-client', {
            method: 'POST',
            authenticated: !token,
            headers: token ? { 'Authorization': `Bearer ${token}` } : {},
            body: JSON.stringify({ coachId, invitationToken }),
        });
    }
}

export const authService = new AuthService();
