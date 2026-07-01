import { useState, useEffect } from 'react';
import { Form, Input, Button, Card, message, Progress, Image } from 'antd';
import {
  UserOutlined,
  LockOutlined,
  PhoneOutlined,
  IdcardOutlined,
  SafetyCertificateOutlined,
  MailOutlined,
} from '@ant-design/icons';
import { register, getCaptcha } from '../api/auth';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../store/useAuth';

const Register = () => {
  const [form] = Form.useForm();
  const { login: authLogin } = useAuth();
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [showRequirements, setShowRequirements] = useState(false);
  const [showLengthError, setShowLengthError] = useState(false);
  const [showUsernameError, setShowUsernameError] = useState(false);

  const [captchaData, setCaptchaData] = useState({ captchaId: '', captchaImage: '' });

  const navigate = useNavigate();

  const fetchCaptcha = async () => {
    try {
      const res = await getCaptcha();
      setCaptchaData(res.data);
      form.setFieldsValue({ captchaId: res.data.captchaId });
    } catch {
      message.error('获取验证码失败');
    }
  };

  useEffect(() => {
    fetchCaptcha();
  }, []);

  const evaluateUsername = (value: string) => {
    if (!value) {
      setShowUsernameError(false);
      return;
    }
    setShowUsernameError(value.length < 3 || value.length > 50);
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

    const checks = {
      upper: /[A-Z]/.test(value),
      lower: /[a-z]/.test(value),
      digit: /[0-9]/.test(value),
      special: /[^A-Za-z0-9]/.test(value),
    };

    const categories = [checks.upper, checks.lower, checks.digit, checks.special].filter(Boolean).length;
    let strength = 0;
    strength += 25;
    if (categories >= 1) strength += 25;
    if (categories >= 2) strength += 25;
    if (categories >= 3) strength += 25;
    setPasswordStrength(Math.min(100, strength));

    const isValid = categories >= 3;
    setShowRequirements(!isValid);
    setShowLengthError(false);
  };

  const isFormValid = () => {
    const username = form.getFieldValue('username') || '';
    const password = form.getFieldValue('password') || '';

    if (!username || username.length < 3 || username.length > 50) return false;
    if (!password || password.length < 8 || password.length > 30) return false;

    const checks = {
      upper: /[A-Z]/.test(password),
      lower: /[a-z]/.test(password),
      digit: /[0-9]/.test(password),
      special: /[^A-Za-z0-9]/.test(password),
    };
    const categories = [checks.upper, checks.lower, checks.digit, checks.special].filter(Boolean).length;
    return categories >= 3;
  };

  const onFinish = async (values: any) => {
    if (!isFormValid()) {
      message.error('请检查输入内容是否符合要求');
      return;
    }
    try {
      const res = await register({
        username: values.username,
        password: values.password,
        captchaId: values.captchaId,
        captchaCode: values.captchaCode,
        email: values.email,
        phone: values.phone,
        displayName: values.displayName,
      });
      authLogin(res.data.accessToken, res.data.user);
      message.success('注册成功');
      navigate('/protected', { replace: true });
    } catch (error: any) {
      message.error(error.response?.data?.message || '注册失败');
      if (error.response?.data?.code === 40103) {
        fetchCaptcha();
      }
    }
  };

  return (
    <div style={{ maxWidth: 450, margin: '40px auto' }}>
      <Card title="用户注册">
        <Form form={form} onFinish={onFinish} size="large">
          <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input
              prefix={<UserOutlined />}
              placeholder="用户名"
              onChange={(e) => evaluateUsername(e.target.value)}
            />
          </Form.Item>
          {showUsernameError && (
            <div style={{ color: '#ff4d4f', fontSize: 13, marginBottom: 16 }}>
              用户名长度须在 <strong>3-50 位</strong>之间
            </div>
          )}

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
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="密码"
              onChange={(e) => evaluatePasswordStrength(e.target.value)}
            />
          </Form.Item>
          {showLengthError && (
            <div style={{ color: '#ff4d4f', fontSize: 13, marginBottom: 16 }}>
              密码长度须在 <strong>8-30 位</strong>之间
            </div>
          )}
          {showRequirements && (
            <div style={{ marginBottom: 16 }}>
              <Progress percent={passwordStrength} showInfo={false} strokeColor="#ff4d4f" />
              <div style={{ color: '#ff4d4f', fontSize: 13, marginTop: 4 }}>
                至少满足<strong>大写、小写、数字、特殊符号</strong>中的<strong>三种</strong>
              </div>
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

          {/* 验证码输入框与图片同一行，去掉 label */}
          <Form.Item>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Form.Item
                name="captchaCode"
                noStyle
                rules={[{ required: true, message: '请输入验证码' }]}
              >
                <Input
                  prefix={<SafetyCertificateOutlined />}
                  placeholder="验证码"
                  style={{ flex: 1 }}
                />
              </Form.Item>
              <Image
                src={captchaData.captchaImage}
                preview={false}
                onClick={fetchCaptcha}
                style={{ cursor: 'pointer', height: 40 }}
                alt="验证码"
              />
            </div>
          </Form.Item>
          <Form.Item name="captchaId" hidden>
            <Input />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block disabled={!isFormValid()}>
              注册
            </Button>
          </Form.Item>
          <div style={{ textAlign: 'center' }}>
            已有账号？<Link to="/login">立即登录</Link>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default Register;