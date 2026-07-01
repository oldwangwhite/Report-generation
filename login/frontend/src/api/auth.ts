import axios from 'axios';

const api = axios.create({
  baseURL: 'http://127.0.0.1:8000/api',
  timeout: 10000,
});

// 请求拦截器：自动携带 Token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截器：统一处理业务错误码
api.interceptors.response.use(
  (res) => {
    const body = res.data;
    if (body.code !== 200) {
      if (body.code === 401) {
        localStorage.removeItem('accessToken');
        window.location.href = '/login';
      }
      return Promise.reject({ response: { data: body } });
    }
    return body;
  },
  (error) => {
    if (error.response?.data?.code === 401) {
      localStorage.removeItem('accessToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ==================== 登录接口（滑块验证码） ====================
export interface LoginParams {
  username: string;
  password: string;
  captchaId: string;   // 滑块验证码ID，必填
}

export const login = (data: LoginParams) => api.post('/auth/login', data);

// ==================== 邮箱登录接口 ====================
export interface EmailLoginParams {
  email: string;
  code: string;
}

export const loginByEmail = (data: EmailLoginParams) => api.post('/auth/login/email', data);

// ==================== 注册接口（可选邮箱验证码） ====================
export interface RegisterParams {
  username: string;
  password: string;
  captchaId?: string;
  captchaCode?: string;
  email?: string;
  emailCode?: string;
  phone?: string;
  displayName?: string;
  fromEmailLogin?: boolean;
  fromPhoneLogin?: boolean;
}

export const register = (data: RegisterParams) => api.post('/auth/register', data);

// ==================== 通用接口 ====================
export const getCurrentUser = () => api.get('/auth/me');
export const logout = () => api.post('/auth/logout');

// ==================== 邮箱验证码发送 ====================
export const sendEmailCode = (email: string) => api.post('/auth/email/send-code', { email });

// ==================== 滑块验证码（登录使用） ====================
export const getSlideCaptcha = () => api.get('/auth/captcha/slide');
export const verifySlideCaptcha = (captchaId: string, distance: number) =>
  api.post('/auth/captcha/slide/verify', { captchaId, distance });

export const getCaptcha = () => api.get('/auth/captcha');

// 手机验证码
export const sendPhoneCode = (phone: string) => api.post('/auth/phone/send-code', { phone });
export const loginByPhone = (phone: string, code: string) =>
  api.post('/auth/login/phone', { phone, code });

// 忘记密码
export const forgotVerify = (contact: string, code: string) =>
  api.post('/auth/forgot-password/verify', { contact, code });
export const forgotReset = (token: string, newPassword: string) =>
  api.post('/auth/forgot-password/reset', { token, newPassword });

export { api };