import { Layout as AntLayout, Button, Space, Dropdown } from 'antd';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/useAuth';

const { Header, Content } = AntLayout;

const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: '100vh',
      // 去掉 padding: '24px'，让容器直接铺满视口
      backgroundColor: '#f0f2f5',
    }}>
      <div style={{
        width: '100%',
        margin: '0 auto',
        borderRadius: 0,        // 铺满时建议去掉圆角，或者保留 8 看你喜好
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        border: '1px solid #e8e8e8',
        backgroundColor: '#fff',
      }}>
        <AntLayout style={{ minHeight: '100vh' }}>  {/* 同步调整为 100vh */}
          <Header style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#fff',
            boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
            padding: '0 24px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <Link to="/" style={{ fontSize: 18, fontWeight: 600, color: '#1890ff' }}>
                ⚡ 技术监督辅助平台
              </Link>
            </div>
            <Space>
              {user ? (
                <Dropdown
                  menu={{
                    items: [
                      { key: 'me', label: user.displayName },
                      { key: 'logout', label: '退出登录', onClick: logout },
                    ],
                  }}
                >
                  <Button type="text">{user.displayName}</Button>
                </Dropdown>
              ) : (
                <Space>
                  <Button type="link" onClick={() => navigate('/login')}>登录</Button>
                  <Button type="primary" onClick={() => navigate('/register')}>注册</Button>
                </Space>
              )}
            </Space>
          </Header>
          <Content style={{ padding: '24px' }}>
            <Outlet />
          </Content>
        </AntLayout>
      </div>
    </div>
  );
};

export default Layout;