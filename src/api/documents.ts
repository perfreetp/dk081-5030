import { request } from './client';
import type { DocumentType } from '../../shared/types.js';

export interface DocumentRecord {
  id: string;
  type: DocumentType;
  employeeIds: string;
  taskId?: string;
  filePath: string;
  fileName: string;
  createdBy: string;
  createdAt: string;
}

export const documentApi = {
  getReturnCategories: () => {
    return request<string[]>({
      url: '/documents/return-categories',
      method: 'get'
    });
  },

  generateDocument: (type: DocumentType, employeeIds: string[]) => {
    return request<DocumentRecord>({
      url: '/documents/generate',
      method: 'post',
      data: { type, employeeIds }
    });
  },

  getDocuments: () => {
    return request<DocumentRecord[]>({
      url: '/documents',
      method: 'get'
    });
  },

  downloadDocument: (id: string) => {
    return fetch(`http://localhost:3001/api/documents/${id}/download`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    }).then(response => {
      if (!response.ok) throw new Error('下载失败');
      return response.blob();
    });
  },

  downloadTemplate: () => {
    return fetch('http://localhost:3001/api/documents/template', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    }).then(response => {
      if (!response.ok) throw new Error('下载失败');
      return response.blob();
    });
  }
};
