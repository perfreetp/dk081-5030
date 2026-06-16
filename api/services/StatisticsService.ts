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

    const completedEmployees = db.employees.filter(e => e.status === 'completed' && e.completedAt);
    let averageTime = 0;
    if (completedEmployees.length > 0) {
      const totalDays = completedEmployees.reduce((sum, e) => {
        const created = new Date(e.createdAt);
        const completed = new Date(e.completedAt!);
        return sum + Math.ceil((completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
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

  async getSuccessRateData(city?: string, startDate?: string, endDate?: string): Promise<SuccessRateData[]> {
    const db = (await import('../config/database.js')).getDb();
    const allCities = await this.employeeRepository.getUniqueCities();
    const cities = city ? [city] : allCities;
    const result: SuccessRateData[] = [];

    let allReturnRecords = [...db.returnRecords];
    if (startDate) {
      const start = new Date(startDate);
      allReturnRecords = allReturnRecords.filter(r => new Date(r.markedAt) >= start);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      allReturnRecords = allReturnRecords.filter(r => new Date(r.markedAt) <= end);
    }

    for (const c of cities) {
      let cityEmployees = db.employees.filter(e => e.targetCity === c);
      let completedEmps = cityEmployees.filter(e => e.status === 'completed');

      if (startDate) {
        const start = new Date(startDate);
        completedEmps = completedEmps.filter(e => e.completedAt && new Date(e.completedAt) >= start);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        completedEmps = completedEmps.filter(e => e.completedAt && new Date(e.completedAt) <= end);
      }

      const cityEmployeeIds = cityEmployees.map(e => e.id);
      const cityReturnRecords = allReturnRecords.filter(r => cityEmployeeIds.includes(r.employeeId));

      const successCount = completedEmps.length;
      const failCount = cityReturnRecords.length;
      const total = successCount + failCount;
      const rate = total > 0 ? Math.round((successCount / total) * 100) : 0;

      result.push({
        city: c,
        successCount,
        failCount,
        rate,
      });
    }

    return result.sort((a, b) => b.rate - a.rate);
  }

  async getAverageTimeData(city?: string, startDate?: string, endDate?: string): Promise<AverageTimeData[]> {
    const db = (await import('../config/database.js')).getDb();
    const allCities = await this.employeeRepository.getUniqueCities();
    const cities = city ? [city] : allCities;
    const result: AverageTimeData[] = [];

    for (const c of cities) {
      let cityEmployees = db.employees.filter(
        e => e.targetCity === c && e.status === 'completed'
      );

      if (startDate) {
        cityEmployees = cityEmployees.filter(e => e.completedAt && new Date(e.completedAt) >= new Date(startDate));
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        cityEmployees = cityEmployees.filter(e => e.completedAt && new Date(e.completedAt) <= end);
      }

      if (cityEmployees.length === 0) {
        result.push({
          city: c,
          days: 0,
        });
        continue;
      }

      const daysList = cityEmployees
        .filter(e => e.completedAt)
        .map(e => {
          const created = new Date(e.createdAt);
          const completed = new Date(e.completedAt!);
          return Math.ceil((completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
        });

      if (daysList.length === 0) {
        result.push({
          city: c,
          days: 0,
        });
        continue;
      }

      const days = Math.round(daysList.reduce((a, b) => a + b, 0) / daysList.length);

      result.push({
        city: c,
        days,
      });
    }

    return result.sort((a, b) => a.days - b.days);
  }

  async getRejectionReasons(city?: string, startDate?: string, endDate?: string): Promise<RejectionReasonData[]> {
    const db = (await import('../config/database.js')).getDb();
    const reasonMap = new Map<string, number>();

    let records = [...db.returnRecords];
    
    if (city) {
      const cityEmployeeIds = db.employees.filter(e => e.targetCity === city).map(e => e.id);
      records = records.filter(r => cityEmployeeIds.includes(r.employeeId));
    }

    if (startDate) {
      records = records.filter(r => new Date(r.markedAt) >= new Date(startDate));
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      records = records.filter(r => new Date(r.markedAt) <= end);
    }

    records.forEach(r => {
      const count = reasonMap.get(r.reason) || 0;
      reasonMap.set(r.reason, count + 1);
    });

    return Array.from(reasonMap.entries())
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count);
  }

  async getAvailableCities(): Promise<string[]> {
    return this.employeeRepository.getUniqueCities();
  }

  async getExportData(city?: string, startDate?: string, endDate?: string) {
    const db = (await import('../config/database.js')).getDb();

    let completedEmps = db.employees.filter(e => e.status === 'completed');
    let allEmployees = [...db.employees];

    if (city) {
      completedEmps = completedEmps.filter(e => e.targetCity === city);
      allEmployees = allEmployees.filter(e => e.targetCity === city);
    }

    if (startDate) {
      const start = new Date(startDate);
      completedEmps = completedEmps.filter(e => e.completedAt && new Date(e.completedAt) >= start);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      completedEmps = completedEmps.filter(e => e.completedAt && new Date(e.completedAt) <= end);
    }

    let filteredReturnRecords = [...db.returnRecords];
    if (city) {
      const cityEmpIds = allEmployees.map(e => e.id);
      filteredReturnRecords = filteredReturnRecords.filter(r => cityEmpIds.includes(r.employeeId));
    }
    if (startDate) {
      filteredReturnRecords = filteredReturnRecords.filter(r => new Date(r.markedAt) >= new Date(startDate));
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filteredReturnRecords = filteredReturnRecords.filter(r => new Date(r.markedAt) <= end);
    }

    const totalCompleted = completedEmps.length;
    const totalReturned = filteredReturnRecords.length;
    const totalProcessed = totalCompleted + totalReturned;
    const successRate = totalProcessed > 0 ? Math.round((totalCompleted / totalProcessed) * 100) : 0;

    const completedWithDays = completedEmps.filter(e => e.completedAt);
    let averageDays = 0;
    if (completedWithDays.length > 0) {
      const totalDays = completedWithDays.reduce((sum, e) => {
        return sum + Math.ceil((new Date(e.completedAt!).getTime() - new Date(e.createdAt).getTime()) / (1000 * 60 * 60 * 24));
      }, 0);
      averageDays = Math.round(totalDays / completedWithDays.length);
    }

    const returnDetailList = filteredReturnRecords.map(r => {
      const emp = db.employees.find(e => e.id === r.employeeId);
      return {
        name: emp?.name || '未知',
        idCard: emp?.idCard || '',
        targetCity: emp?.targetCity || '',
        employeeType: emp?.employeeType || '' as any,
        returnedAt: r.markedAt,
        reasons: r.reason,
        markedBy: r.markedBy,
        category: r.category
      };
    });

    const completedByCity = new Map<string, number>();
    completedEmps.forEach(e => {
      completedByCity.set(e.targetCity, (completedByCity.get(e.targetCity) || 0) + 1);
    });
    const returnedByCity = new Map<string, number>();
    filteredReturnRecords.forEach(r => {
      const emp = db.employees.find(e => e.id === r.employeeId);
      if (emp) {
        returnedByCity.set(emp.targetCity, (returnedByCity.get(emp.targetCity) || 0) + 1);
      }
    });
    const allCitySet = new Set<string>();
    completedByCity.forEach((_v, k) => allCitySet.add(k));
    returnedByCity.forEach((_v, k) => allCitySet.add(k));
    const cityStats = Array.from(allCitySet).map(c => {
      const completed = completedByCity.get(c) || 0;
      const returned = returnedByCity.get(c) || 0;
      const total = completed + returned;
      return {
        city: c,
        completed,
        returned,
        total,
        rate: total > 0 ? Math.round((completed / total) * 100) : 0
      };
    }).sort((a, b) => b.rate - a.rate);

    const allMaterialTasks = db.tasks.filter(t => {
      if (city && t.city !== city) return false;
      return true;
    });
    const materialDeficiency: { taskCity: string; materialName: string; required: boolean; collected: boolean }[] = [];
    allMaterialTasks.forEach(task => {
      (task.materials || []).forEach(m => {
        if (!m.collected) {
          materialDeficiency.push({
            taskCity: task.city,
            materialName: m.name,
            required: !m.optional,
            collected: m.collected
          });
        }
      });
    });
    const materialSummary = new Map<string, number>();
    materialDeficiency.filter(m => m.required).forEach(m => {
      materialSummary.set(m.materialName, (materialSummary.get(m.materialName) || 0) + 1);
    });
    const materialDeficiencyList = Array.from(materialSummary.entries())
      .map(([name, count]) => ({ materialName: name, missingCount: count }))
      .sort((a, b) => b.missingCount - a.missingCount);

    const materialDeficiencyByCity: { city: string; missingMaterials: string }[] = [];
    const byCityMaterial = new Map<string, string[]>();
    materialDeficiency.filter(m => m.required).forEach(m => {
      const arr = byCityMaterial.get(m.taskCity) || [];
      if (!arr.includes(m.materialName)) arr.push(m.materialName);
      byCityMaterial.set(m.taskCity, arr);
    });
    byCityMaterial.forEach((mats, c) => {
      materialDeficiencyByCity.push({ city: c, missingMaterials: mats.join('；') });
    });

    const now = new Date();
    const overtimeTasks = allMaterialTasks
      .filter(t => t.status !== 'completed' && t.deadline && new Date(t.deadline) < now)
      .map(t => {
        const daysOverdue = Math.ceil((now.getTime() - new Date(t.deadline!).getTime()) / (1000 * 60 * 60 * 24));
        return {
          city: t.city,
          employeeCount: t.employeeCount,
          progress: t.progress,
          deadline: t.deadline,
          daysOverdue
        };
      })
      .sort((a, b) => b.daysOverdue - a.daysOverdue);

    const reasonMap = new Map<string, number>();
    filteredReturnRecords.forEach(r => {
      reasonMap.set(r.reason, (reasonMap.get(r.reason) || 0) + 1);
    });
    const rejectionReasons = Array.from(reasonMap.entries())
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count);

    const suggestions: string[] = [];
    if (overtimeTasks.length > 0) {
      suggestions.push(`⚠️ 有 ${overtimeTasks.length} 个任务已超期，建议优先跟进 ${overtimeTasks.slice(0, 3).map(t => t.city).join('、')}`);
    }
    if (materialDeficiencyList.length > 0) {
      suggestions.push(`📋 待补材料高频项：${materialDeficiencyList.slice(0, 3).map(m => m.materialName).join('、')}，建议批量催办`);
    }
    if (rejectionReasons.length > 0) {
      suggestions.push(`📌 主要退件原因：${rejectionReasons.slice(0, 3).map(r => r.reason).join('、')}，建议培训相关经办`);
    }
    const lowSuccess = cityStats.filter(c => c.total >= 3 && c.rate < 80);
    if (lowSuccess.length > 0) {
      suggestions.push(`🔴 低成功率城市：${lowSuccess.map(c => c.city + `(${c.rate}%)`).join('、')}，需重点复盘`);
    }
    if (suggestions.length === 0) {
      suggestions.push('✅ 整体指标良好，建议继续保持现有节奏');
    }

    return {
      summary: {
        totalCompleted,
        totalReturned,
        totalProcessed,
        successRate,
        averageDays
      },
      cityStats,
      returnDetailList,
      rejectionReasons,
      materialDeficiencyList,
      materialDeficiencyByCity,
      overtimeTasks,
      suggestions
    };
  }
}
