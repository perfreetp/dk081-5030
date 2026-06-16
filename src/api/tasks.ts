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

  addCollaborationRecord: (id: string, type: CollaborationRecord['type'], content: string) => {
    return request<CollaborationRecord>({
      url: `/tasks/${id}/collaboration`,
      method: 'post',
      data: { type, content }
    });
  },

  deleteCollaborationRecord: (id: string, recordId: string) => {
    return request<null>({
      url: `/tasks/${id}/collaboration/${recordId}`,
      method: 'delete'
    });
  }
};
