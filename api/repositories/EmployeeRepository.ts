import { v4 as uuidv4 } from 'uuid';
import { getDb, persistDb } from '../config/database.js';
import type { Employee, EmployeeStatus, EmployeeType, EmployeeFilterParams, PaginatedResponse } from '../../shared/types.js';

export class EmployeeRepository {
  async findAll(params?: EmployeeFilterParams & { page?: number; pageSize?: number }): Promise<PaginatedResponse<Employee>> {
    const db = getDb();
    let employees = [...db.employees];

    if (params?.status) {
      employees = employees.filter(e => e.status === params.status);
    }
    if (params?.employeeType) {
      employees = employees.filter(e => e.employeeType === params.employeeType);
    }
    if (params?.targetCity) {
      employees = employees.filter(e => e.targetCity === params.targetCity);
    }
    if (params?.currentCity) {
      employees = employees.filter(e => e.currentCity === params.currentCity);
    }
    if (params?.keyword) {
      const keyword = params.keyword.toLowerCase();
      employees = employees.filter(e => 
        e.name.toLowerCase().includes(keyword) ||
        e.idCard.includes(keyword) ||
        e.phone?.includes(keyword)
      );
    }

    employees.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = employees.length;
    const page = params?.page || 1;
    const pageSize = params?.pageSize || 20;
    const start = (page - 1) * pageSize;
    const paginatedData = employees.slice(start, start + pageSize);

    return {
      items: paginatedData,
      total,
      page,
      pageSize
    };
  }

  async findById(id: string): Promise<Employee | null> {
    const db = getDb();
    const employee = db.employees.find(e => e.id === id);
    return employee || null;
  }

  async findByIdCard(idCard: string): Promise<Employee | null> {
    const db = getDb();
    const employee = db.employees.find(e => e.idCard === idCard);
    return employee || null;
  }

  async create(data: Omit<Employee, 'id' | 'status' | 'returnCount' | 'createdAt' | 'updatedAt'> & { status?: EmployeeStatus }): Promise<Employee> {
    const db = getDb();
    const now = new Date().toISOString();
    const employee: Employee = {
      id: uuidv4(),
      status: 'pending',
      returnCount: 0,
      createdAt: now,
      updatedAt: now,
      ...data
    };
    db.employees.push(employee);
    persistDb(db);
    return employee;
  }

  async bulkCreate(data: Array<Omit<Employee, 'id' | 'status' | 'returnCount' | 'createdAt' | 'updatedAt'>>): Promise<Employee[]> {
    const db = getDb();
    const now = new Date().toISOString();
    const employees: Employee[] = data.map(item => ({
      id: uuidv4(),
      status: 'pending',
      returnCount: 0,
      createdAt: now,
      updatedAt: now,
      ...item
    }));
    db.employees.push(...employees);
    persistDb(db);
    return employees;
  }

  async update(id: string, data: Partial<Employee>): Promise<Employee | null> {
    const db = getDb();
    const index = db.employees.findIndex(e => e.id === id);
    if (index === -1) return null;
    
    db.employees[index] = { 
      ...db.employees[index], 
      ...data, 
      updatedAt: new Date().toISOString() 
    };
    persistDb(db);
    return db.employees[index];
  }

  async delete(id: string): Promise<boolean> {
    const db = getDb();
    const index = db.employees.findIndex(e => e.id === id);
    if (index === -1) return false;
    
    db.employees.splice(index, 1);
    persistDb(db);
    return true;
  }

  async updateStatus(id: string, status: EmployeeStatus): Promise<Employee | null> {
    return this.update(id, { status });
  }

  async incrementReturnCount(id: string): Promise<Employee | null> {
    const db = getDb();
    const index = db.employees.findIndex(e => e.id === id);
    if (index === -1) return null;
    
    db.employees[index].returnCount += 1;
    db.employees[index].updatedAt = new Date().toISOString();
    persistDb(db);
    return db.employees[index];
  }

  async findByTargetCity(city: string): Promise<Employee[]> {
    const db = getDb();
    return db.employees.filter(e => e.targetCity === city);
  }

  async countByStatus(status: EmployeeStatus): Promise<number> {
    const db = getDb();
    return db.employees.filter(e => e.status === status).length;
  }

  async getUniqueCities(): Promise<string[]> {
    const db = getDb();
    const cities = new Set(db.employees.map(e => e.targetCity));
    return Array.from(cities).sort();
  }

  async getUniqueCurrentCities(): Promise<string[]> {
    const db = getDb();
    const cities = new Set(db.employees.map(e => e.currentCity));
    return Array.from(cities).sort();
  }

  async getCountByType(): Promise<Record<EmployeeType, number>> {
    const db = getDb();
    const counts: Record<EmployeeType, number> = {
      resignation: 0,
      transfer: 0,
      assignment: 0
    };
    db.employees.forEach(e => {
      counts[e.employeeType]++;
    });
    return counts;
  }
}
