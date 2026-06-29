export type UserRole = 'user' | 'admin' | 'super_admin';

const ROLE_STORAGE_KEY = 'report_system_role';
const TOKEN_STORAGE_KEY = 'report_system_token';
const USERNAME_STORAGE_KEY = 'report_system_username';

export function normalizeUserRole(role: string | null | undefined): UserRole {
    if (role === 'admin' || role === 'super_admin' || role === 'superAdmin') {
        return role === 'superAdmin' ? 'super_admin' : role;
    }

    return 'user';
}

export function getTokenByRole(role: UserRole) {
    if (role === 'super_admin') return 'super-token';
    if (role === 'admin') return 'admin-token';
    return 'user-token';
}

export function saveLoginSession(role: UserRole, username: string, token = getTokenByRole(role)) {
    localStorage.setItem(ROLE_STORAGE_KEY, role);
    localStorage.setItem(USERNAME_STORAGE_KEY, username);
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    localStorage.setItem('accessToken', token);
    localStorage.setItem('token', token);
}

export function getUserRole(): UserRole {
    return normalizeUserRole(localStorage.getItem(ROLE_STORAGE_KEY));
}

export function isAdminRole(role = getUserRole()) {
    return role === 'admin' || role === 'super_admin';
}

export function isSuperAdminRole(role = getUserRole()) {
    return role === 'super_admin';
}

export function getUsername() {
    return localStorage.getItem(USERNAME_STORAGE_KEY) || 'mock_user';
}

export function getAuthToken() {
    return localStorage.getItem(TOKEN_STORAGE_KEY) || localStorage.getItem('accessToken') || localStorage.getItem('token') || '';
}

export function isLoggedIn() {
    return Boolean(getAuthToken());
}

export function clearLoginSession() {
    localStorage.removeItem(ROLE_STORAGE_KEY);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USERNAME_STORAGE_KEY);
    localStorage.removeItem('accessToken');
    localStorage.removeItem('token');
}

export function getDefaultPathByRole(role: UserRole) {
    return isAdminRole(role) ? '/admin/reports' : '/user/report/generate';
}
