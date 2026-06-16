import { TaskRepository } from '../repositories/TaskRepository.js';
import { EmployeeRepository } from '../repositories/EmployeeRepository.js';
import type { Task, Employee } from '../../shared/types.js';

export class TaskService {
  private taskRepository: TaskRepository;
  private employeeRepository: EmployeeRepository;

  constructor() {
    this.taskRepository = new TaskRepository();
    this.employeeRepository = new EmployeeRepository();
  }

  async getAllTasks(): Promise<Task[]> {
    return this.taskRepository.findAll();
  }

  async getTaskByCity(city: string): Promise<Task & { employees: Employee[] } | null> {
    const task = await this.taskRepository.findByCity(city);
    if (!task) return null;

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

    const allEmployees = await this.employeeRepository.findByTargetCity(task.city);
    const eligibleEmployees = allEmployees.filter(e => 
      task.employeeIds.includes(e.id)
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
}
