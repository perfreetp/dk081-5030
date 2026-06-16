import * as XLSX from 'xlsx';
import { EmployeeRepository } from '../repositories/EmployeeRepository.js';
import { ReturnRecordRepository } from '../repositories/ReturnRecordRepository.js';
import { ValidationService } from './ValidationService.js';
import type { Employee, EmployeeType, PaginatedResponse, EmployeeFilterParams, EmployeeStatus } from '../../shared/types.js';

export class EmployeeService {
  private employeeRepository: EmployeeRepository;
  private returnRecordRepository: ReturnRecordRepository;
  private validationService: ValidationService;

  constructor() {
    this.employeeRepository = new EmployeeRepository();
    this.returnRecordRepository = new ReturnRecordRepository();
    this.validationService = new ValidationService();
  }

  parseExcel(fileBuffer: Buffer): Array<Omit<Employee, 'id' | 'status' | 'returnCount' | 'createdAt' | 'updatedAt'>> {
    const workbook = XLSX.read(fileBuffer);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet) as any[];

    const typeMap: Record<string, EmployeeType> = {
      '离职': 'resignation',
      '调岗': 'transfer',
      '异地派驻': 'assignment',
      'resignation': 'resignation',
      'transfer': 'transfer',
      'assignment': 'assignment'
    };

    return data.map((row, index) => {
      const employeeType = typeMap[row['人员类型'] || row['employeeType']] || 'transfer';
      
      const parseBoolean = (value: any): boolean => {
        if (typeof value === 'boolean') return value;
        if (typeof value === 'string') {
          return ['是', 'true', '1', 'yes'].includes(value.toLowerCase());
        }
        return false;
      };

      const parseDate = (value: any): string => {
        if (!value) return '';
        if (value instanceof Date) {
          return value.toISOString().split('T')[0];
        }
        if (typeof value === 'number') {
          const date = new Date((value - 25569) * 86400 * 1000);
          return date.toISOString().split('T')[0];
        }
        return String(value);
      };

      return {
        name: row['姓名'] || row['name'] || '',
        idCard: row['身份证号'] || row['证件号'] || row['idCard'] || '',
        phone: row['联系电话'] || row['phone'] || undefined,
        employeeType,
        currentCity: row['当前参保地'] || row['currentCity'] || '',
        targetCity: row['转入地'] || row['targetCity'] || '',
        stopDate: parseDate(row['停保时间'] || row['stopDate']),
        hasBenefits: parseBoolean(row['是否已享受待遇'] || row['hasBenefits']),
        hasDuplicate: parseBoolean(row['是否重复缴费'] || row['hasDuplicate']),
        missingCertificate: parseBoolean(row['是否缺少单位证明'] || row['missingCertificate']),
        createdBy: 'user_001'
      };
    });
  }

  async importEmployees(data: any[], createdBy: string): Promise<Employee[]> {
    const employees = data.map(item => ({
      ...item,
      createdBy
    }));
    return this.employeeRepository.bulkCreate(employees);
  }

  async getEmployees(params?: EmployeeFilterParams & { page?: number; pageSize?: number }): Promise<PaginatedResponse<Employee>> {
    return this.employeeRepository.findAll(params);
  }

  async getEmployee(id: string): Promise<(Employee & { validationResult?: any; returnReasons?: any[] }) | null> {
    const employee = await this.employeeRepository.findById(id);
    if (!employee) return null;

    const validationResult = await this.validationService.getValidationResult(id);
    const returnReasons = await this.returnRecordRepository.findByEmployeeId(id);

    return {
      ...employee,
      validationResult: validationResult || undefined,
      returnReasons
    };
  }

  async updateEmployee(id: string, data: Partial<Employee>): Promise<Employee | null> {
    return this.employeeRepository.update(id, data);
  }

  async deleteEmployee(id: string): Promise<boolean> {
    return this.employeeRepository.delete(id);
  }

  async validateEmployees(employeeIds: string[]): Promise<any[]> {
    return this.validationService.validateAll(employeeIds);
  }

  async getValidationResult(employeeId: string): Promise<any | null> {
    return this.validationService.getValidationResult(employeeId);
  }

  async markReturned(employeeId: string, reason: string, category: string, markedBy: string): Promise<Employee | null> {
    await this.returnRecordRepository.create({
      employeeId,
      reason,
      category,
      markedBy
    });

    await this.employeeRepository.incrementReturnCount(employeeId);
    return this.employeeRepository.updateStatus(employeeId, 'returned');
  }

  async resubmit(employeeId: string): Promise<Employee | null> {
    return this.employeeRepository.updateStatus(employeeId, 'pending');
  }

  async getReturnedEmployees(params?: { page?: number; pageSize?: number }): Promise<PaginatedResponse<Employee & { returnReasons: any[] }>> {
    const result = await this.employeeRepository.findAll({
      ...params,
      status: 'returned' as EmployeeStatus
    });

    const employeesWithReasons = await Promise.all(
      result.items.map(async (emp) => {
        const returnReasons = await this.returnRecordRepository.findByEmployeeId(emp.id);
        return { ...emp, returnReasons };
      })
    );

    return {
      ...result,
      items: employeesWithReasons.sort((a, b) => b.returnCount - a.returnCount)
    };
  }

  async getCities(): Promise<string[]> {
    return this.employeeRepository.getUniqueCities();
  }

  async getStatistics() {
    const byType = await this.employeeRepository.getCountByType();
    const byStatus = {
      pending: await this.employeeRepository.countByStatus('pending'),
      validated: await this.employeeRepository.countByStatus('validated'),
      in_progress: await this.employeeRepository.countByStatus('in_progress'),
      completed: await this.employeeRepository.countByStatus('completed'),
      returned: await this.employeeRepository.countByStatus('returned')
    };

    return { byType, byStatus };
  }
}
