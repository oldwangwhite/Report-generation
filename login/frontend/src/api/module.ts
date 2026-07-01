import { api } from './auth';
export const fetchHomeModules = () => api.get('/modules/home');