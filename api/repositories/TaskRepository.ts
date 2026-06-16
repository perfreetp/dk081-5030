import { v4 as uuidv4 } from 'uuid';
import { getDb, persistDb } from '../config/database.js';
import type { Task, TaskStatus, MaterialItem, TimelineItem, CollaborationRecord, CollaborationAttachment } from '../../shared/types.js';

const CITY_MATERIALS: Record<string, MaterialItem[]> = {
  'default': [
    { name: '身份证复印件', optional: false, collected: false, description: '本人身份证正反面复印件' },
    { name: '户口簿复印件', optional: false, collected: false, description: '户口簿首页及本人页复印件' },
    { name: '社保缴费证明', optional: false, collected: false, description: '原参保地社保机构出具的缴费证明' },
    { name: '劳动合同', optional: true, collected: false, description: '与新单位签订的劳动合同' },
    { name: '单位证明', optional: false, collected: false, description: '原工作单位出具的离职证明或调岗证明' }
  ]
};

const CITY_TIMELINES: Record<string, TimelineItem[]> = {
  'default': [
    { name: '提交申请', dueDate: '', description: '向转入地社保机构提交转移申请', completed: false },
    { name: '审核受理', dueDate: '', description: '转入地社保机构审核并受理', completed: false },
    { name: '联系原参保地', dueDate: '', description: '转入地社保机构联系原参保地社保机构', completed: false },
    { name: '资金转移', dueDate: '', description: '原参保地社保机构转移个人账户资金', completed: false },
    { name: '办结确认', dueDate: '', description: '转入地社保机构确认办结并通知申请人', completed: false }
  ]
};

export class TaskRepository {
  async findAll(): Promise<Task[]> {
    const db = getDb();
    return [...db.tasks].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async findById(id: string): Promise<Task | null> {
    const db = getDb();
    return db.tasks.find(t => t.id === id) || null;
  }

  async findByCity(city: string): Promise<Task | null> {
    const db = getDb();
    return db.tasks.find(t => t.city === city) || null;
  }

  async create(city: string, employeeCount: number = 0, employeeIds: string[] = []): Promise<Task> {
    const db = getDb();
    const now = new Date().toISOString();
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 30);

    const materials = CITY_MATERIALS[city] || CITY_MATERIALS['default'];
    const timeline = CITY_TIMELINES[city] || CITY_TIMELINES['default'];

    const task: Task = {
      id: uuidv4(),
      city,
      employeeCount,
      employeeIds,
      deadline: deadline.toISOString().split('T')[0],
      status: 'pending',
      progress: 0,
      materials,
      timeline: timeline.map(item => ({ ...item })),
      collaborationRecords: [],
      createdAt: now,
      updatedAt: now
    };

    db.tasks.push(task);
    persistDb(db);
    return task;
  }

  async update(id: string, data: Partial<Task>): Promise<Task | null> {
    const db = getDb();
    const index = db.tasks.findIndex(t => t.id === id);
    if (index === -1) return null;

    db.tasks[index] = { 
      ...db.tasks[index], 
      ...data, 
      updatedAt: new Date().toISOString() 
    };
    persistDb(db);
    return db.tasks[index];
  }

  async updateStatus(id: string, status: TaskStatus): Promise<Task | null> {
    const db = getDb();
    const task = db.tasks.find(t => t.id === id);
    if (!task) return null;

    task.status = status;
    const now = new Date().toISOString();

    if (status === 'completed') {
      task.progress = 100;
      task.timeline.forEach(item => {
        item.completed = true;
        if (!item.dueDate) item.dueDate = now.split('T')[0];
      });
      if (task.employeeIds && task.employeeIds.length > 0) {
        task.employeeIds.forEach(empId => {
          const emp = db.employees.find(e => e.id === empId);
          if (emp && emp.status !== 'returned') {
            emp.status = 'completed';
            emp.completedAt = now;
            emp.updatedAt = now;
          }
        });
      }
    } else if (status === 'in_progress') {
      if (task.progress === 0) {
        const completedCount = task.timeline.filter(t => t.completed).length;
        if (completedCount === 0) {
          task.timeline[0].completed = true;
          task.timeline[0].dueDate = now.split('T')[0];
          task.progress = Math.round((1 / task.timeline.length) * 100);
        }
      }
      if (task.employeeIds && task.employeeIds.length > 0) {
        task.employeeIds.forEach(empId => {
          const emp = db.employees.find(e => e.id === empId);
          if (emp && emp.status === 'validated') {
            emp.status = 'in_progress';
            emp.updatedAt = now;
          }
        });
      }
    }

    task.updatedAt = now;
    persistDb(db);
    return task;
  }

  async updateProgress(id: string, progress: number): Promise<Task | null> {
    return this.update(id, { progress: Math.min(100, Math.max(0, progress)) });
  }

  async updateEmployeeCount(id: string, count: number, employeeIds?: string[]): Promise<Task | null> {
    const data: Partial<Task> = { employeeCount: count };
    if (employeeIds) {
      data.employeeIds = employeeIds;
    }
    return this.update(id, data);
  }

  async getMaterials(taskId: string): Promise<MaterialItem[]> {
    const task = await this.findById(taskId);
    return task?.materials || [];
  }

  async updateMaterials(taskId: string, materials: MaterialItem[]): Promise<MaterialItem[] | null> {
    const db = getDb();
    const task = db.tasks.find(t => t.id === taskId);
    if (!task) return null;

    task.materials = materials;
    task.updatedAt = new Date().toISOString();
    persistDb(db);
    return task.materials;
  }

  async getTimeline(taskId: string): Promise<TimelineItem[]> {
    const task = await this.findById(taskId);
    return task?.timeline || [];
  }

  async updateTimeline(taskId: string, timelineIndex: number, completed: boolean): Promise<TimelineItem[] | null> {
    const db = getDb();
    const task = db.tasks.find(t => t.id === taskId);
    if (!task || !task.timeline[timelineIndex]) return null;

    const wasCompleted = task.progress === 100;
    const isLastNode = timelineIndex === task.timeline.length - 1;
    const today = new Date().toISOString().split('T')[0];

    if (completed && isLastNode) {
      task.timeline.forEach((item, i) => {
        item.completed = true;
        if (!item.dueDate) item.dueDate = today;
      });
    } else {
      task.timeline[timelineIndex].completed = completed;
      task.timeline[timelineIndex].dueDate = completed ? today : '';
    }

    const completedCount = task.timeline.filter(t => t.completed).length;
    task.progress = Math.round((completedCount / task.timeline.length) * 100);

    const now = new Date().toISOString();
    if (task.progress === 100) {
      task.status = 'completed';
      if (!wasCompleted && task.employeeIds && task.employeeIds.length > 0) {
        task.employeeIds.forEach(empId => {
          const emp = db.employees.find(e => e.id === empId);
          if (emp) {
            emp.status = 'completed';
            emp.completedAt = now;
            emp.updatedAt = now;
          }
        });
      }
    } else if (completedCount > 0) {
      task.status = 'in_progress';
      if (task.employeeIds && task.employeeIds.length > 0) {
        task.employeeIds.forEach(empId => {
          const emp = db.employees.find(e => e.id === empId);
          if (emp && emp.status === 'validated') {
            emp.status = 'in_progress';
            emp.updatedAt = now;
          }
        });
      }
    }

    task.updatedAt = now;
    persistDb(db);
    return task.timeline;
  }

  async delete(id: string): Promise<boolean> {
    const db = getDb();
    const index = db.tasks.findIndex(t => t.id === id);
    if (index === -1) return false;
    db.tasks.splice(index, 1);
    persistDb(db);
    return true;
  }

  async addCollaborationRecord(taskId: string, type: CollaborationRecord['type'], content: string, createdBy: string, extra?: {
    attachment?: CollaborationAttachment;
    communicationTime?: string;
    counterpart?: string;
  }): Promise<CollaborationRecord | null> {
    const db = getDb();
    const task = db.tasks.find(t => t.id === taskId);
    if (!task) return null;

    if (!task.collaborationRecords) {
      task.collaborationRecords = [];
    }

    const record: CollaborationRecord = {
      id: uuidv4(),
      taskId,
      type,
      content,
      createdBy,
      createdAt: new Date().toISOString(),
      ...(extra?.attachment && { attachment: extra.attachment }),
      ...(extra?.communicationTime && { communicationTime: extra.communicationTime }),
      ...(extra?.counterpart && { counterpart: extra.counterpart })
    };

    task.collaborationRecords.push(record);
    task.updatedAt = new Date().toISOString();
    persistDb(db);
    return record;
  }

  async getCollaborationRecords(taskId: string): Promise<CollaborationRecord[]> {
    const task = await this.findById(taskId);
    if (!task || !task.collaborationRecords) return [];
    return [...task.collaborationRecords].sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async deleteCollaborationRecord(taskId: string, recordId: string): Promise<boolean> {
    const db = getDb();
    const task = db.tasks.find(t => t.id === taskId);
    if (!task || !task.collaborationRecords) return false;

    const index = task.collaborationRecords.findIndex(r => r.id === recordId);
    if (index === -1) return false;

    task.collaborationRecords.splice(index, 1);
    task.updatedAt = new Date().toISOString();
    persistDb(db);
    return true;
  }

  async getOrCreateByCity(city: string): Promise<Task> {
    let task = await this.findByCity(city);
    if (!task) {
      task = await this.create(city);
    }
    return task;
  }
}
