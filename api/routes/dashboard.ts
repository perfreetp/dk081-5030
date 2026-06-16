import { Router } from 'express';
import { StatisticsService } from '../services/StatisticsService.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import type { ApiResponse } from '../../shared/types.js';

const router = Router();
const statisticsService = new StatisticsService();

router.get('/stats', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const stats = await statisticsService.getDashboardStats();
    
    res.json({
      code: 200,
      message: '获取成功',
      data: stats
    } as ApiResponse);
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      data: null
    } as ApiResponse);
  }
});

router.get('/todos', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const todos = await statisticsService.getTodoList();
    
    res.json({
      code: 200,
      message: '获取成功',
      data: todos
    } as ApiResponse);
  } catch (error) {
    console.error('Get todos error:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      data: null
    } as ApiResponse);
  }
});

export default router;
