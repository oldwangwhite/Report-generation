import { Button, Card, Form, Input, Radio, Tabs, Typography, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { getDefaultPathByRole, saveLoginSession, type UserRole } from '../../utils/auth';
import './style.css';

const { Title, Text, Paragraph } = Typography;

/** 模拟登录页，后续接后端 /api/auth/login 后按返回 role 跳转。 */
export default function LoginPage() {
    const navigate = useNavigate();
    const [loginForm] = Form.useForm<{ username: string; password: string; role: UserRole }>();
    const [registerForm] = Form.useForm<{ username: string; password: string; confirmPassword: string; role: UserRole }>();

    const handleLogin = async () => {
        const values = await loginForm.validateFields();
        saveLoginSession(values.role, values.username);
        navigate(getDefaultPathByRole(values.role), { replace: true });
    };

    const handleRegister = async () => {
        const values = await registerForm.validateFields();
        if (values.password !== values.confirmPassword) {
            message.warning('两次输入的密码不一致');
            return;
        }
        saveLoginSession(values.role, values.username);
        message.success('注册成功，已自动登录');
        navigate(getDefaultPathByRole(values.role), { replace: true });
    };

    return (
        <main className="login-page">
            <section className="login-panel">
                <Text type="secondary">技术监督辅助平台</Text>
                <Title level={2}>登录系统</Title>
                <Paragraph>当前为前端 mock 登录，后端完成后替换为真实注册/登录接口，并根据返回 role 跳转。</Paragraph>
                <Card>
                    <Tabs
                        items={[
                            {
                                key: 'login',
                                label: '登录',
                                children: (
                                    <Form
                                        form={loginForm}
                                        layout="vertical"
                                        initialValues={{ username: 'test_user', password: '123456', role: 'user' }}
                                    >
                                        <Form.Item name="username" label="账号" rules={[{ required: true }]}>
                                            <Input />
                                        </Form.Item>
                                        <Form.Item name="password" label="密码" rules={[{ required: true }]}>
                                            <Input.Password />
                                        </Form.Item>
                                        <Form.Item name="role" label="登录角色" rules={[{ required: true }]}>
                                            <Radio.Group>
                                                <Radio value="user">普通用户</Radio>
                                                <Radio value="admin">管理员</Radio>
                                                <Radio value="super_admin">超级管理员</Radio>
                                            </Radio.Group>
                                        </Form.Item>
                                        <Button type="primary" block onClick={handleLogin}>
                                            登录
                                        </Button>
                                    </Form>
                                ),
                            },
                            {
                                key: 'register',
                                label: '注册',
                                children: (
                                    <Form
                                        form={registerForm}
                                        layout="vertical"
                                        initialValues={{ username: 'new_user', role: 'user' }}
                                    >
                                        <Form.Item name="username" label="账号" rules={[{ required: true }]}>
                                            <Input />
                                        </Form.Item>
                                        <Form.Item name="password" label="密码" rules={[{ required: true }]}>
                                            <Input.Password />
                                        </Form.Item>
                                        <Form.Item name="confirmPassword" label="确认密码" rules={[{ required: true }]}>
                                            <Input.Password />
                                        </Form.Item>
                                        <Form.Item name="role" label="注册角色" rules={[{ required: true }]}>
                                            <Radio.Group>
                                                <Radio value="user">普通用户</Radio>
                                                <Radio value="admin">管理员</Radio>
                                                <Radio value="super_admin">超级管理员</Radio>
                                            </Radio.Group>
                                        </Form.Item>
                                        <Button type="primary" block onClick={handleRegister}>
                                            注册并进入
                                        </Button>
                                    </Form>
                                ),
                            },
                        ]}
                    />
                </Card>
            </section>
        </main>
    );
}


