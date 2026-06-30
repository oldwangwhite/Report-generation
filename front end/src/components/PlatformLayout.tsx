import {
    AppstoreOutlined,
    BookOutlined,
    ControlOutlined,
    FileProtectOutlined,
    FileTextOutlined,
    SafetyCertificateOutlined,
    SettingOutlined,
    TeamOutlined,
} from '@ant-design/icons';
import { Button, Layout, Menu, Space, Tag, Typography } from 'antd';
import type { MenuProps } from 'antd';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
    clearLoginSession,
    getUserRole,
    getUsername,
    isAdminRole,
    isSuperAdminRole,
    type UserRole,
} from '../utils/auth';
import './PlatformLayout.css';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

const USER_PATHS = ['/user/dashboard', '/user/report/generate', '/user/reports'];
const ADMIN_REPORT_PATHS = ['/admin/reports', '/admin/templates', '/admin/materials', '/admin/model'];
const SUPER_ADMIN_PATHS = ['/admin/system-config', '/admin/admin-users', '/admin/resources'];

const USER_MENU_ITEMS: MenuProps['items'] = [
    { key: '/user/dashboard', icon: <AppstoreOutlined />, label: '用户首页' },
    { key: '/user/report/generate', icon: <FileTextOutlined />, label: '报告生成' },
    { key: '/user/reports', icon: <FileTextOutlined />, label: '我的报告' },
];

function getAdminMenuItems(role: UserRole): MenuProps['items'] {
    const baseItems: MenuProps['items'] = [
        { key: '/admin/dashboard', icon: <AppstoreOutlined />, label: '管理首页' },
        {
            key: 'admin-report-management',
            icon: <SettingOutlined />,
            label: '报告管理',
            children: [
                { key: '/admin/reports', icon: <FileTextOutlined />, label: '报告记录' },
                { key: '/admin/templates', icon: <FileProtectOutlined />, label: '模板管理' },
                { key: '/admin/materials', icon: <BookOutlined />, label: '素材管理' },
                { key: '/admin/model', icon: <ControlOutlined />, label: '模型配置' },
            ],
        },
    ];

    if (!isSuperAdminRole(role)) return baseItems;

    return [
        ...baseItems,
        {
            key: 'super-admin-system-management',
            icon: <SafetyCertificateOutlined />,
            label: '系统管理',
            children: [
                { key: '/admin/system-config', icon: <SettingOutlined />, label: '系统关键配置' },
                { key: '/admin/admin-users', icon: <TeamOutlined />, label: '管理员权限' },
                { key: '/admin/resources', icon: <SafetyCertificateOutlined />, label: '关键资源管理' },
            ],
        },
    ];
}

function getSelectedMenuKey(role: UserRole, currentPath: string) {
    if (isAdminRole(role)) {
        const adminPaths = ['/admin/dashboard', ...ADMIN_REPORT_PATHS];
        const allowedPaths = isSuperAdminRole(role) ? [...adminPaths, ...SUPER_ADMIN_PATHS] : adminPaths;
        return allowedPaths.includes(currentPath) ? currentPath : '/admin/dashboard';
    }

    return USER_PATHS.includes(currentPath) ? currentPath : '/user/report/generate';
}

function getDefaultOpenKeys(role: UserRole, currentPath: string) {
    if (!isAdminRole(role)) return [];
    if (ADMIN_REPORT_PATHS.includes(currentPath)) return ['admin-report-management'];
    if (isSuperAdminRole(role) && SUPER_ADMIN_PATHS.includes(currentPath)) return ['super-admin-system-management'];
    return [];
}

function getRoleLabel(role: UserRole) {
    if (role === 'super_admin') return '超级管理员';
    if (role === 'admin') return '管理员';
    return '普通用户';
}

function getRoleDescription(role: UserRole) {
    if (role === 'super_admin') return '维护系统关键配置、管理员权限和关键资源';
    if (role === 'admin') return '维护报告记录、模板、素材和模型配置';
    return '创建报告、生成内容、预览导出和查看个人记录';
}

const PAGE_TITLE_MAP: Record<string, string> = {
    '/user/dashboard': '用户首页',
    '/user/report/generate': '报告生成工作台',
    '/user/reports': '我的报告',
    '/admin/dashboard': '管理首页',
    '/admin/report/generate': '报告生成工作台',
    '/admin/my-reports': '我的报告',
    '/admin/reports': '报告记录管理',
    '/admin/templates': '模板管理',
    '/admin/materials': '素材管理',
    '/admin/model': '模型配置',
    '/admin/system-config': '系统关键配置',
    '/admin/admin-users': '管理员权限管理',
    '/admin/resources': '关键资源管理',
};

/** 技术监督辅助平台公共布局，承载各业务模块入口。 */
export default function PlatformLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    const currentPath = location.pathname;
    const role = getUserRole();
    const menuItems = isAdminRole(role) ? getAdminMenuItems(role) : USER_MENU_ITEMS;
    const selectedKey = getSelectedMenuKey(role, currentPath);
    const defaultOpenKeys = getDefaultOpenKeys(role, currentPath);
    const username = getUsername();

    const handleLogout = () => {
        clearLoginSession();
        navigate('/login', { replace: true });
    };

    return (
        <Layout className="platform-shell">
            <Sider width={248} className="platform-sidebar">
                <div className="platform-brand">
                    <div className="brand-mark">监</div>
                    <div>
                        <strong>技术监督辅助平台</strong>
                        <span>Supervision AI Platform</span>
                    </div>
                </div>
                <Menu
                    className="platform-menu"
                    mode="inline"
                    selectedKeys={[selectedKey]}
                    defaultOpenKeys={defaultOpenKeys}
                    items={menuItems}
                    onClick={({ key }) => navigate(key)}
                />
                <div className="sidebar-summary">
                    <Text type="secondary">当前角色</Text>
                    <strong>{getRoleLabel(role)}</strong>
                    <span>{getRoleDescription(role)}</span>
                </div>
            </Sider>

            <Layout className="platform-main">
                <Header className="platform-header">
                    <div>
                        <Text type="secondary">
                            {isAdminRole(role) ? '管理端 / 技术监督辅助平台' : '普通用户端 / 技术监督辅助平台'}
                        </Text>
                        <h1>{PAGE_TITLE_MAP[currentPath] || '报告生成工作台'}</h1>
                    </div>
                    <Space>
                        <Tag color={isSuperAdminRole(role) ? 'purple' : isAdminRole(role) ? 'red' : 'blue'}>
                            {getRoleLabel(role)}
                        </Tag>
                        <Tag color="default">{username}</Tag>
                        <Tag color="blue">Mock 联调</Tag>
                        <Button size="small" onClick={handleLogout}>
                            退出登录
                        </Button>
                    </Space>
                </Header>
                <Content>
                    <Outlet />
                </Content>
            </Layout>
        </Layout>
    );
}
