import { Button, Dropdown, Layout, Space } from 'antd';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { getDefaultPathByRole, getUserRole } from '../utils/auth';
import { useAuth } from '../store/useAuth';

const { Header, Content } = Layout;

export default function PublicLayout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    return (
        <Layout className="public-shell">
            <Header className="public-header">
                <Link to="/" className="public-brand">
                    技术监督辅助平台
                </Link>
                <Space>
                    {user ? (
                        <Dropdown
                            menu={{
                                items: [
                                    { key: 'home', label: '进入工作台', onClick: () => navigate(getDefaultPathByRole(getUserRole())) },
                                    { key: 'me', label: user.displayName },
                                    { key: 'logout', label: '退出登录', onClick: logout },
                                ],
                            }}
                        >
                            <Button type="text">{user.displayName}</Button>
                        </Dropdown>
                    ) : (
                        <>
                            <Button type="link" onClick={() => navigate('/login')}>登录</Button>
                            <Button type="primary" onClick={() => navigate('/register')}>注册</Button>
                        </>
                    )}
                </Space>
            </Header>
            <Content>
                <Outlet />
            </Content>
        </Layout>
    );
}
