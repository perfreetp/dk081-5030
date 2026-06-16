import { Router } from 'express';
import fs from 'fs';
import { DocumentService } from '../services/DocumentService.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { RETURN_CATEGORIES } from '../repositories/ReturnRecordRepository.js';
import type { ApiResponse, DocumentType } from '../../shared/types.js';

const router = Router();
const documentService = new DocumentService();

router.get('/return-categories', authMiddleware, (req, res) => {
  res.json({
    code: 200,
    message: '获取成功',
    data: RETURN_CATEGORIES
  } as ApiResponse);
});

router.post('/generate', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { type, employeeIds } = req.body;
    const createdBy = req.user?.id || 'user_001';
    
    if (!type || !employeeIds || !Array.isArray(employeeIds)) {
      return res.status(400).json({
        code: 400,
        message: '请选择文档类型和员工',
        data: null
      } as ApiResponse);
    }

    const record = await documentService.generateDocument(type as DocumentType, employeeIds, createdBy);
    
    res.json({
      code: 200,
      message: `${documentService.getDocumentTypeName(type as DocumentType)}生成成功`,
      data: record
    } as ApiResponse);
  } catch (error) {
    console.error('Generate document error:', error);
    res.status(500).json({
      code: 500,
      message: '文档生成失败',
      data: null
    } as ApiResponse);
  }
});

router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const documents = await documentService.getDocuments();
    
    res.json({
      code: 200,
      message: '获取成功',
      data: documents
    } as ApiResponse);
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      data: null
    } as ApiResponse);
  }
});

router.get('/:id/download', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const document = await documentService.getDocument(id);
    
    if (!document) {
      return res.status(404).json({
        code: 404,
        message: '文档不存在',
        data: null
      } as ApiResponse);
    }

    const filePath = documentService.getDocumentPath(document.fileName);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        code: 404,
        message: '文件不存在',
        data: null
      } as ApiResponse);
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(document.fileName)}`);
    
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  } catch (error) {
    console.error('Download document error:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      data: null
    } as ApiResponse);
  }
});

router.get('/template', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const XLSX = await import('xlsx');
    
    const data = [
      {
        '姓名': '张三',
        '身份证号': '110101199001011234',
        '联系电话': '13800138000',
        '人员类型': '调岗',
        '当前参保地': '北京市',
        '转入地': '上海市',
        '停保时间': '2026-01-15',
        '是否已享受待遇': '否',
        '是否重复缴费': '否',
        '是否缺少单位证明': '否'
      },
      {
        '姓名': '李四',
        '身份证号': '310101199002022345',
        '联系电话': '13900139000',
        '人员类型': '离职',
        '当前参保地': '上海市',
        '转入地': '广州市',
        '停保时间': '2026-02-20',
        '是否已享受待遇': '否',
        '是否重复缴费': '否',
        '是否缺少单位证明': '否'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '社保转移名单');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename*=UTF-8\'\'%E7%A4%BE%E4%BF%9D%E8%BD%AC%E7%A7%BB%E7%A7%BB%E6%A8%A1%E6%9D%BF.xlsx');
    
    res.send(buffer);
  } catch (error) {
    console.error('Download template error:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      data: null
    } as ApiResponse);
  }
});

export default router;
