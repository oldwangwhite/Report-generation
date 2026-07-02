import { requestJson } from './request';

export type AuthUser = {
    userId: string;
    username: string;
    role: 'user' | 'admin' | 'super_admin';
    displayName: string;
    email?: string | null;
    phone?: string | null;
};

export type AuthResult = {
    accessToken: string;
    expiresIn: number;
    user: AuthUser;
};

export type LoginPayload = {
    username: string;
    password: string;
    captchaId?: string;
};

export type EmailLoginPayload = {
    email: string;
    code: string;
};

export type RegisterPayload = {
    username: string;
    password: string;
    captchaId?: string;
    captchaCode?: string;
    email?: string;
    phone?: string;
    displayName?: string;
    fromEmailLogin?: boolean;
    fromPhoneLogin?: boolean;
};

export function login(payload: LoginPayload) {
    return requestJson<AuthResult>('/api/auth/login', {
        method: 'POST',
        data: payload,
    });
}

export function register(payload: RegisterPayload) {
    return requestJson<AuthResult>('/api/auth/register', {
        method: 'POST',
        data: payload,
    });
}

export function loginByEmail(payload: EmailLoginPayload) {
    return requestJson<AuthResult>('/api/auth/login/email', {
        method: 'POST',
        data: payload,
    });
}

export function loginByPhone(phone: string, code: string) {
    return requestJson<AuthResult>('/api/auth/login/phone', {
        method: 'POST',
        data: { phone, code },
    });
}

export function sendEmailCode(email: string) {
    return requestJson<{ expiresIn?: number } | null>('/api/auth/email/send-code', {
        method: 'POST',
        data: { email },
    });
}

export function sendPhoneCode(phone: string) {
    return requestJson<{ expiresIn?: number } | null>('/api/auth/phone/send-code', {
        method: 'POST',
        data: { phone },
    });
}

export function getSlideCaptcha() {
    return requestJson<{
        captchaId: string;
        bgImage?: string;
        backgroundImage?: string;
        sliderImage: string;
        y: number;
    }>('/api/auth/captcha/slide');
}

export function verifySlideCaptcha(captchaId: string, distance: number) {
    return requestJson<{ valid: boolean }>('/api/auth/captcha/slide/verify', {
        method: 'POST',
        data: { captchaId, distance },
    });
}

export function getCaptcha() {
    return requestJson<{ captchaId: string; captchaImage: string; image?: string }>('/api/auth/captcha');
}

export function forgotVerify(contact: string, code: string) {
    return requestJson<{ token: string; username: string; email?: string | null; phone?: string | null }>(
        '/api/auth/forgot-password/verify',
        {
            method: 'POST',
            data: { contact, code },
        },
    );
}

export function forgotReset(token: string, newPassword: string) {
    return requestJson<null>('/api/auth/forgot-password/reset', {
        method: 'POST',
        data: { token, newPassword },
    });
}

export function getCurrentUser() {
    return requestJson<AuthUser>('/api/auth/me');
}

export function logout() {
    return requestJson<null>('/api/auth/logout', {
        method: 'POST',
    });
}
