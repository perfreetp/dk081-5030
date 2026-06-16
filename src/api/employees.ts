import { request } from './client';
import type { Employee, PaginatedResponse, EmployeeFilterParams, ValidationResult } from '../../shared/types.js';

export interface ImportPreviewResponse {
  preview: Array<Omit<Employee, 'id' | 'status' | 'returnCount' | 'createdAt' | 'updatedAt'>>;
  count: number;
}

export const employeeApi = {
  getEmployees: (params?: EmployeeFilterParams & { page?: number; pageSize?: number }) => {
    return request<PaginatedResponse<Employee>>({
      url: '/employees',
      method: 'get',
      params
    });
  },

  getEmployee: (id: string) => {
    return request<Employee & { validationResult?: ValidationResult; returnReasons?: any[] }>({
      url: `/employees/${id}`,
      method: 'get'
    });
  },

  updateEmployee: (id: string, data: Partial<Employee>) => {
    return request<Employee>({
      url: `/employees/${id}`,
      method: 'put',
      data
    });
  },

  deleteEmployee: (id: string) => {
    return request({
      url: `/employees/${id}`,
      method: 'delete'
    });
  },

  importExcel: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return request<ImportPreviewResponse>({
      url: '/employees/import',
      method: 'post',
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  },

  confirmImport: (data: any[]) => {
    return request<Employee[]>({
      url: '/employees/import/confirm',
      method: 'post',
      data: { data }
    });
  },

  validateEmployees: (employeeIds: string[]) => {
    return request<ValidationResult[]>({
      url: '/employees/validate',
      method: 'post',
      data: { employeeIds }
    });
  },

  getValidationResult: (employeeId: string) => {
    return request<ValidationResult>({
      url: `/employees/${employeeId}/validation`,
      method: 'get'
    });
  },

  getCities: () => {
    return request<string[]>({
      url: '/employees/cities',
      method: 'get'
    });
  },

  getStatistics: () => {
    return request({
      url: '/employees/statistics',
      method: 'get'
    });
  },

  getReturnedEmployees: (params?: { page?: number; pageSize?: number }) => {
    return request<PaginatedResponse<Employee & { returnReasons: any[] }>>({
      url: '/employees/returned/list',
      method: 'get',
      params
    });
  },

  markReturned: (employeeId: string, reason: string, category: string) => {
    return request<Employee>({
      url: `/employees/${employeeId}/mark-returned`,
      method: 'post',
      data: { reason, category }
    });
  },

  resubmit: (employeeId: string) => {
    return request<Employee>({
      url: `/employees/${employeeId}/resubmit`,
      method: 'post'
    });
  },

  downloadTemplate: () => {
    return request<Blob>({
      url: '/employees/template',
      method: 'get',
      responseType: 'blob'
    });
  }
};
