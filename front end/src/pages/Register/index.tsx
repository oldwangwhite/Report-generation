import {
    IdcardOutlined,
    LockOutlined,
    MailOutlined,
    PhoneOutlined,
    SafetyCertificateOutlined,
    UserOutlined,
} from '@ant-design/icons';
import { Button, Card, Form, Image, Input, Progress, message } from 'antd';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getCaptcha, register } from '../../api/auth';
import { getDefaultPathByRole, normalizeUserRole } from '../../utils/auth';
import { useAuth } from '../../store/useAuth';
import '../Login/style.css';

export default function RegisterPage() {
    const [form] = Form.useForm();
    const { login: authLogin } = useAuth();
    const navigate = useNavigate();
    const [passwordStrength, setPasswordStrength] = useState(0);
    const [showRequirements, setShowRequirements] = useState(false);
    const [showLengthError, setShowLengthError] = useState(false);
    const [showUsernameError, setShowUsernameError] = useState(false);
    const [captchaData, setCaptchaData] = useState({ captchaId: '', captchaImage: '' });

    const fetchCaptcha = async () => {
        try {
            const data = await getCaptcha();
            setCaptchaData({
                captchaId: data.captchaId,
                captchaImage: data.captchaImage || data.image || '',
            });
            form.setFieldsValue({ captchaId: data.captchaId });
        } catch (error) {
            message.error(error instanceof Error ? error.message : '获取验证码失败');
        }
    };

    useEffect(() => {
        fetchCaptcha();
    }, []);

    const evaluateUsername = (value: string) => {
        setShowUsernameError(Boolean(value) && (value.length < 3 || value.length > 50));
    };

    const evaluatePasswordStrength = (value: string) => {
        if (!value) {
            setPasswordStrength(0);
            setShowRequirements(false);
            setShowLengthError(false);
            return;
        }
        if (value.length < 8 || value.length > 30) {
            setPasswordStrength(0);
            setShowRequirements(false);
            setShowLengthError(true);
            return;
        }
        const categories = [
            /[A-Z]/.test(value),
            /[a-z]/.test(value),
            /[0-9]/.test(value),
            /[^A-Za-z0-9]/.test(value),
        ].filter(Boolean).length;
        setPasswordStrength(Math.min(100, 25 + categories * 25));
        setShowRequirements(categories < 3);
        setShowLengthError(false);
    };

    const onFinish = async (values: any) => {
        try {
            const result = await register({
                username: values.username,
                password: values.password,
                captchaId: values.captchaId,
                captchaCode: values.captchaCode,
                email: values.email,
                phone: values.phone,
                displayName: values.displayName,
            });
            authLogin(result.accessToken, result.user);
            message.success('注册成功');
            navigate(getDefaultPathByRole(normalizeUserRole(result.user.role)), { replace: true });
        } catch (error) {
            message.error(error instanceof Error ? error.message : '注册失败');
            fetchCaptcha();
        }
    };

    return (
        <div className="auth-page">
            <Card title="用户注册" className="auth-card">
                <Form form={form} onFinish={onFinish} size="large">
                    <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }]}>
                        <Input prefix={<UserOutlined />} placeholder="用户名" onChange={(event) => evaluateUsername(event.target.value)} />
                    </Form.Item>
                    {showUsernameError && <div className="auth-error">用户名长度须在 <strong>3-50 位</strong>之间</div>}

                    <Form.Item name="phone" rules={[{ required: true, pattern: /^1[3-9]\d{9}$/, message: '请输入有效手机号' }]}>
                        <Input prefix={<PhoneOutlined />} placeholder="手机号" />
                    </Form.Item>
                    <Form.Item name="email" rules={[{ required: true, type: 'email', message: '请输入有效邮箱' }]}>
                        <Input prefix={<MailOutlined />} placeholder="邮箱" />
                    </Form.Item>
                    <Form.Item name="displayName">
                        <Input prefix={<IdcardOutlined />} placeholder="显示名称（可选）" />
                    </Form.Item>
                    <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
                        <Input.Password prefix={<LockOutlined />} placeholder="密码" onChange={(event) => evaluatePasswordStrength(event.target.value)} />
                    </Form.Item>
                    {showLengthError && <div className="auth-error">密码长度须在 <strong>8-30 位</strong>之间</div>}
                    {showRequirements && (
                        <div className="password-tips">
                            <Progress percent={passwordStrength} showInfo={false} strokeColor="#ff4d4f" />
                            <div>至少满足<strong>大写、小写、数字、特殊符号</strong>中的<strong>三种</strong></div>
                        </div>
                    )}
                    <Form.Item
                        name="confirm"
                        dependencies={['password']}
                        rules={[
                            { required: true, message: '请确认密码' },
                            ({ getFieldValue }) => ({
                                validator(_, value) {
                                    if (!value || getFieldValue('password') === value) return Promise.resolve();
                                    return Promise.reject(new Error('两次密码不一致'));
                                },
                            }),
                        ]}
                    >
                        <Input.Password prefix={<LockOutlined />} placeholder="确认密码" />
                    </Form.Item>

                    <Form.Item>
                        <div className="captcha-row">
                            <Form.Item name="captchaCode" noStyle rules={[{ required: true, message: '请输入验证码' }]}>
                                <Input prefix={<SafetyCertificateOutlined />} placeholder="验证码" />
                            </Form.Item>
                            <Image src={captchaData.captchaImage} preview={false} onClick={fetchCaptcha} alt="验证码" />
                        </div>
                    </Form.Item>
                    <Form.Item name="captchaId" hidden>
                        <Input />
                    </Form.Item>

                    <Button type="primary" htmlType="submit" block>注册</Button>
                    <div className="auth-bottom-link">
                        已有账号？<Link to="/login">立即登录</Link>
                    </div>
                </Form>
            </Card>
        </div>
    );
}
