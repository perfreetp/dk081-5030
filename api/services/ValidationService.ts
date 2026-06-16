import { v4 as uuidv4 } from 'uuid';
import { getDb, persistDb } from '../config/database.js';
import type { Employee, ValidationResult, ValidationItem, ValidationItemKey } from '../../shared/types.js';

const VALIDATION_ITEMS: Array<{ key: ValidationItemKey; name: string }> = [
  { key: 'name', name: '姓名' },
  { key: 'idCard', name: '证件号' },
  { key: 'currentCity', name: '当前参保地' },
  { key: 'targetCity', name: '转入地' },
  { key: 'stopDate', name: '停保时间' },
  { key: 'hasBenefits', name: '是否已享受待遇' },
  { key: 'hasDuplicate', name: '是否存在重复缴费' },
  { key: 'missingCertificate', name: '是否缺少单位证明' }
];

export class ValidationService {
  private validateName(employee: Employee): ValidationItem {
    const result: ValidationItem = { key: 'name', name: '姓名', pass: true };
    
    if (!employee.name || employee.name.trim() === '') {
      result.pass = false;
      result.message = '姓名不能为空';
    } else if (employee.name.length < 2) {
      result.pass = false;
      result.message = '姓名长度至少为2个字符';
    } else if (!/^[\u4e00-\u9fa5·]{2,20}$/.test(employee.name)) {
      result.pass = false;
      result.message = '姓名格式不正确，仅限中文姓名';
    }
    
    return result;
  }

  private validateIdCard(employee: Employee): ValidationItem {
    const result: ValidationItem = { key: 'idCard', name: '证件号', pass: true };
    
    if (!employee.idCard) {
      result.pass = false;
      result.message = '证件号不能为空';
    } else if (!/^[1-9]\d{5}(19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/.test(employee.idCard)) {
      result.pass = false;
      result.message = '身份证号格式不正确';
    } else {
      const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
      const checkCodes = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2'];
      let sum = 0;
      for (let i = 0; i < 17; i++) {
        sum += parseInt(employee.idCard[i]) * weights[i];
      }
      const checkCode = checkCodes[sum % 11];
      if (employee.idCard[17].toUpperCase() !== checkCode) {
        result.pass = false;
        result.message = '身份证号校验位不正确';
      }
    }
    
    return result;
  }

  private validateCurrentCity(employee: Employee): ValidationItem {
    const result: ValidationItem = { key: 'currentCity', name: '当前参保地', pass: true };
    
    if (!employee.currentCity || employee.currentCity.trim() === '') {
      result.pass = false;
      result.message = '当前参保地不能为空';
    } else if (employee.currentCity.length < 2) {
      result.pass = false;
      result.message = '当前参保地格式不正确';
    }
    
    return result;
  }

  private validateTargetCity(employee: Employee): ValidationItem {
    const result: ValidationItem = { key: 'targetCity', name: '转入地', pass: true };
    
    if (!employee.targetCity || employee.targetCity.trim() === '') {
      result.pass = false;
      result.message = '转入地不能为空';
    } else if (employee.targetCity.length < 2) {
      result.pass = false;
      result.message = '转入地格式不正确';
    } else if (employee.currentCity === employee.targetCity) {
      result.pass = false;
      result.message = '转入地与当前参保地相同，无需办理转移';
    }
    
    return result;
  }

  private validateStopDate(employee: Employee): ValidationItem {
    const result: ValidationItem = { key: 'stopDate', name: '停保时间', pass: true };
    
    if (!employee.stopDate) {
      result.pass = false;
      result.message = '停保时间不能为空';
    } else {
      const stopDate = new Date(employee.stopDate);
      const now = new Date();
      if (isNaN(stopDate.getTime())) {
        result.pass = false;
        result.message = '停保时间格式不正确';
      } else if (stopDate > now) {
        result.pass = false;
        result.message = '停保时间不能晚于当前时间';
      }
    }
    
    return result;
  }

  private validateBenefits(employee: Employee): ValidationItem {
    const result: ValidationItem = { key: 'hasBenefits', name: '是否已享受待遇', pass: true };
    
    if (employee.hasBenefits) {
      result.pass = false;
      result.message = '已享受养老保险待遇人员无法办理转移';
    }
    
    return result;
  }

  private validateDuplicate(employee: Employee): ValidationItem {
    const result: ValidationItem = { key: 'hasDuplicate', name: '是否存在重复缴费', pass: true };
    
    if (employee.hasDuplicate) {
      result.pass = false;
      result.message = '存在重复缴费记录，需先处理后再办理转移';
    }
    
    return result;
  }

  private validateCertificate(employee: Employee): ValidationItem {
    const result: ValidationItem = { key: 'missingCertificate', name: '是否缺少单位证明', pass: true };
    
    if (employee.missingCertificate) {
      result.pass = false;
      result.message = '缺少单位证明材料，请先补充';
    }
    
    return result;
  }

  async validateEmployee(employee: Employee): Promise<ValidationResult> {
    const items: ValidationItem[] = [
      this.validateName(employee),
      this.validateIdCard(employee),
      this.validateCurrentCity(employee),
      this.validateTargetCity(employee),
      this.validateStopDate(employee),
      this.validateBenefits(employee),
      this.validateDuplicate(employee),
      this.validateCertificate(employee)
    ];

    const overallPass = items.every(item => item.pass);
    const now = new Date().toISOString();

    const validationResult: ValidationResult = {
      id: uuidv4(),
      employeeId: employee.id,
      overallPass,
      items,
      validatedAt: now
    };

    const db = getDb();
    const existingIndex = db.validationResults.findIndex(v => v.employeeId === employee.id);
    if (existingIndex >= 0) {
      db.validationResults[existingIndex] = validationResult;
    } else {
      db.validationResults.push(validationResult);
    }
    persistDb(db);

    return validationResult;
  }

  async validateAll(employeeIds: string[]): Promise<ValidationResult[]> {
    const db = getDb();
    const results: ValidationResult[] = [];

    for (const id of employeeIds) {
      const employee = db.employees.find(e => e.id === id);
      if (employee) {
        const result = await this.validateEmployee(employee);
        employee.status = result.overallPass ? 'validated' : 'pending';
        employee.updatedAt = new Date().toISOString();
        results.push(result);
      }
    }

    persistDb(db);
    return results;
  }

  async getValidationResult(employeeId: string): Promise<ValidationResult | null> {
    const db = getDb();
    return db.validationResults.find(v => v.employeeId === employeeId) || null;
  }

  getValidationItems(): Array<{ key: ValidationItemKey; name: string }> {
    return VALIDATION_ITEMS;
  }
}
