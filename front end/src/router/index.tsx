import { Navigate, Route, Routes } from 'react-router-dom';
import PlatformLayout from '../layouts/PlatformLayout';
import LoginPage from '../pages/Login';
import MyReportsPage from '../pages/MyReports';
import ReportManagementPage from '../pages/ReportManagement';
import ReportGenerationPage from '../pages/ReportGeneration';
import SystemPlaceholderPage, { DashboardPage } from '../pages/SystemPlaceholder';
import UserManagementPage from '../pages/UserManagement';
import {
    getDefaultPathByRole,
    getUserRole,
    isAdminRole,
    isLoggedIn,
    isSuperAdminRole,
} from '../utils/auth';

function RoleRedirect() {
    if (!isLoggedIn()) return <Navigate to="/login" replace />;
    return <Navigate to={getDefaultPathByRole(getUserRole())} replace />;
}

function ProtectedLayout() {
    if (!isLoggedIn()) return <Navigate to="/login" replace />;
    return <PlatformLayout />;
}

function AdminOnly({ children }: { children: JSX.Element }) {
    if (!isLoggedIn()) return <Navigate to="/login" replace />;
    if (!isAdminRole()) return <Navigate to="/user/report/generate" replace />;
    return children;
}

function SuperAdminOnly({ children }: { children: JSX.Element }) {
    if (!isLoggedIn()) return <Navigate to="/login" replace />;
    if (!isSuperAdminRole()) return <Navigate to="/admin/dashboard" replace />;
    return children;
}

export default function AppRouter() {
    return (
        <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedLayout />}>
                <Route path="/user/dashboard" element={<DashboardPage role="user" />} />
                <Route path="/user/report/generate" element={<ReportGenerationPage />} />
                <Route path="/user/reports" element={<MyReportsPage />} />

                <Route path="/admin/dashboard" element={<AdminOnly><DashboardPage role="admin" /></AdminOnly>} />
                <Route path="/admin/report/generate" element={<AdminOnly><ReportGenerationPage /></AdminOnly>} />
                <Route path="/admin/my-reports" element={<AdminOnly><MyReportsPage /></AdminOnly>} />
                <Route path="/admin/reports" element={<AdminOnly><ReportManagementPage /></AdminOnly>} />
                <Route path="/admin/templates" element={<AdminOnly><ReportManagementPage /></AdminOnly>} />
                <Route path="/admin/materials" element={<AdminOnly><ReportManagementPage /></AdminOnly>} />
                <Route path="/admin/model" element={<AdminOnly><ReportManagementPage /></AdminOnly>} />
                <Route
                    path="/admin/system-config"
                    element={
                        <SuperAdminOnly>
                            <SystemPlaceholderPage title="系统关键配置" description="超级管理员维护系统级参数、全局安全策略和关键配置开关。" />
                        </SuperAdminOnly>
                    }
                />
                <Route
                    path="/admin/admin-users"
                    element={
                        <SuperAdminOnly>
                            <UserManagementPage />
                        </SuperAdminOnly>
                    }
                />
                <Route
                    path="/admin/resources"
                    element={
                        <SuperAdminOnly>
                            <SystemPlaceholderPage title="关键资源管理" description="超级管理员维护系统关键资源、敏感配置和高权限操作入口。" />
                        </SuperAdminOnly>
                    }
                />

                <Route path="/dashboard" element={<RoleRedirect />} />
                <Route path="/report/generate" element={<Navigate to="/user/report/generate" replace />} />
                <Route path="/report/manage" element={<Navigate to="/admin/reports" replace />} />
                <Route path="*" element={<RoleRedirect />} />
            </Route>
        </Routes>
    );
}
