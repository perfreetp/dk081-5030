import { Router } from 'express';
import { TaskService } from '../services/TaskService.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import type { ApiResponse } from '../../shared/types.js';

const router = Router();
const taskService = new TaskService();

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

export default router;
