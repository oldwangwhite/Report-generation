import { getUserRole, getUsername, isLoggedIn, type UserRole } from '../utils/auth';

export type SessionState = {
    isAuthenticated: boolean;
    role: UserRole;
    username: string;
};

export function getSessionSnapshot(): SessionState {
    return {
        isAuthenticated: isLoggedIn(),
        role: getUserRole(),
        username: getUsername(),
    };
}
