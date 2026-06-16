import { EmployeeRepository } from '../repositories/EmployeeRepository.js';
import { ReturnRecordRepository } from '../repositories/ReturnRecordRepository.js';
import type { DashboardStats, TodoItem, SuccessRateData, AverageTimeData, RejectionReasonData } from '../../shared/types.js';

const todoIcons: Record<string, string> = {
  validation: '✅',
  deadline: '⏰',
  correction: '📝',
};

export class StatisticsService {
  private employeeRepository: EmployeeRepository;
  private returnRecordRepository: ReturnRecordRepository;

  constructor() {
    this.employeeRepository = new EmployeeRepository();
    this.returnRecordRepository = new ReturnRecordRepository();
  }

  async getDashboardStats(): Promise<DashboardStats> {
    const db = (await import('../config/database.js')).getDb();
    
    const totalEmployees = db.employees.length;
    const pendingValidation = db.employees.filter(e => e.status === 'pending').length;
    const inProgress = db.employees.filter(e => e.status === 'in_progress' || e.status === 'validated').length;
    const completed = db.employees.filter(e => e.status === 'completed').length;
    const returned = db.employees.filter(e => e.status === 'returned').length;
    
    const totalProcessed = completed + returned;
    const successRate = totalProcessed > 0 ? Math.round((completed / totalProcessed) * 100) : 0;

    const completedEmployees = db.employees.filter(e => e.status === 'completed');
    let averageTime = 0;
    if (completedEmployees.length > 0) {
      const totalDays = completedEmployees.reduce((sum, e) => {
        const created = new Date(e.createdAt);
        const updated = new Date(e.updatedAt);
        return sum + Math.ceil((updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
      }, 0);
      averageTime = Math.round(totalDays / completedEmployees.length);
    }

    const byCityMap = new Map<string, number>();
    db.employees.forEach(e => {
      const count = byCityMap.get(e.targetCity) || 0;
      byCityMap.set(e.targetCity, count + 1);
    });
    const byCity = Array.from(byCityMap.entries())
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count);

    const byType = {
      resignation: db.employees.filter(e => e.employeeType === 'resignation').length,
      transfer: db.employees.filter(e => e.employeeType === 'transfer').length,
      assignment: db.employees.filter(e => e.employeeType === 'assignment').length,
    };

    let validationIssues = 0;
    db.employees.forEach(e => {
      if (e.validationResult && !e.validationResult.overallPass) {
        const items = e.validationResult.items;
        validationIssues += items.filter(i => !i.pass).length;
      }
    });

    return {
      totalEmployees,
      pendingValidation,
      inProgress,
      completed,
      returned,
      successRate,
      validationIssues,
      averageTime,
      byCity,
      byType,
    };
  }

  async getTodoList(): Promise<TodoItem[]> {
    const db = (await import('../config/database.js')).getDb();
    const todos: TodoItem[] = [];

    const pendingEmployees = db.employees.filter(e => e.status === 'pending');
    if (pendingEmployees.length > 0) {
      todos.push({
        id: 'todo_validation',
        icon: todoIcons.validation,
        title: `${pendingEmployees.length} 人待校验`,
        description: `${pendingEmployees.length} 位员工的信息等待校验`,
        priority: pendingEmployees.length > 10 ? 'high' : 'medium',
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString('zh-CN'),
        link: '/validation'
      });
    }

    const validatedEmployees = db.employees.filter(e => e.status === 'validated');
    if (validatedEmployees.length > 0) {
      todos.push({
        id: 'todo_submit',
        icon: todoIcons.deadline,
        title: `${validatedEmployees.length} 人待提交申报`,
        description: `已通过校验，等待提交到社保机构`,
        priority: 'medium',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('zh-CN'),
        link: '/tasks'
      });
    }

    const returnedEmployees = db.employees.filter(e => e.status === 'returned');
    if (returnedEmployees.length > 0) {
      todos.push({
        id: 'todo_correction',
        icon: todoIcons.correction,
        title: `${returnedEmployees.length} 人需补正`,
        description: `申报被退回，需要修正后重新提交`,
        priority: 'high',
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toLocaleDateString('zh-CN'),
        link: '/returns'
      });
    }

    const now = new Date();
    db.tasks.forEach(task => {
      if (task.deadline && task.status !== 'completed') {
        const deadline = new Date(task.deadline);
        const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysLeft <= 7) {
          todos.push({
            id: `todo_deadline_${task.id}`,
            icon: todoIcons.deadline,
            title: `${task.city} 申报即将到期`,
            description: `还有 ${daysLeft} 天截止，共 ${task.employeeCount} 人`,
            priority: daysLeft <= 3 ? 'high' : 'medium',
            dueDate: deadline.toLocaleDateString('zh-CN'),
            link: `/tasks`
          });
        }
      }
    });

    return todos.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  async getSuccessRateData(): Promise<SuccessRateData[]> {
    const db = (await import('../config/database.js')).getDb();
    const cities = await this.employeeRepository.getUniqueCities();
    const result: SuccessRateData[] = [];

    for (const city of cities) {
      const cityEmployees = db.employees.filter(e => e.targetCity === city);
      const successCount = cityEmployees.filter(e => e.status === 'completed').length;
      const failCount = cityEmployees.filter(e => e.status === 'returned').length;
      const total = successCount + failCount;
      const rate = total > 0 ? Math.round((successCount / total) * 100) : 0;

      result.push({
        city,
        successCount,
        failCount,
        rate,
      });
    }

    return result.sort((a, b) => b.rate - a.rate);
  }

  async getAverageTimeData(): Promise<AverageTimeData[]> {
    const db = (await import('../config/database.js')).getDb();
    const cities = await this.employeeRepository.getUniqueCities();
    const result: AverageTimeData[] = [];

    for (const city of cities) {
      const cityEmployees = db.employees.filter(
        e => e.targetCity === city && e.status === 'completed'
      );

      if (cityEmployees.length === 0) {
        result.push({
          city,
          days: 0,
        });
        continue;
      }

      const daysList = cityEmployees.map(e => {
        const created = new Date(e.createdAt);
        const updated = new Date(e.updatedAt);
        return Math.ceil((updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
      });

      const days = Math.round(daysList.reduce((a, b) => a + b, 0) / daysList.length);

      result.push({
        city,
        days,
      });
    }

    return result.sort((a, b) => a.days - b.days);
  }

  async getRejectionReasons(): Promise<RejectionReasonData[]> {
    const reasons = await this.returnRecordRepository.getRejectionReasons();
    return reasons.map(r => ({
      reason: r.reason,
      count: r.count,
    }));
  }
}
