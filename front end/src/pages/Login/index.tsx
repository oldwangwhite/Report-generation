import {
    IdcardOutlined,
    LockOutlined,
    MailOutlined,
    PhoneOutlined,
    SafetyCertificateOutlined,
    UserOutlined,
} from '@ant-design/icons';
import { Button, Card, Form, Input, Modal, Progress, Radio, Space, Tabs, Typography, message } from 'antd';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    forgotReset,
    forgotVerify,
    login,
    loginByEmail,
    loginByPhone,
    register,
    sendEmailCode,
    sendPhoneCode,
} from '../../api/auth';
import SlideCaptcha from '../../components/SlideCaptcha';
import { getDefaultPathByRole, normalizeUserRole } from '../../utils/auth';
import { useAuth } from '../../store/useAuth';
import './style.css';

const { Text } = Typography;

type LoginMode = 'password' | 'email' | 'phone';
type ForgotStep = 'select' | 'reset';

export default function LoginPage() {
    const [form] = Form.useForm();
    const [emailRegisterForm] = Form.useForm();
    const [phoneRegisterForm] = Form.useForm();
    const [forgotPasswordForm] = Form.useForm();
    const { login: authLogin } = useAuth();
    const navigate = useNavigate();

    const [loginMode, setLoginMode] = useState<LoginMode>('password');
    const [captchaId, setCaptchaId] = useState('');
    const [captchaVerified, setCaptchaVerified] = useState(false);
    const [slideModalVisible, setSlideModalVisible] = useState(false);
    const [sendEmailLoading, setSendEmailLoading] = useState(false);
    const [emailCountdown, setEmailCountdown] = useState(0);
    const [sendPhoneLoading, setSendPhoneLoading] = useState(false);
    const [phoneCountdown, setPhoneCountdown] = useState(0);
    const [showEmailRegisterModal, setShowEmailRegisterModal] = useState(false);
    const [showPhoneRegisterModal, setShowPhoneRegisterModal] = useState(false);
    const [registerEmail, setRegisterEmail] = useState('');
    const [registerEmailCode, setRegisterEmailCode] = useState('');
    const [registerPhone, setRegisterPhone] = useState('');
    const [registerPhoneCode, setRegisterPhoneCode] = useState('');
    const [regPasswordStrength, setRegPasswordStrength] = useState(0);
    const [regShowRequirements, setRegShowRequirements] = useState(false);
    const [regShowLengthError, setRegShowLengthError] = useState(false);
    const [forgotModalVisible, setForgotModalVisible] = useState(false);
    const [forgotStep, setForgotStep] = useState<ForgotStep>('select');
    const [forgotVerifyType, setForgotVerifyType] = useState<'phone' | 'email'>('phone');
    const [forgotContact, setForgotContact] = useState('');
    const [forgotCode, setForgotCode] = useState('');
    const [forgotCountdown, setForgotCountdown] = useState(0);
    const [forgotLoading, setForgotLoading] = useState(false);
    const [forgotToken, setForgotToken] = useState('');
    const [forgotUsername, setForgotUsername] = useState('');
    const [forgotContactDisplay, setForgotContactDisplay] = useState('');
    const [forgotPasswordStrength, setForgotPasswordStrength] = useState(0);
    const [forgotShowRequirements, setForgotShowRequirements] = useState(false);
    const [forgotShowLengthError, setForgotShowLengthError] = useState(false);

    useEffect(() => {
        form.resetFields();
        setCaptchaVerified(false);
        setCaptchaId('');
        setEmailCountdown(0);
        setPhoneCountdown(0);
    }, [form, loginMode]);

    const enterSystem = (token: string, user: { role: string; username: string }) => {
        const role = normalizeUserRole(user.role);
        authLogin(token, user as any);
        navigate(getDefaultPathByRole(role), { replace: true });
    };

    const countdown = (setter: (value: number) => void) => {
        let count = 60;
        setter(count);
        const timer = window.setInterval(() => {
            count -= 1;
            setter(count);
            if (count <= 0) window.clearInterval(timer);
        }, 1000);
    };

    const handleSendEmailCode = async () => {
        const email = form.getFieldValue('email');
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            message.warning('请输入有效邮箱');
            return;
        }
        setSendEmailLoading(true);
        try {
            await sendEmailCode(email);
            message.success('验证码已发送');
            countdown(setEmailCountdown);
        } catch (error) {
            message.error(error instanceof Error ? error.message : '发送失败');
        } finally {
            setSendEmailLoading(false);
        }
    };

    const handleSendPhoneCode = async () => {
        const phone = form.getFieldValue('phone');
        if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
            message.warning('请输入有效手机号');
            return;
        }
        setSendPhoneLoading(true);
        try {
            await sendPhoneCode(phone);
            message.success('验证码已发送');
            countdown(setPhoneCountdown);
        } catch (error) {
            message.error(error instanceof Error ? error.message : '发送失败');
        } finally {
            setSendPhoneLoading(false);
        }
    };

    const onFinish = async (values: any) => {
        try {
            if (loginMode === 'password') {
                if (!captchaVerified) {
                    message.warning('请先完成滑块验证');
                    return;
                }
                const result = await login({ username: values.username, password: values.password, captchaId });
                enterSystem(result.accessToken, result.user);
                message.success('登录成功');
                return;
            }

            if (loginMode === 'email') {
                const result = await loginByEmail({ email: values.email, code: values.emailCode });
                enterSystem(result.accessToken, result.user);
                message.success('登录成功');
                return;
            }

            const result = await loginByPhone(values.phone, values.phoneCode);
            enterSystem(result.accessToken, result.user);
            message.success('登录成功');
        } catch (error) {
            const messageText = error instanceof Error ? error.message : '登录失败';
            if (loginMode === 'email' && messageText.includes('未注册')) {
                setRegisterEmail(values.email);
                setRegisterEmailCode(values.emailCode);
                emailRegisterForm.resetFields();
                setShowEmailRegisterModal(true);
                return;
            }
            if (loginMode === 'phone' && messageText.includes('未注册')) {
                setRegisterPhone(values.phone);
                setRegisterPhoneCode(values.phoneCode);
                phoneRegisterForm.resetFields();
                setShowPhoneRegisterModal(true);
                return;
            }
            message.error(messageText);
        }
    };

    const evaluatePassword = (
        value: string,
        setStrength: (value: number) => void,
        setRequirements: (value: boolean) => void,
        setLengthError: (value: boolean) => void,
    ) => {
        if (!value) {
            setStrength(0);
            setRequirements(false);
            setLengthError(false);
            return;
        }
        if (value.length < 8 || value.length > 30) {
            setStrength(0);
            setRequirements(false);
            setLengthError(true);
            return;
        }
        const categories = [
            /[A-Z]/.test(value),
            /[a-z]/.test(value),
            /[0-9]/.test(value),
            /[^A-Za-z0-9]/.test(value),
        ].filter(Boolean).length;
        setStrength(Math.min(100, 25 + categories * 25));
        setRequirements(categories < 3);
        setLengthError(false);
    };

    const onEmailRegisterFinish = async (values: any) => {
        try {
            const result = await register({
                username: values.regUsername,
                password: values.regPassword,
                email: registerEmail,
                phone: values.regPhone || '',
                displayName: values.regDisplayName,
                captchaCode: registerEmailCode,
                fromEmailLogin: true,
            });
            authLogin(result.accessToken, result.user);
            setShowEmailRegisterModal(false);
            navigate(getDefaultPathByRole(normalizeUserRole(result.user.role)), { replace: true });
            message.success('注册成功');
        } catch (error) {
            message.error(error instanceof Error ? error.message : '注册失败');
        }
    };

    const onPhoneRegisterFinish = async (values: any) => {
        try {
            const result = await register({
                username: values.regUsername,
                password: values.regPassword,
                phone: registerPhone,
                email: values.regEmail || '',
                displayName: values.regDisplayName,
                captchaCode: registerPhoneCode,
                fromPhoneLogin: true,
            });
            authLogin(result.accessToken, result.user);
            setShowPhoneRegisterModal(false);
            navigate(getDefaultPathByRole(normalizeUserRole(result.user.role)), { replace: true });
            message.success('注册成功');
        } catch (error) {
            message.error(error instanceof Error ? error.message : '注册失败');
        }
    };

    const openForgotModal = () => {
        setForgotStep('select');
        setForgotModalVisible(true);
        setForgotVerifyType('phone');
        setForgotContact('');
        setForgotCode('');
        setForgotCountdown(0);
        setForgotToken('');
        setForgotUsername('');
        setForgotContactDisplay('');
        forgotPasswordForm.resetFields();
    };

    const handleSendForgotCode = async () => {
        if (forgotVerifyType === 'phone' && !/^1[3-9]\d{9}$/.test(forgotContact)) {
            message.warning('请输入有效手机号');
            return;
        }
        if (forgotVerifyType === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotContact)) {
            message.warning('请输入有效邮箱');
            return;
        }
        setForgotLoading(true);
        try {
            forgotVerifyType === 'phone'
                ? await sendPhoneCode(forgotContact)
                : await sendEmailCode(forgotContact);
            countdown(setForgotCountdown);
            message.success('验证码已发送');
        } catch (error) {
            message.error(error instanceof Error ? error.message : '发送失败');
        } finally {
            setForgotLoading(false);
        }
    };

    const handleForgotVerify = async () => {
        if (!forgotCode) {
            message.warning('请输入验证码');
            return;
        }
        try {
            const result = await forgotVerify(forgotContact, forgotCode);
            setForgotToken(result.token);
            setForgotUsername(result.username);
            setForgotContactDisplay(forgotVerifyType === 'phone' ? result.phone || '' : result.email || '');
            setForgotStep('reset');
        } catch (error) {
            message.error(error instanceof Error ? error.message : '验证失败');
        }
    };

    const handleForgotReset = async (values: any) => {
        if (values.newPassword !== values.confirmPassword) {
            message.error('两次密码不一致');
            return;
        }
        try {
            await forgotReset(forgotToken, values.newPassword);
            message.success('密码重置成功，请使用新密码登录');
            setForgotModalVisible(false);
        } catch (error) {
            message.error(error instanceof Error ? error.message : '重置失败');
        }
    };

    return (
        <div className="auth-page">
            <Card title="用户登录" className="auth-card">
                <Form form={form} onFinish={onFinish} size="large">
                    <Tabs
                        activeKey={loginMode}
                        onChange={(key) => setLoginMode(key as LoginMode)}
                        centered
                        items={[
                            { key: 'password', label: '密码登录' },
                            { key: 'email', label: '邮箱登录' },
                            { key: 'phone', label: '手机号登录' },
                        ]}
                    />

                    {loginMode === 'password' && (
                        <>
                            <Form.Item name="username" rules={[{ required: true, message: '请输入用户名/手机号/邮箱' }]}>
                                <Input prefix={<UserOutlined />} placeholder="用户名 / 手机号 / 邮箱" />
                            </Form.Item>
                            <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
                                <Input.Password prefix={<LockOutlined />} placeholder="密码" />
                            </Form.Item>
                            <Form.Item>
                                <Button
                                    icon={<SafetyCertificateOutlined />}
                                    block
                                    onClick={() => setSlideModalVisible(true)}
                                    disabled={captchaVerified}
                                    className={captchaVerified ? 'captcha-ok' : ''}
                                >
                                    {captchaVerified ? '验证成功' : '点击进行滑块验证'}
                                </Button>
                            </Form.Item>
                        </>
                    )}

                    {loginMode === 'email' && (
                        <>
                            <Form.Item name="email" rules={[{ required: true, type: 'email', message: '请输入有效邮箱' }]}>
                                <Input prefix={<MailOutlined />} placeholder="邮箱地址" />
                            </Form.Item>
                            <Form.Item name="emailCode" rules={[{ required: true, message: '请输入邮箱验证码' }]}>
                                <Space.Compact style={{ width: '100%' }}>
                                    <Input placeholder="邮箱验证码" />
                                    <Button type="primary" onClick={handleSendEmailCode} loading={sendEmailLoading} disabled={emailCountdown > 0}>
                                        {emailCountdown > 0 ? `${emailCountdown}s` : '获取验证码'}
                                    </Button>
                                </Space.Compact>
                            </Form.Item>
                        </>
                    )}

                    {loginMode === 'phone' && (
                        <>
                            <Form.Item name="phone" rules={[{ required: true, pattern: /^1[3-9]\d{9}$/, message: '请输入有效手机号' }]}>
                                <Input prefix={<PhoneOutlined />} placeholder="手机号" />
                            </Form.Item>
                            <Form.Item name="phoneCode" rules={[{ required: true, message: '请输入短信验证码' }]}>
                                <Space.Compact style={{ width: '100%' }}>
                                    <Input placeholder="短信验证码" />
                                    <Button type="primary" onClick={handleSendPhoneCode} loading={sendPhoneLoading} disabled={phoneCountdown > 0}>
                                        {phoneCountdown > 0 ? `${phoneCountdown}s` : '获取验证码'}
                                    </Button>
                                </Space.Compact>
                            </Form.Item>
                        </>
                    )}

                    <Form.Item>
                        <div className="auth-links">
                            <Link to="/register">注册账号</Link>
                            {loginMode === 'password' && <button type="button" onClick={openForgotModal}>忘记密码？</button>}
                        </div>
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary" htmlType="submit" block>登录</Button>
                    </Form.Item>
                </Form>
            </Card>

            <Modal title="安全验证" open={slideModalVisible} onCancel={() => setSlideModalVisible(false)} footer={null} width={360} destroyOnHidden>
                {slideModalVisible && (
                    <SlideCaptcha
                        onVerified={(id) => {
                            setCaptchaId(id);
                            setCaptchaVerified(true);
                            setSlideModalVisible(false);
                        }}
                    />
                )}
            </Modal>

            <QuickRegisterModal
                open={showEmailRegisterModal}
                title="注册新账号"
                contactLabel="邮箱"
                contactValue={registerEmail}
                form={emailRegisterForm}
                onCancel={() => setShowEmailRegisterModal(false)}
                onFinish={onEmailRegisterFinish}
                onPasswordChange={(value) => evaluatePassword(value, setRegPasswordStrength, setRegShowRequirements, setRegShowLengthError)}
                passwordStrength={regPasswordStrength}
                showRequirements={regShowRequirements}
                showLengthError={regShowLengthError}
                extraField="phone"
            />
            <QuickRegisterModal
                open={showPhoneRegisterModal}
                title="注册新账号"
                contactLabel="手机号"
                contactValue={registerPhone}
                form={phoneRegisterForm}
                onCancel={() => setShowPhoneRegisterModal(false)}
                onFinish={onPhoneRegisterFinish}
                onPasswordChange={(value) => evaluatePassword(value, setRegPasswordStrength, setRegShowRequirements, setRegShowLengthError)}
                passwordStrength={regPasswordStrength}
                showRequirements={regShowRequirements}
                showLengthError={regShowLengthError}
                extraField="email"
            />

            <Modal title="找回密码" open={forgotModalVisible} onCancel={() => setForgotModalVisible(false)} footer={null} width={460} destroyOnHidden>
                {forgotStep === 'select' ? (
                    <div>
                        <Text>请选择验证方式</Text>
                        <Radio.Group value={forgotVerifyType} onChange={(event) => setForgotVerifyType(event.target.value)} className="forgot-switch">
                            <Radio.Button value="phone">手机验证</Radio.Button>
                            <Radio.Button value="email">邮箱验证</Radio.Button>
                        </Radio.Group>
                        <Input
                            placeholder={forgotVerifyType === 'phone' ? '请输入手机号' : '请输入邮箱'}
                            value={forgotContact}
                            onChange={(event) => setForgotContact(event.target.value)}
                            className="forgot-input"
                        />
                        <Space.Compact style={{ width: '100%' }}>
                            <Input placeholder="验证码" value={forgotCode} onChange={(event) => setForgotCode(event.target.value)} />
                            <Button type="primary" onClick={handleSendForgotCode} loading={forgotLoading} disabled={forgotCountdown > 0}>
                                {forgotCountdown > 0 ? `${forgotCountdown}s` : '获取验证码'}
                            </Button>
                        </Space.Compact>
                        <Button type="primary" block className="forgot-next" onClick={handleForgotVerify} disabled={!forgotCode}>下一步</Button>
                    </div>
                ) : (
                    <div>
                        <p>用户名：<strong>{forgotUsername}</strong></p>
                        <p>绑定{forgotVerifyType === 'phone' ? '手机' : '邮箱'}：{forgotContactDisplay}</p>
                        <Form form={forgotPasswordForm} onFinish={handleForgotReset} size="large">
                            <Form.Item name="newPassword" rules={[{ required: true, message: '请输入新密码' }]}>
                                <Input.Password
                                    prefix={<LockOutlined />}
                                    placeholder="新密码"
                                    onChange={(event) => evaluatePassword(
                                        event.target.value,
                                        setForgotPasswordStrength,
                                        setForgotShowRequirements,
                                        setForgotShowLengthError,
                                    )}
                                />
                            </Form.Item>
                            <PasswordTips strength={forgotPasswordStrength} showLengthError={forgotShowLengthError} showRequirements={forgotShowRequirements} />
                            <Form.Item name="confirmPassword" rules={[{ required: true, message: '请确认密码' }]}>
                                <Input.Password prefix={<LockOutlined />} placeholder="确认密码" />
                            </Form.Item>
                            <Button type="primary" htmlType="submit" block>重置密码</Button>
                        </Form>
                    </div>
                )}
            </Modal>
        </div>
    );
}

function PasswordTips({ strength, showLengthError, showRequirements }: { strength: number; showLengthError: boolean; showRequirements: boolean }) {
    if (showLengthError) {
        return <div className="auth-error">密码长度须在 <strong>8-30 位</strong>之间</div>;
    }
    if (!showRequirements) return null;
    return (
        <div className="password-tips">
            <Progress percent={strength} showInfo={false} strokeColor="#ff4d4f" />
            <div>至少满足<strong>大写、小写、数字、特殊符号</strong>中的<strong>三种</strong></div>
        </div>
    );
}

function QuickRegisterModal(props: {
    open: boolean;
    title: string;
    contactLabel: string;
    contactValue: string;
    form: any;
    onCancel: () => void;
    onFinish: (values: any) => void;
    onPasswordChange: (value: string) => void;
    passwordStrength: number;
    showRequirements: boolean;
    showLengthError: boolean;
    extraField: 'phone' | 'email';
}) {
    return (
        <Modal title={props.title} open={props.open} onCancel={props.onCancel} footer={null} width={460} destroyOnHidden={false} forceRender>
            <Form form={props.form} onFinish={props.onFinish} size="large">
                <Form.Item label={props.contactLabel} required>
                    <Input value={props.contactValue} disabled />
                </Form.Item>
                <Form.Item name="regUsername" rules={[{ required: true, message: '请输入用户名' }]}>
                    <Input prefix={<UserOutlined />} placeholder="用户名" />
                </Form.Item>
                {props.extraField === 'phone' ? (
                    <Form.Item name="regPhone" rules={[{ pattern: /^1[3-9]\d{9}$/, message: '请输入有效手机号' }]}>
                        <Input prefix={<PhoneOutlined />} placeholder="手机号（可选）" />
                    </Form.Item>
                ) : (
                    <Form.Item name="regEmail" rules={[{ type: 'email', message: '请输入有效邮箱' }]}>
                        <Input prefix={<MailOutlined />} placeholder="邮箱（可选）" />
                    </Form.Item>
                )}
                <Form.Item name="regDisplayName">
                    <Input prefix={<IdcardOutlined />} placeholder="显示名称（可选）" />
                </Form.Item>
                <Form.Item name="regPassword" rules={[{ required: true, message: '请输入密码' }]}>
                    <Input.Password prefix={<LockOutlined />} placeholder="密码" onChange={(event) => props.onPasswordChange(event.target.value)} />
                </Form.Item>
                <PasswordTips strength={props.passwordStrength} showLengthError={props.showLengthError} showRequirements={props.showRequirements} />
                <Form.Item
                    name="regConfirm"
                    dependencies={['regPassword']}
                    rules={[
                        { required: true, message: '请确认密码' },
                        ({ getFieldValue }) => ({
                            validator(_, value) {
                                if (!value || getFieldValue('regPassword') === value) return Promise.resolve();
                                return Promise.reject(new Error('两次密码不一致'));
                            },
                        }),
                    ]}
                >
                    <Input.Password prefix={<LockOutlined />} placeholder="确认密码" />
                </Form.Item>
                <Button type="primary" htmlType="submit" block>注册并登录</Button>
            </Form>
        </Modal>
    );
}
