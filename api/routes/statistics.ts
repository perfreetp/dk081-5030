import { Router } from 'express';
import { StatisticsService } from '../services/StatisticsService.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import type { ApiResponse } from '../../shared/types.js';

const router = Router();
const statisticsService = new StatisticsService();

router.get('/cities', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const data = await statisticsService.getAvailableCities();
    
    res.json({
      code: 200,
      message: '获取成功',
      data
    } as ApiResponse);
  } catch (error) {
    console.error('Get cities error:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      data: null
    } as ApiResponse);
  }
});

router.get('/success-rate', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { city, startDate, endDate } = req.query as any;
    const data = await statisticsService.getSuccessRateData(city, startDate, endDate);
    
    res.json({
      code: 200,
      message: '获取成功',
      data
    } as ApiResponse);
  } catch (error) {
    console.error('Get success rate error:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      data: null
    } as ApiResponse);
  }
});

router.get('/average-time', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { city, startDate, endDate } = req.query as any;
    const data = await statisticsService.getAverageTimeData(city, startDate, endDate);
    
    res.json({
      code: 200,
      message: '获取成功',
      data
    } as ApiResponse);
  } catch (error) {
    console.error('Get average time error:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      data: null
    } as ApiResponse);
  }
});

router.get('/rejection-reasons', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { city, startDate, endDate } = req.query as any;
    const data = await statisticsService.getRejectionReasons(city, startDate, endDate);
    
    res.json({
      code: 200,
      message: '获取成功',
      data
    } as ApiResponse);
  } catch (error) {
    console.error('Get rejection reasons error:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      data: null
    } as ApiResponse);
  }
});

export default router;
