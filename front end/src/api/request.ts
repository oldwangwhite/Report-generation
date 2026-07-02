import axios from 'axios';
import type { AxiosError, AxiosRequestConfig } from 'axios';
import type { ApiResponse } from '../types/report';
import { getAuthToken } from '../utils/auth';

export const API_BASE = import.meta.env.VITE_API_BASE || '';

type RequestOptions = AxiosRequestConfig & { body?: BodyInit | null };

export function createAuthHeaders(): Record<string, string> {
    const token = getAuthToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
}

function isSuccessCode(code: number) {
    return code === 200 || code === 0;
}

function getFriendlyError(error: AxiosError<ApiResponse<unknown>>) {
    const code = error.response?.data?.code;
    const message = error.response?.data?.message;

    if (code === 40100) return '登录已过期，请重新登录';
    if (error.response?.status === 401) return message && message !== 'Unauthorized' ? message : '登录已过期，请重新登录';
    if (code === 40300 || error.response?.status === 403) return '当前账号没有权限访问该功能';
    return message || error.message || '接口请求失败';
}

export const request = axios.create({
    baseURL: API_BASE,
    timeout: 30000,
});

request.interceptors.request.use((config) => {
    const token = getAuthToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
});

request.interceptors.response.use(
    (response) => response,
    (error: AxiosError<ApiResponse<unknown>>) => {
        return Promise.reject(new Error(getFriendlyError(error)));
    },
);

function resolveRequestData(body: BodyInit | null | undefined) {
    if (typeof body === 'string') {
        try {
            return JSON.parse(body);
        } catch {
            return body;
        }
    }

    return body;
}

export async function requestJson<T>(url: string, options?: RequestOptions): Promise<T> {
    const { body, ...axiosOptions } = options || {};
    const response = await request.request<ApiResponse<T>>({
        url,
        ...axiosOptions,
        data: axiosOptions.data ?? resolveRequestData(body),
    });
    const json = response.data;

    if (!isSuccessCode(json.code)) {
        if (json.code === 40100) throw new Error('登录已过期，请重新登录');
        if (json.code === 401) throw new Error(json.message && json.message !== 'Unauthorized' ? json.message : '登录已过期，请重新登录');
        if (json.code === 40300) throw new Error('当前账号没有权限访问该功能');
        throw new Error(json.message || '接口请求失败');
    }

    return json.data;
}
