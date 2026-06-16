import { Router } from 'express';
import { TaskService } from '../services/TaskService.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import type { ApiResponse, CollaborationAttachment } from '../../shared/types.js';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
const taskService = new TaskService();

const UPLOAD_DIR = path.join(process.cwd(), 'storage', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}_${uuidv4()}${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const tasks = await taskService.getAllTasks();
    
    res.json({
      code: 200,
      message: '获取成功',
      data: tasks
    } as ApiResponse);
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      data: null
    } as ApiResponse);
  }
});

router.get('/split', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const tasks = await taskService.splitTasksByCity();
    
    res.json({
      code: 200,
      message: `已按城市拆分完成，共 ${tasks.length} 个任务`,
      data: tasks
    } as ApiResponse);
  } catch (error) {
    console.error('Split tasks error:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      data: null
    } as ApiResponse);
  }
});

router.get('/city/:city', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { city } = req.params;
    const task = await taskService.getTaskByCity(city);
    
    if (!task) {
      return res.status(404).json({
        code: 404,
        message: '任务不存在',
        data: null
      } as ApiResponse);
    }
    
    res.json({
      code: 200,
      message: '获取成功',
      data: task
    } as ApiResponse);
  } catch (error) {
    console.error('Get task by city error:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      data: null
    } as ApiResponse);
  }
});

router.get('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const task = await taskService.getTaskById(id);
    
    if (!task) {
      return res.status(404).json({
        code: 404,
        message: '任务不存在',
        data: null
      } as ApiResponse);
    }
    
    res.json({
      code: 200,
      message: '获取成功',
      data: task
    } as ApiResponse);
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      data: null
    } as ApiResponse);
  }
});

router.put('/:id/status', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const task = await taskService.updateTaskStatus(id, status);
    
    if (!task) {
      return res.status(404).json({
        code: 404,
        message: '任务不存在',
        data: null
      } as ApiResponse);
    }
    
    res.json({
      code: 200,
      message: '更新成功',
      data: task
    } as ApiResponse);
  } catch (error) {
    console.error('Update task status error:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      data: null
    } as ApiResponse);
  }
});

router.get('/:id/materials', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const materials = await taskService.getTaskMaterials(id);
    
    res.json({
      code: 200,
      message: '获取成功',
      data: materials
    } as ApiResponse);
  } catch (error) {
    console.error('Get task materials error:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      data: null
    } as ApiResponse);
  }
});

router.put('/:id/materials', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { materials } = req.body;
    
    if (!Array.isArray(materials)) {
      return res.status(400).json({
        code: 400,
        message: '材料数据格式错误',
        data: null
      } as ApiResponse);
    }

    const updatedMaterials = await taskService.updateTaskMaterials(id, materials);
    
    if (!updatedMaterials) {
      return res.status(404).json({
        code: 404,
        message: '任务不存在',
        data: null
      } as ApiResponse);
    }
    
    res.json({
      code: 200,
      message: '材料状态更新成功',
      data: updatedMaterials
    } as ApiResponse);
  } catch (error) {
    console.error('Update task materials error:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      data: null
    } as ApiResponse);
  }
});

router.get('/:id/timeline', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const timeline = await taskService.getTaskTimeline(id);
    
    res.json({
      code: 200,
      message: '获取成功',
      data: timeline
    } as ApiResponse);
  } catch (error) {
    console.error('Get task timeline error:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      data: null
    } as ApiResponse);
  }
});

router.put('/:id/timeline/:index', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id, index } = req.params;
    const { completed } = req.body;
    
    const timeline = await taskService.updateTimelineItem(id, parseInt(index), completed);
    
    if (!timeline) {
      return res.status(404).json({
        code: 404,
        message: '任务或时间节点不存在',
        data: null
      } as ApiResponse);
    }
    
    res.json({
      code: 200,
      message: '更新成功',
      data: timeline
    } as ApiResponse);
  } catch (error) {
    console.error('Update timeline item error:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      data: null
    } as ApiResponse);
  }
});

router.get('/:id/collaboration', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const records = await taskService.getCollaborationRecords(id);
    
    res.json({
      code: 200,
      message: '获取成功',
      data: records
    } as ApiResponse);
  } catch (error) {
    console.error('Get collaboration records error:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      data: null
    } as ApiResponse);
  }
});

router.post('/:id/collaboration', authMiddleware, upload.single('attachment'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { type, content, communicationTime, counterpart } = req.body;

    if (!type) {
      return res.status(400).json({
        code: 400,
        message: '类型不能为空',
        data: null
      } as ApiResponse);
    }
    if (!content && !req.file) {
      return res.status(400).json({
        code: 400,
        message: '内容或附件至少一项不能为空',
        data: null
      } as ApiResponse);
    }

    const createdBy = req.user?.name || '未知';

    let attachment: CollaborationAttachment | undefined;
    if (req.file) {
      attachment = {
        id: uuidv4(),
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        uploadedAt: new Date().toISOString(),
        uploadedBy: createdBy
      };
    }

    const extra: { attachment?: CollaborationAttachment; communicationTime?: string; counterpart?: string } = {};
    if (attachment) extra.attachment = attachment;
    if (communicationTime) extra.communicationTime = communicationTime;
    if (counterpart) extra.counterpart = counterpart;

    const record = await taskService.addCollaborationRecord(id, type, content || '', createdBy, extra);

    if (!record) {
      if (attachment) {
        try { fs.unlinkSync(path.join(UPLOAD_DIR, attachment.filename)); } catch (_e) { /* ignore */ }
      }
      return res.status(404).json({
        code: 404,
        message: '任务不存在',
        data: null
      } as ApiResponse);
    }

    res.json({
      code: 200,
      message: '添加成功',
      data: record
    } as ApiResponse);
  } catch (error) {
    console.error('Add collaboration record error:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      data: null
    } as ApiResponse);
  }
});

router.get('/collaboration/download/:filename', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { filename } = req.params;
    const safeName = path.basename(filename);
    const filePath = path.join(UPLOAD_DIR, safeName);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        code: 404,
        message: '文件不存在',
        data: null
      } as ApiResponse);
    }

    const db = (await import('../config/database.js')).getDb();
    let found = false;
    for (const t of db.tasks) {
      if (t.collaborationRecords?.some((r: any) => r.attachment?.filename === safeName)) {
        found = true;
        break;
      }
    }
    if (!found) {
      return res.status(403).json({
        code: 403,
        message: '无权访问',
        data: null
      } as ApiResponse);
    }

    res.download(filePath);
  } catch (error) {
    console.error('Download collaboration attachment error:', error);
    res.status(500).json({
      code: 500,
      message: '下载失败',
      data: null
    } as ApiResponse);
  }
});

router.delete('/:id/collaboration/:recordId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id, recordId } = req.params;
    const success = await taskService.deleteCollaborationRecord(id, recordId);
    
    if (!success) {
      return res.status(404).json({
        code: 404,
        message: '记录不存在',
        data: null
      } as ApiResponse);
    }
    
    res.json({
      code: 200,
      message: '删除成功',
      data: null
    } as ApiResponse);
  } catch (error) {
    console.error('Delete collaboration record error:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      data: null
    } as ApiResponse);
  }
});

export default router;
