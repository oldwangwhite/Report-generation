import { useState, useEffect } from 'react';
import {
  Form, Input, Button, Card, message, Modal, Tabs,
  Progress, Space, Radio
} from 'antd';
import {
  UserOutlined, LockOutlined, SafetyCertificateOutlined,
  MailOutlined, PhoneOutlined, IdcardOutlined
} from '@ant-design/icons';
import {
  login, loginByEmail, sendEmailCode,
  loginByPhone, sendPhoneCode, register,
  forgotVerify, forgotReset
} from '../api/auth';
import { useAuth } from '../store/useAuth';
import { useNavigate, Link } from 'react-router-dom';
import SlideCaptcha from '../components/SlideCaptcha';

const Login = () => {
  const [form] = Form.useForm();
  const { login: authLogin } = useAuth();
  const navigate = useNavigate();

  // 登录模式
  const [loginMode, setLoginMode] = useState<'password' | 'email' | 'phone'>('password');
  const [captchaId, setCaptchaId] = useState('');
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [slideModalVisible, setSlideModalVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [sendEmailLoading, setSendEmailLoading] = useState(false);
  const [emailCountdown, setEmailCountdown] = useState(0);
  const [phone, setPhone] = useState('');
  const [phoneCode, setPhoneCode] = useState('');
  const [sendPhoneLoading, setSendPhoneLoading] = useState(false);
  const [phoneCountdown, setPhoneCountdown] = useState(0);

  // 邮箱快捷注册
  const [showEmailRegisterModal, setShowEmailRegisterModal] = useState(false);
  const [registerEmail, setRegisterEmail] = useState('');
  const [emailRegisterForm] = Form.useForm();

  // 手机快捷注册
  const [showPhoneRegisterModal, setShowPhoneRegisterModal] = useState(false);
  const [registerPhone, setRegisterPhone] = useState('');
  const [phoneRegisterForm] = Form.useForm();

  // 注册表单通用状态
  const [regPasswordStrength, setRegPasswordStrength] = useState(0);
  const [regShowRequirements, setRegShowRequirements] = useState(false);
  const [regShowLengthError, setRegShowLengthError] = useState(false);
  const [regShowUsernameError, setRegShowUsernameError] = useState(false);

  // 忘记密码相关状态
  const [forgotModalVisible, setForgotModalVisible] = useState(false);
  const [forgotStep, setForgotStep] = useState<'select' | 'reset'>('select');
  const [forgotContact, setForgotContact] = useState('');
  const [forgotCode, setForgotCode] = useState('');
  const [forgotCountdown, setForgotCountdown] = useState(0);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotToken, setForgotToken] = useState('');
  const [forgotUsername, setForgotUsername] = useState('');
  const [forgotContactDisplay, setForgotContactDisplay] = useState('');
  const [forgotVerifyType, setForgotVerifyType] = useState<'phone' | 'email'>('phone');
  const [forgotPasswordForm] = Form.useForm();
  const [forgotPasswordStrength, setForgotPasswordStrength] = useState(0);
  const [forgotShowRequirements, setForgotShowRequirements] = useState(false);
  const [forgotShowLengthError, setForgotShowLengthError] = useState(false);

  // 切换登录模式时重置
  useEffect(() => {
    form.resetFields();
    setCaptchaVerified(false);
    setCaptchaId('');
    setEmail('');
    setEmailCode('');
    setEmailCountdown(0);
    setPhone('');
    setPhoneCode('');
    setPhoneCountdown(0);
  }, [loginMode]);

  // 清除旧的本地存储
  useEffect(() => {
    localStorage.removeItem('remembered_username');
    localStorage.removeItem('remembered_password');
  }, []);

  // 滑块验证
  const openSlideModal = () => setSlideModalVisible(true);
  const closeSlideModal = () => setSlideModalVisible(false);
  const handleSlideVerified = (id: string) => { setCaptchaId(id); setCaptchaVerified(true); setSlideModalVisible(false); };

  // 发送邮箱验证码
  const handleSendEmailCode = async () => {
    const currentEmail = form.getFieldValue('email') || email;
    if (!currentEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(currentEmail)) { message.warning('请输入有效邮箱'); return; }
    setSendEmailLoading(true);
    try {
      await sendEmailCode(currentEmail);
      message.success('验证码已发送');
      let count = 60; setEmailCountdown(count);
      const timer = setInterval(() => { count--; setEmailCountdown(count); if (count <= 0) clearInterval(timer); }, 1000);
    } catch (err: any) { message.error(err.response?.data?.message || '发送失败'); }
    finally { setSendEmailLoading(false); }
  };

  // 发送手机验证码
  const handleSendPhoneCode = async () => {
    const currentPhone = form.getFieldValue('phone') || phone;
    if (!currentPhone || !/^1[3-9]\d{9}$/.test(currentPhone)) { message.warning('请输入有效手机号'); return; }
    setSendPhoneLoading(true);
    try {
      await sendPhoneCode(currentPhone);
      message.success('验证码已发送');
      let count = 60; setPhoneCountdown(count);
      const timer = setInterval(() => { count--; setPhoneCountdown(count); if (count <= 0) clearInterval(timer); }, 1000);
    } catch (err: any) { message.error(err.response?.data?.message || '发送失败'); }
    finally { setSendPhoneLoading(false); }
  };

  // 登录提交
  const onFinish = async (values: any) => {
    if (loginMode === 'password') {
      if (!captchaVerified) { message.warning('请先完成图形验证'); return; }
      try {
        const res = await login({ username: values.username, password: values.password, captchaId: captchaId });
        authLogin(res.data.accessToken, res.data.user);
        message.success('登录成功');
        navigate('/protected', { replace: true });
      } catch (error: any) { handleLoginError(error); }
    } else if (loginMode === 'email') {
      const { email: formEmail, emailCode: formEmailCode } = values;
      if (!formEmailCode) { message.warning('请输入邮箱验证码'); return; }
      try {
        const res = await loginByEmail({ email: formEmail, code: formEmailCode });
        authLogin(res.data.accessToken, res.data.user);
        message.success('登录成功');
        navigate('/protected', { replace: true });
      } catch (error: any) {
        const errData = error.response?.data;
        if (errData?.code === 404 || errData?.message?.includes('未注册')) {
          setRegisterEmail(formEmail);
          setShowEmailRegisterModal(true);
          emailRegisterForm.resetFields();
          setRegPasswordStrength(0); setRegShowRequirements(false); setRegShowLengthError(false); setRegShowUsernameError(false);
        } else handleLoginError(error);
      }
    } else if (loginMode === 'phone') {
      const { phone: formPhone, phoneCode: formPhoneCode } = values;
      if (!formPhoneCode) { message.warning('请输入短信验证码'); return; }
      try {
        const res = await loginByPhone(formPhone, formPhoneCode);
        authLogin(res.data.accessToken, res.data.user);
        message.success('登录成功');
        navigate('/protected', { replace: true });
      } catch (error: any) {
        const errData = error.response?.data;
        if (errData?.code === 404 || errData?.message?.includes('未注册')) {
          setRegisterPhone(formPhone);
          setShowPhoneRegisterModal(true);
          phoneRegisterForm.resetFields();
          setRegPasswordStrength(0); setRegShowRequirements(false); setRegShowLengthError(false); setRegShowUsernameError(false);
        } else handleLoginError(error);
      }
    }
  };

  const handleLoginError = (error: any) => {
    const errData = error.response?.data;
    if (errData?.code === 401) message.error(errData.message || '账户已被冻结');
    else message.error(errData?.message || '登录失败');
  };

  // 公共密码强度验证
  const evaluatePassword = (value: string) => {
    if (!value) { setRegPasswordStrength(0); setRegShowRequirements(false); setRegShowLengthError(false); return; }
    if (value.length < 8 || value.length > 30) { setRegPasswordStrength(0); setRegShowRequirements(false); setRegShowLengthError(true); return; }
    const checks = { upper: /[A-Z]/.test(value), lower: /[a-z]/.test(value), digit: /[0-9]/.test(value), special: /[^A-Za-z0-9]/.test(value) };
    const categories = [checks.upper, checks.lower, checks.digit, checks.special].filter(Boolean).length;
    let strength = 25; if (categories >= 1) strength += 25; if (categories >= 2) strength += 25; if (categories >= 3) strength += 25;
    setRegPasswordStrength(Math.min(100, strength));
    setRegShowRequirements(categories < 3);
    setRegShowLengthError(false);
  };

  const evaluateUsername = (value: string) => {
    if (!value) { setRegShowUsernameError(false); return; }
    setRegShowUsernameError(value.length < 3 || value.length > 50);
  };

  // 邮箱快捷注册提交
  const onEmailRegisterFinish = async (values: any) => {
    if (!registerEmail) { message.error('邮箱信息丢失，请重新验证'); return; }
    const payload = {
      username: values.regUsername,
      password: values.regPassword,
      email: registerEmail,
      fromEmailLogin: true,
      phone: values.regPhone || '',
      displayName: values.regDisplayName,
    };
    console.log('邮箱注册 payload:', payload);
    try {
      const res = await register(payload as any);
      authLogin(res.data.accessToken, res.data.user);
      message.success('注册成功');
      setShowEmailRegisterModal(false);
      navigate('/protected', { replace: true });
    } catch (error: any) { message.error(error.response?.data?.message || '注册失败'); }
  };

  // 手机快捷注册提交
  const onPhoneRegisterFinish = async (values: any) => {
    if (!registerPhone) { message.error('手机号信息丢失，请重新验证'); return; }
    const payload = {
      username: values.regUsername,
      password: values.regPassword,
      phone: registerPhone,
      fromPhoneLogin: true,
      email: values.regEmail || '',
      displayName: values.regDisplayName,
    };
    console.log('手机注册 payload:', payload);
    try {
      const res = await register(payload as any);
      authLogin(res.data.accessToken, res.data.user);
      message.success('注册成功');
      setShowPhoneRegisterModal(false);
      navigate('/protected', { replace: true });
    } catch (error: any) { message.error(error.response?.data?.message || '注册失败'); }
  };

  // ===================== 忘记密码逻辑 =====================
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
    if (forgotVerifyType === 'phone' && !/^1[3-9]\d{9}$/.test(forgotContact)) { message.warning('请输入有效手机号'); return; }
    if (forgotVerifyType === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotContact)) { message.warning('请输入有效邮箱'); return; }
    setForgotLoading(true);
    try {
      if (forgotVerifyType === 'phone') await sendPhoneCode(forgotContact);
      else await sendEmailCode(forgotContact);
      message.success('验证码已发送');
      let count = 60; setForgotCountdown(count);
      const timer = setInterval(() => { count--; setForgotCountdown(count); if (count <= 0) clearInterval(timer); }, 1000);
    } catch (err: any) { message.error(err.response?.data?.message || '发送失败'); }
    finally { setForgotLoading(false); }
  };

  const handleForgotVerify = async () => {
    if (!forgotCode) { message.warning('请输入验证码'); return; }
    try {
      const res = await forgotVerify(forgotContact, forgotCode);
      setForgotToken(res.data.token);
      setForgotUsername(res.data.username);
      setForgotContactDisplay(forgotVerifyType === 'phone' ? res.data.phone : res.data.email);
      setForgotStep('reset');
    } catch (err: any) { message.error(err.response?.data?.message || '验证失败'); }
  };

  const handleForgotReset = async (values: any) => {
    if (values.newPassword !== values.confirmPassword) { message.error('两次密码不一致'); return; }
    try {
      await forgotReset(forgotToken, values.newPassword);
      message.success('密码重置成功，请使用新密码登录');
      setForgotModalVisible(false);
    } catch (err: any) { message.error(err.response?.data?.message || '重置失败'); }
  };

  const evaluateForgotPassword = (value: string) => {
    if (!value) { setForgotPasswordStrength(0); setForgotShowRequirements(false); setForgotShowLengthError(false); return; }
    if (value.length < 8 || value.length > 30) { setForgotPasswordStrength(0); setForgotShowRequirements(false); setForgotShowLengthError(true); return; }
    const checks = { upper: /[A-Z]/.test(value), lower: /[a-z]/.test(value), digit: /[0-9]/.test(value), special: /[^A-Za-z0-9]/.test(value) };
    const categories = [checks.upper, checks.lower, checks.digit, checks.special].filter(Boolean).length;
    let strength = 25; if (categories >= 1) strength += 25; if (categories >= 2) strength += 25; if (categories >= 3) strength += 25;
    setForgotPasswordStrength(Math.min(100, strength));
    setForgotShowRequirements(categories < 3);
    setForgotShowLengthError(false);
  };

  return (
    <div style={{ maxWidth: 400, margin: '40px auto' }}>
      <Card title="用户登录">
        <Form form={form} onFinish={onFinish} size="large">
          <Tabs activeKey={loginMode} onChange={(key) => setLoginMode(key as any)} centered items={[
            { key: 'password', label: '密码登录' },
            { key: 'email', label: '邮箱登录' },
            { key: 'phone', label: '手机登录' }
          ]} />

          {loginMode === 'password' && (
            <>
              <Form.Item name="username" rules={[{ required: true, message: '请输入用户名/手机号/邮箱' }]}>
                <Input prefix={<UserOutlined />} placeholder="用户名/手机号/邮箱" />
              </Form.Item>
              <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
                <Input.Password prefix={<LockOutlined />} placeholder="密码" />
              </Form.Item>
              <Form.Item>
                <Button icon={<SafetyCertificateOutlined />} block onClick={openSlideModal} disabled={captchaVerified}
                  style={captchaVerified ? { backgroundColor: '#f6ffed', color: '#52c41a', borderColor: '#b7eb8f' } : {}}>
                  {captchaVerified ? '✓ 验证成功' : '点击进行图形验证'}
                </Button>
              </Form.Item>
            </>
          )}

          {loginMode === 'email' && (
            <>
              <Form.Item name="email" rules={[{ required: true, message: '请输入邮箱地址' }]}>
                <Input prefix={<MailOutlined />} placeholder="请输入邮箱地址" onChange={(e) => setEmail(e.target.value)} />
              </Form.Item>
              <Form.Item name="emailCode" rules={[{ required: true, message: '请输入邮箱验证码' }]}>
                <Space.Compact style={{ width: '100%' }}>
                  <Input placeholder="邮箱验证码" onChange={(e) => setEmailCode(e.target.value)} />
                  <Button type="primary" onClick={handleSendEmailCode} loading={sendEmailLoading} disabled={emailCountdown > 0}>
                    {emailCountdown > 0 ? `${emailCountdown}s` : '获取验证码'}
                  </Button>
                </Space.Compact>
              </Form.Item>
            </>
          )}

          {loginMode === 'phone' && (
            <>
              <Form.Item name="phone" rules={[{ required: true, message: '请输入手机号' }]}>
                <Input prefix={<PhoneOutlined />} placeholder="手机号" onChange={(e) => setPhone(e.target.value)} />
              </Form.Item>
              <Form.Item name="phoneCode" rules={[{ required: true, message: '请输入短信验证码' }]}>
                <Space.Compact style={{ width: '100%' }}>
                  <Input placeholder="短信验证码" onChange={(e) => setPhoneCode(e.target.value)} />
                  <Button type="primary" onClick={handleSendPhoneCode} loading={sendPhoneLoading} disabled={phoneCountdown > 0}>
                    {phoneCountdown > 0 ? `${phoneCountdown}s` : '获取验证码'}
                  </Button>
                </Space.Compact>
              </Form.Item>
            </>
          )}

          <Form.Item>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Link to="/register">注册账号</Link>
              {loginMode === 'password' && (
                <a onClick={openForgotModal} style={{ fontSize: 14 }}>忘记密码？</a>
              )}
            </div>
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block>登录</Button>
          </Form.Item>
        </Form>
      </Card>

      {/* 滑块验证弹窗 */}
      <Modal title="安全验证" open={slideModalVisible} onCancel={closeSlideModal} footer={null} width={360} destroyOnHidden>
        {slideModalVisible && <SlideCaptcha onVerified={handleSlideVerified} />}
      </Modal>

      {/* 邮箱快捷注册弹窗 */}
      <Modal title="注册新账号" open={showEmailRegisterModal} onCancel={() => setShowEmailRegisterModal(false)} footer={null} width={460} destroyOnHidden={false} forceRender>
        <Form form={emailRegisterForm} onFinish={onEmailRegisterFinish} size="large">
          <Form.Item label="邮箱" required><Input value={registerEmail} disabled /></Form.Item>
          <Form.Item name="regUsername" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input prefix={<UserOutlined />} placeholder="用户名" onChange={(e) => evaluateUsername(e.target.value)} />
          </Form.Item>
          {regShowUsernameError && <div style={{ color: '#ff4d4f', fontSize: 13, marginBottom: 16 }}>用户名长度须在 <strong>3-50 位</strong>之间</div>}
          <Form.Item name="regPhone" rules={[{ pattern: /^1[3-9]\d{9}$/, message: '请输入有效手机号' }]}>
            <Input prefix={<PhoneOutlined />} placeholder="手机号（可选）" />
          </Form.Item>
          <Form.Item name="regDisplayName"><Input prefix={<IdcardOutlined />} placeholder="显示名称（可选）" /></Form.Item>
          <Form.Item name="regPassword" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="密码" onChange={(e) => evaluatePassword(e.target.value)} />
          </Form.Item>
          {regShowLengthError && <div style={{ color: '#ff4d4f', fontSize: 13, marginBottom: 16 }}>密码长度须在 <strong>8-30 位</strong>之间</div>}
          {regShowRequirements && (
            <div style={{ marginBottom: 16 }}>
              <Progress percent={regPasswordStrength} showInfo={false} strokeColor="#ff4d4f" />
              <div style={{ color: '#ff4d4f', fontSize: 13, marginTop: 4 }}>至少满足<strong>大写、小写、数字、特殊符号</strong>中的<strong>三种</strong></div>
            </div>
          )}
          <Form.Item name="regConfirm" dependencies={['regPassword']} rules={[
            { required: true, message: '请确认密码' },
            ({ getFieldValue }) => ({
              validator(_, value) { if (!value || getFieldValue('regPassword') === value) return Promise.resolve(); return Promise.reject(new Error('两次密码不一致')); },
            }),
          ]}>
            <Input.Password prefix={<LockOutlined />} placeholder="确认密码" />
          </Form.Item>
          <Form.Item><Button type="primary" htmlType="submit" block>注册并登录</Button></Form.Item>
        </Form>
      </Modal>

      {/* 手机快捷注册弹窗 */}
      <Modal title="注册新账号" open={showPhoneRegisterModal} onCancel={() => setShowPhoneRegisterModal(false)} footer={null} width={460} destroyOnHidden={false} forceRender>
        <Form form={phoneRegisterForm} onFinish={onPhoneRegisterFinish} size="large">
          <Form.Item label="手机号" required><Input value={registerPhone} disabled /></Form.Item>
          <Form.Item name="regUsername" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input prefix={<UserOutlined />} placeholder="用户名" onChange={(e) => evaluateUsername(e.target.value)} />
          </Form.Item>
          {regShowUsernameError && <div style={{ color: '#ff4d4f', fontSize: 13, marginBottom: 16 }}>用户名长度须在 <strong>3-50 位</strong>之间</div>}
          <Form.Item name="regEmail" rules={[{ type: 'email', message: '请输入有效邮箱' }]}>
            <Input prefix={<MailOutlined />} placeholder="邮箱（可选）" />
          </Form.Item>
          <Form.Item name="regDisplayName"><Input prefix={<IdcardOutlined />} placeholder="显示名称（可选）" /></Form.Item>
          <Form.Item name="regPassword" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="密码" onChange={(e) => evaluatePassword(e.target.value)} />
          </Form.Item>
          {regShowLengthError && <div style={{ color: '#ff4d4f', fontSize: 13, marginBottom: 16 }}>密码长度须在 <strong>8-30 位</strong>之间</div>}
          {regShowRequirements && (
            <div style={{ marginBottom: 16 }}>
              <Progress percent={regPasswordStrength} showInfo={false} strokeColor="#ff4d4f" />
              <div style={{ color: '#ff4d4f', fontSize: 13, marginTop: 4 }}>至少满足<strong>大写、小写、数字、特殊符号</strong>中的<strong>三种</strong></div>
            </div>
          )}
          <Form.Item name="regConfirm" dependencies={['regPassword']} rules={[
            { required: true, message: '请确认密码' },
            ({ getFieldValue }) => ({
              validator(_, value) { if (!value || getFieldValue('regPassword') === value) return Promise.resolve(); return Promise.reject(new Error('两次密码不一致')); },
            }),
          ]}>
            <Input.Password prefix={<LockOutlined />} placeholder="确认密码" />
          </Form.Item>
          <Form.Item><Button type="primary" htmlType="submit" block>注册并登录</Button></Form.Item>
        </Form>
      </Modal>

      {/* 忘记密码弹窗 */}
      <Modal title="找回密码" open={forgotModalVisible} onCancel={() => setForgotModalVisible(false)} footer={null} width={460} destroyOnHidden>
        {forgotStep === 'select' && (
          <div>
            <p style={{ marginBottom: 16 }}>请选择验证方式：</p>
            <Radio.Group value={forgotVerifyType} onChange={(e) => setForgotVerifyType(e.target.value)}>
              <Radio.Button value="phone">手机验证</Radio.Button>
              <Radio.Button value="email">邮箱验证</Radio.Button>
            </Radio.Group>
            <div style={{ marginTop: 24 }}>
              <Input placeholder={forgotVerifyType === 'phone' ? '请输入手机号' : '请输入邮箱'} value={forgotContact} onChange={(e) => setForgotContact(e.target.value)} style={{ marginBottom: 12 }} />
              <Space.Compact style={{ width: '100%' }}>
                <Input placeholder="验证码" value={forgotCode} onChange={(e) => setForgotCode(e.target.value)} />
                <Button type="primary" onClick={handleSendForgotCode} loading={forgotLoading} disabled={forgotCountdown > 0}>{forgotCountdown > 0 ? `${forgotCountdown}s` : '获取验证码'}</Button>
              </Space.Compact>
              <Button type="primary" block style={{ marginTop: 16 }} onClick={handleForgotVerify} disabled={!forgotCode}>下一步</Button>
            </div>
          </div>
        )}

        {forgotStep === 'reset' && (
          <div>
            <p>用户名：<strong>{forgotUsername}</strong></p>
            <p>绑定{forgotVerifyType === 'phone' ? '手机' : '邮箱'}：{forgotContactDisplay}</p>
            <Form form={forgotPasswordForm} onFinish={handleForgotReset} size="large">
              <Form.Item name="newPassword" rules={[{ required: true, message: '请输入新密码' }]}>
                <Input.Password prefix={<LockOutlined />} placeholder="新密码" onChange={(e) => evaluateForgotPassword(e.target.value)} />
              </Form.Item>
              {forgotShowLengthError && <div style={{ color: '#ff4d4f', fontSize: 13, marginBottom: 16 }}>密码长度须在 <strong>8-30 位</strong>之间</div>}
              {forgotShowRequirements && (
                <div style={{ marginBottom: 16 }}>
                  <Progress percent={forgotPasswordStrength} showInfo={false} strokeColor="#ff4d4f" />
                  <div style={{ color: '#ff4d4f', fontSize: 13, marginTop: 4 }}>至少满足<strong>大写、小写、数字、特殊符号</strong>中的<strong>三种</strong></div>
                </div>
              )}
              <Form.Item name="confirmPassword" dependencies={['newPassword']} rules={[
                { required: true, message: '请确认密码' },
                ({ getFieldValue }) => ({
                  validator(_, value) { if (!value || getFieldValue('newPassword') === value) return Promise.resolve(); return Promise.reject(new Error('两次密码不一致')); },
                }),
              ]}>
                <Input.Password prefix={<LockOutlined />} placeholder="确认密码" />
              </Form.Item>
              <Form.Item><Button type="primary" htmlType="submit" block>重置密码</Button></Form.Item>
            </Form>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Login;