import { request } from './client';
import type { Task, MaterialItem, TimelineItem, CollaborationRecord } from '../../shared/types.js';

export const taskApi = {
  getTasks: () => {
    return request<Task[]>({
      url: '/tasks',
      method: 'get'
    });
  },

  splitTasks: () => {
    return request<Task[]>({
      url: '/tasks/split',
      method: 'get'
    });
  },

  getTaskByCity: (city: string) => {
    return request<Task & { employees: any[] }>({
      url: `/tasks/city/${encodeURIComponent(city)}`,
      method: 'get'
    });
  },

  getTask: (id: string) => {
    return request<Task & { employees: any[] }>({
      url: `/tasks/${id}`,
      method: 'get'
    });
  },

  updateTaskStatus: (id: string, status: string) => {
    return request<Task>({
      url: `/tasks/${id}/status`,
      method: 'put',
      data: { status }
    });
  },

  getTaskMaterials: (id: string) => {
    return request<MaterialItem[]>({
      url: `/tasks/${id}/materials`,
      method: 'get'
    });
  },

  updateTaskMaterials: (id: string, materials: MaterialItem[]) => {
    return request<MaterialItem[]>({
      url: `/tasks/${id}/materials`,
      method: 'put',
      data: { materials }
    });
  },

  getTaskTimeline: (id: string) => {
    return request<TimelineItem[]>({
      url: `/tasks/${id}/timeline`,
      method: 'get'
    });
  },

  updateTimelineItem: (id: string, index: number, completed: boolean) => {
    return request<TimelineItem[]>({
      url: `/tasks/${id}/timeline/${index}`,
      method: 'put',
      data: { completed }
    });
  },

  getCollaborationRecords: (id: string) => {
    return request<CollaborationRecord[]>({
      url: `/tasks/${id}/collaboration`,
      method: 'get'
    });
  },

  addCollaborationRecord: (
    id: string,
    type: CollaborationRecord['type'],
    data: { content?: string; file?: File; communicationTime?: string; counterpart?: string }
  ) => {
    const form = new FormData();
    form.append('type', type);
    if (data.content) form.append('content', data.content);
    if (data.file) form.append('attachment', data.file);
    if (data.communicationTime) form.append('communicationTime', data.communicationTime);
    if (data.counterpart) form.append('counterpart', data.counterpart);
    return request<CollaborationRecord>({
      url: `/tasks/${id}/collaboration`,
      method: 'post',
      data: form,
      headers: {}
    });
  },

  getCollaborationAttachmentUrl: (filename: string) => {
    const token = localStorage.getItem('token') || '';
    return `/api/tasks/collaboration/download/${encodeURIComponent(filename)}?token=${encodeURIComponent(token)}`;
  },

  deleteCollaborationRecord: (id: string, recordId: string) => {
    return request<null>({
      url: `/tasks/${id}/collaboration/${recordId}`,
      method: 'delete'
    });
  }
};
