import { Router } from 'express';
import { AuthService } from '../services/AuthService.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import type { ApiResponse } from '../../shared/types.js';

const router = Router();
const authService = new AuthService();

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        code: 400,
        message: '用户名和密码不能为空',
        data: null
      } as ApiResponse);
    }

    const result = await authService.login(username, password);

    if (!result) {
      return res.status(401).json({
        code: 401,
        message: '用户名或密码错误',
        data: null
      } as ApiResponse);
    }

    res.json({
      code: 200,
      message: '登录成功',
      data: result
    } as ApiResponse);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      data: null
    } as ApiResponse);
  }
});

router.get('/me', authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        code: 401,
        message: '未登录',
        data: null
      } as ApiResponse);
    }

    const user = await authService.getCurrentUser(req.user.id);
    
    res.json({
      code: 200,
      message: '获取成功',
      data: user
    } as ApiResponse);
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      data: null
    } as ApiResponse);
  }
});

export default router;
