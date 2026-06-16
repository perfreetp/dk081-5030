import { request } from './client';
import type { DashboardStats, TodoItem, SuccessRateData, AverageTimeData, RejectionReasonData } from '../../shared/types.js';

export const statisticsApi = {
  getDashboardStats: () => {
    return request<DashboardStats>({
      url: '/dashboard/stats',
      method: 'get'
    });
  },

  getTodos: () => {
    return request<TodoItem[]>({
      url: '/dashboard/todos',
      method: 'get'
    });
  },

  getSuccessRate: () => {
    return request<SuccessRateData[]>({
      url: '/statistics/success-rate',
      method: 'get'
    });
  },

  getAverageTime: () => {
    return request<AverageTimeData[]>({
      url: '/statistics/average-time',
      method: 'get'
    });
  },

  getRejectionReasons: () => {
    return request<RejectionReasonData[]>({
      url: '/statistics/rejection-reasons',
      method: 'get'
    });
  }
};
