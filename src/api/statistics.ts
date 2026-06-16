import { request } from './client';
import type { DashboardStats, TodoItem, SuccessRateData, AverageTimeData, RejectionReasonData } from '../../shared/types.js';

export interface StatisticsFilter {
  city?: string;
  startDate?: string;
  endDate?: string;
}

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

  getCities: () => {
    return request<string[]>({
      url: '/statistics/cities',
      method: 'get'
    });
  },

  getSuccessRate: (filter?: StatisticsFilter) => {
    const params = new URLSearchParams();
    if (filter?.city) params.append('city', filter.city);
    if (filter?.startDate) params.append('startDate', filter.startDate);
    if (filter?.endDate) params.append('endDate', filter.endDate);
    return request<SuccessRateData[]>({
      url: `/statistics/success-rate${params.toString() ? '?' + params.toString() : ''}`,
      method: 'get'
    });
  },

  getAverageTime: (filter?: StatisticsFilter) => {
    const params = new URLSearchParams();
    if (filter?.city) params.append('city', filter.city);
    if (filter?.startDate) params.append('startDate', filter.startDate);
    if (filter?.endDate) params.append('endDate', filter.endDate);
    return request<AverageTimeData[]>({
      url: `/statistics/average-time${params.toString() ? '?' + params.toString() : ''}`,
      method: 'get'
    });
  },

  getRejectionReasons: (filter?: StatisticsFilter) => {
    const params = new URLSearchParams();
    if (filter?.city) params.append('city', filter.city);
    if (filter?.startDate) params.append('startDate', filter.startDate);
    if (filter?.endDate) params.append('endDate', filter.endDate);
    return request<RejectionReasonData[]>({
      url: `/statistics/rejection-reasons${params.toString() ? '?' + params.toString() : ''}`,
      method: 'get'
    });
  },

  getExportUrl: (filter?: StatisticsFilter) => {
    const token = localStorage.getItem('token') || '';
    const params = new URLSearchParams();
    if (filter?.city) params.append('city', filter.city);
    if (filter?.startDate) params.append('startDate', filter.startDate);
    if (filter?.endDate) params.append('endDate', filter.endDate);
    params.append('token', token);
    return `/api/statistics/export?${params.toString()}`;
  }
};
