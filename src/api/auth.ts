import { request } from './client';
import type { User } from '../../shared/types.js';

export interface LoginResponse {
  token: string;
  user: Omit<User, 'password'>;
}

export const authApi = {
  login: (username: string, password: string) => {
    return request<LoginResponse>({
      url: '/auth/login',
      method: 'post',
      data: { username, password }
    });
  },

  getCurrentUser: () => {
    return request<Omit<User, 'password'>>({
      url: '/auth/me',
      method: 'get'
    });
  }
};
