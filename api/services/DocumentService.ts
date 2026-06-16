import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { getDb, persistDb } from '../config/database.js';
import type { Employee, DocumentType } from '../../shared/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const documentsDir = path.join(__dirname, '../../storage/documents');

const DOCUMENT_NAMES: Record<DocumentType, string> = {
  stamp_list: '企业盖章清单',
  confirmation: '员工签署确认单',
  correction: '补正通知'
};

interface DocumentRecord {
  id: string;
  type: DocumentType;
  employeeIds: string;
  taskId?: string;
  filePath: string;
  fileName: string;
  createdBy: string;
  createdAt: string;
}

export class DocumentService {
  constructor() {
    if (!fs.existsSync(documentsDir)) {
      fs.mkdirSync(documentsDir, { recursive: true });
    }
  }

  private getEmployeesByIds(ids: string[]): Employee[] {
    const db = getDb();
    return ids.map(id => db.employees.find(e => e.id === id)).filter(Boolean) as Employee[];
  }

  async generateStampList(employeeIds: string[], createdBy: string): Promise<DocumentRecord> {
    const employees = this.getEmployeesByIds(employeeIds);
    const docId = uuidv4();
    const fileName = `盖章清单_${new Date().toISOString().split('T')[0]}_${docId.slice(0, 8)}.pdf`;
    const filePath = path.join(documentsDir, fileName);

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    doc.fontSize(20).text('企业盖章清单', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`生成日期：${new Date().toLocaleDateString('zh-CN')}`);
    doc.text(`员工人数：${employees.length} 人`);
    doc.moveDown();

    doc.fontSize(14).text('员工社保关系转移明细');
    doc.moveDown();

    const tableTop = doc.y;
    const colWidths = [30, 80, 120, 100, 100, 80];
    const headers = ['序号', '姓名', '身份证号', '当前参保地', '转入地', '人员类型'];

    doc.fontSize(10);
    headers.forEach((header, i) => {
      doc.text(header, 50 + colWidths.slice(0, i).reduce((a, b) => a + b, 0), tableTop);
    });

    let currentY = tableTop + 20;
    employees.forEach((emp, index) => {
      if (currentY > 750) {
        doc.addPage();
        currentY = 50;
      }
      
      const typeMap: Record<string, string> = {
        resignation: '离职',
        transfer: '调岗',
        assignment: '异地派驻'
      };
      
      const xOffset = 50;
      doc.text(String(index + 1), xOffset + colWidths[0] * 0, currentY);
      doc.text(emp.name, xOffset + colWidths[0] * 1, currentY);
      doc.text(emp.idCard, xOffset + colWidths[0] * 1 + colWidths[1], currentY);
      doc.text(emp.currentCity, xOffset + colWidths[0] * 1 + colWidths[1] + colWidths[2], currentY);
      doc.text(emp.targetCity, xOffset + colWidths[0] * 1 + colWidths[1] + colWidths[2] + colWidths[3], currentY);
      doc.text(typeMap[emp.employeeType] || emp.employeeType, xOffset + colWidths[0] * 1 + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4], currentY);
      
      currentY += 20;
    });

    doc.moveDown(2);
    doc.fontSize(12).text('企业盖章：____________________');
    doc.text('经办人签字：____________________');
    doc.text('日期：____________________');

    doc.end();

    return new Promise((resolve, reject) => {
      stream.on('finish', () => {
        const record: DocumentRecord = {
          id: docId,
          type: 'stamp_list',
          employeeIds: JSON.stringify(employeeIds),
          filePath,
          fileName,
          createdBy,
          createdAt: new Date().toISOString()
        };
        
        const db = getDb();
        (db as any).documents.push(record);
        persistDb(db);
        
        resolve(record);
      });
      stream.on('error', reject);
    });
  }

  async generateConfirmation(employeeIds: string[], createdBy: string): Promise<DocumentRecord> {
    const employees = this.getEmployeesByIds(employeeIds);
    const docId = uuidv4();
    const fileName = `确认单_${new Date().toISOString().split('T')[0]}_${docId.slice(0, 8)}.pdf`;
    const filePath = path.join(documentsDir, fileName);

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    employees.forEach((emp, empIndex) => {
      if (empIndex > 0) {
        doc.addPage();
      }

      doc.fontSize(20).text('员工社保关系转移确认单', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`生成日期：${new Date().toLocaleDateString('zh-CN')}`);
      doc.moveDown();

      doc.fontSize(14).text('员工基本信息');
      doc.moveDown();
      doc.fontSize(12);
      doc.text(`姓名：${emp.name}`);
      doc.text(`身份证号：${emp.idCard}`);
      doc.text(`联系电话：${emp.phone || '-'}`);
      doc.text(`人员类型：${emp.employeeType === 'resignation' ? '离职' : emp.employeeType === 'transfer' ? '调岗' : '异地派驻'}`);
      doc.moveDown();

      doc.fontSize(14).text('社保转移信息');
      doc.moveDown();
      doc.fontSize(12);
      doc.text(`当前参保地：${emp.currentCity}`);
      doc.text(`转入地：${emp.targetCity}`);
      doc.text(`停保时间：${emp.stopDate || '-'}`);
      doc.moveDown();

      doc.fontSize(14).text('告知事项');
      doc.moveDown();
      doc.fontSize(11);
      doc.text('1. 本人已知晓社保关系转移的相关政策和流程。');
      doc.text('2. 本人确认所提供的信息真实有效。');
      doc.text('3. 本人已知晓办理社保转移所需的材料和时间节点。');
      doc.text('4. 本人同意委托企业代为办理社保关系转移手续。');
      doc.moveDown(2);

      doc.fontSize(12).text('员工签字：____________________');
      doc.text('日期：____________________');
      doc.moveDown();
      doc.text('企业经办人签字：____________________');
      doc.text('企业盖章：____________________');
    });

    doc.end();

    return new Promise((resolve, reject) => {
      stream.on('finish', () => {
        const record: DocumentRecord = {
          id: docId,
          type: 'confirmation',
          employeeIds: JSON.stringify(employeeIds),
          filePath,
          fileName,
          createdBy,
          createdAt: new Date().toISOString()
        };
        
        const db = getDb();
        (db as any).documents.push(record);
        persistDb(db);
        
        resolve(record);
      });
      stream.on('error', reject);
    });
  }

  async generateCorrection(employeeIds: string[], createdBy: string): Promise<DocumentRecord> {
    const db = getDb();
    const employees = this.getEmployeesByIds(employeeIds);
    const docId = uuidv4();
    const fileName = `补正通知_${new Date().toISOString().split('T')[0]}_${docId.slice(0, 8)}.pdf`;
    const filePath = path.join(documentsDir, fileName);

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    doc.fontSize(20).text('社保转移补正通知', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`通知日期：${new Date().toLocaleDateString('zh-CN')}`);
    doc.moveDown();

    employees.forEach((emp, index) => {
      const returnRecords = db.returnRecords.filter(r => r.employeeId === emp.id);
      
      if (index > 0) {
        doc.moveDown();
        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown();
      }

      doc.fontSize(14).text(`${index + 1}. ${emp.name}（身份证号：${emp.idCard}）`);
      doc.moveDown();
      doc.fontSize(12).text(`转入地：${emp.targetCity}`);
      doc.text(`退回次数：${emp.returnCount} 次`);
      doc.moveDown();

      if (returnRecords.length > 0) {
        doc.fontSize(13).text('需要补正的内容：');
        doc.moveDown();
        returnRecords.forEach((record, i) => {
          doc.fontSize(12).text(`${i + 1}. [${record.category}] ${record.reason}`);
        });
      } else {
        doc.fontSize(12).text('请核对以下信息是否完整准确：');
        doc.text('- 身份证号是否正确');
        doc.text('- 停保时间是否准确');
        doc.text('- 是否缺少单位证明');
        doc.text('- 是否存在重复缴费');
      }
      
      doc.moveDown();
      doc.fontSize(12).text('请于 7 个工作日内补正上述材料。');
    });

    doc.end();

    return new Promise((resolve, reject) => {
      stream.on('finish', () => {
        const record: DocumentRecord = {
          id: docId,
          type: 'correction',
          employeeIds: JSON.stringify(employeeIds),
          filePath,
          fileName,
          createdBy,
          createdAt: new Date().toISOString()
        };
        
        const db = getDb();
        (db as any).documents.push(record);
        persistDb(db);
        
        resolve(record);
      });
      stream.on('error', reject);
    });
  }

  async generateDocument(type: DocumentType, employeeIds: string[], createdBy: string): Promise<DocumentRecord> {
    switch (type) {
      case 'stamp_list':
        return this.generateStampList(employeeIds, createdBy);
      case 'confirmation':
        return this.generateConfirmation(employeeIds, createdBy);
      case 'correction':
        return this.generateCorrection(employeeIds, createdBy);
      default:
        throw new Error('不支持的文档类型');
    }
  }

  async getDocument(id: string): Promise<DocumentRecord | null> {
    const db = getDb();
    return (db as any).documents?.find((d: DocumentRecord) => d.id === id) || null;
  }

  async getDocuments(): Promise<DocumentRecord[]> {
    const db = getDb();
    return (db as any).documents || [];
  }

  getDocumentPath(fileName: string): string {
    return path.join(documentsDir, fileName);
  }

  getDocumentTypeName(type: DocumentType): string {
    return DOCUMENT_NAMES[type];
  }
}
