import { TaskRepository } from '../repositories/TaskRepository.js';
import { EmployeeRepository } from '../repositories/EmployeeRepository.js';
import type { Task, Employee, MaterialItem, CollaborationRecord, CollaborationAttachment } from '../../shared/types.js';
import { getDb, persistDb } from '../config/database.js';

export class TaskService {
  private taskRepository: TaskRepository;
  private employeeRepository: EmployeeRepository;

  constructor() {
    this.taskRepository = new TaskRepository();
    this.employeeRepository = new EmployeeRepository();
  }

  private refreshTaskEmployees(task: Task): Task {
    const db = getDb();
    const validStatuses = ['validated', 'in_progress', 'completed'] as const;
    const validEmployeeIds = task.employeeIds.filter(id => {
      const emp = db.employees.find(e => e.id === id);
      return emp && validStatuses.includes(emp.status as any);
    });

    if (validEmployeeIds.length !== task.employeeIds.length || task.employeeCount !== validEmployeeIds.length) {
      task.employeeIds = validEmployeeIds;
      task.employeeCount = validEmployeeIds.length;
      task.updatedAt = new Date().toISOString();
      persistDb(db);
    }

    return task;
  }

  async getAllTasks(): Promise<Task[]> {
    const tasks = await this.taskRepository.findAll();
    return tasks.map(t => this.refreshTaskEmployees(t));
  }

  async getTaskByCity(city: string): Promise<Task & { employees: Employee[] } | null> {
    const task = await this.taskRepository.findByCity(city);
    if (!task) return null;

    this.refreshTaskEmployees(task);

    const employees = await this.employeeRepository.findByTargetCity(city);
    const eligibleEmployees = employees.filter(e => 
      (e.status === 'validated' || e.status === 'in_progress' || e.status === 'completed') 
      && task.employeeIds.includes(e.id)
    );
    return { ...task, employees: eligibleEmployees };
  }

  async getTaskById(id: string): Promise<Task & { employees: Employee[] } | null> {
    const task = await this.taskRepository.findById(id);
    if (!task) return null;

    this.refreshTaskEmployees(task);

    const allEmployees = await this.employeeRepository.findByTargetCity(task.city);
    const eligibleEmployees = allEmployees.filter(e => 
      task.employeeIds.includes(e.id) && 
      (e.status === 'validated' || e.status === 'in_progress' || e.status === 'completed')
    );
    return { ...task, employees: eligibleEmployees };
  }

  async splitTasksByCity(): Promise<Task[]> {
    const cities = await this.employeeRepository.getUniqueCities();
    const tasks: Task[] = [];

    for (const city of cities) {
      const employees = await this.employeeRepository.findByTargetCity(city);
      const eligibleEmployees = employees.filter(e => 
        e.status === 'validated' || e.status === 'in_progress' || e.status === 'completed'
      );
      const eligibleIds = eligibleEmployees.map(e => e.id);
      
      if (eligibleEmployees.length > 0) {
        let task = await this.taskRepository.findByCity(city);
        if (!task) {
          task = await this.taskRepository.create(city, eligibleEmployees.length, eligibleIds);
        } else {
          task = await this.taskRepository.updateEmployeeCount(task.id, eligibleEmployees.length, eligibleIds);
        }
        if (task) {
          tasks.push(task);
        }
      }
    }

    return tasks;
  }

  async updateTaskStatus(taskId: string, status: string): Promise<Task | null> {
    return this.taskRepository.updateStatus(taskId, status as any);
  }

  async updateTimelineItem(taskId: string, index: number, completed: boolean) {
    return this.taskRepository.updateTimeline(taskId, index, completed);
  }

  async getTaskMaterials(taskId: string) {
    return this.taskRepository.getMaterials(taskId);
  }

  async getTaskTimeline(taskId: string) {
    return this.taskRepository.getTimeline(taskId);
  }

  async updateTaskMaterials(taskId: string, materials: MaterialItem[]) {
    return this.taskRepository.updateMaterials(taskId, materials);
  }

  async addCollaborationRecord(taskId: string, type: CollaborationRecord['type'], content: string, createdBy: string, extra?: {
    attachment?: CollaborationAttachment;
    communicationTime?: string;
    counterpart?: string;
  }) {
    return this.taskRepository.addCollaborationRecord(taskId, type, content, createdBy, extra);
  }

  async getCollaborationRecords(taskId: string) {
    return this.taskRepository.getCollaborationRecords(taskId);
  }

  async deleteCollaborationRecord(taskId: string, recordId: string) {
    return this.taskRepository.deleteCollaborationRecord(taskId, recordId);
  }
}
