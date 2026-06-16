import { v4 as uuidv4 } from 'uuid';
import { getDb, persistDb } from '../config/database.js';
import type { ReturnReason } from '../../shared/types.js';

export const RETURN_CATEGORIES = [
  '材料不完整',
  '信息有误',
  '重复缴费',
  '已领取待遇',
  '缺少证明',
  '其他'
];

export class ReturnRecordRepository {
  async findAll(): Promise<ReturnReason[]> {
    const db = getDb();
    return [...db.returnRecords].sort((a, b) => 
      new Date(b.markedAt).getTime() - new Date(a.markedAt).getTime()
    );
  }

  async findByEmployeeId(employeeId: string): Promise<ReturnReason[]> {
    const db = getDb();
    return db.returnRecords
      .filter(r => r.employeeId === employeeId)
      .sort((a, b) => new Date(b.markedAt).getTime() - new Date(a.markedAt).getTime());
  }

  async findById(id: string): Promise<ReturnReason | null> {
    const db = getDb();
    return db.returnRecords.find(r => r.id === id) || null;
  }

  async create(data: Omit<ReturnReason, 'id' | 'markedAt'>): Promise<ReturnReason> {
    const db = getDb();
    const record: ReturnReason = {
      id: uuidv4(),
      markedAt: new Date().toISOString(),
      ...data
    };
    db.returnRecords.push(record);
    persistDb(db);
    return record;
  }

  async update(id: string, data: Partial<ReturnReason>): Promise<ReturnReason | null> {
    const db = getDb();
    const index = db.returnRecords.findIndex(r => r.id === id);
    if (index === -1) return null;
    
    db.returnRecords[index] = { 
      ...db.returnRecords[index], 
      ...data 
    };
    persistDb(db);
    return db.returnRecords[index];
  }

  async delete(id: string): Promise<boolean> {
    const db = getDb();
    const index = db.returnRecords.findIndex(r => r.id === id);
    if (index === -1) return false;
    
    db.returnRecords.splice(index, 1);
    persistDb(db);
    return true;
  }

  async getStatistics(): Promise<Array<{ category: string; count: number; reasons: Array<{ reason: string; count: number }> }>> {
    const db = getDb();
    const categoryMap = new Map<string, Map<string, number>>();

    db.returnRecords.forEach(record => {
      if (!categoryMap.has(record.category)) {
        categoryMap.set(record.category, new Map());
      }
      const reasonMap = categoryMap.get(record.category)!;
      reasonMap.set(record.reason, (reasonMap.get(record.reason) || 0) + 1);
    });

    const result: Array<{ category: string; count: number; reasons: Array<{ reason: string; count: number }> }> = [];
    
    for (const [category, reasonMap] of categoryMap.entries()) {
      const reasons = Array.from(reasonMap.entries())
        .map(([reason, count]) => ({ reason, count }))
        .sort((a, b) => b.count - a.count);
      
      const count = reasons.reduce((sum, r) => sum + r.count, 0);
      result.push({ category, count, reasons });
    }

    return result.sort((a, b) => b.count - a.count);
  }

  async getRejectionReasons(): Promise<Array<{ reason: string; count: number; category: string }>> {
    const db = getDb();
    const reasonMap = new Map<string, { count: number; category: string }>();

    db.returnRecords.forEach(record => {
      const key = record.reason;
      if (!reasonMap.has(key)) {
        reasonMap.set(key, { count: 0, category: record.category });
      }
      reasonMap.get(key)!.count++;
    });

    return Array.from(reasonMap.entries())
      .map(([reason, data]) => ({ reason, count: data.count, category: data.category }))
      .sort((a, b) => b.count - a.count);
  }

  getCategories(): string[] {
    return RETURN_CATEGORIES;
  }
}
