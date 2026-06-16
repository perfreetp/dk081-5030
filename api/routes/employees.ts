import { Router } from 'express';
import multer from 'multer';
import { EmployeeService } from '../services/EmployeeService.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import type { ApiResponse, EmployeeFilterParams } from '../../shared/types.js';

const router = Router();
const employeeService = new EmployeeService();

const storage = multer.memoryStorage();
const upload = multer({ storage });

router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { page, pageSize, status, employeeType, targetCity, keyword } = req.query;
    
    const params: EmployeeFilterParams & { page?: number; pageSize?: number } = {
      page: page ? parseInt(page as string) : undefined,
      pageSize: pageSize ? parseInt(pageSize as string) : undefined,
      status: status as any,
      employeeType: employeeType as any,
      targetCity: targetCity as string,
      keyword: keyword as string
    };

    const result = await employeeService.getEmployees(params);
    
    res.json({
      code: 200,
      message: '获取成功',
      data: result
    } as ApiResponse);
  } catch (error) {
    console.error('Get employees error:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      data: null
    } as ApiResponse);
  }
});

router.get('/cities', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const cities = await employeeService.getCities();
    
    res.json({
      code: 200,
      message: '获取成功',
      data: cities
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

router.get('/statistics', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const stats = await employeeService.getStatistics();
    
    res.json({
      code: 200,
      message: '获取成功',
      data: stats
    } as ApiResponse);
  } catch (error) {
    console.error('Get employee statistics error:', error);
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
    const employee = await employeeService.getEmployee(id);
    
    if (!employee) {
      return res.status(404).json({
        code: 404,
        message: '员工不存在',
        data: null
      } as ApiResponse);
    }
    
    res.json({
      code: 200,
      message: '获取成功',
      data: employee
    } as ApiResponse);
  } catch (error) {
    console.error('Get employee error:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      data: null
    } as ApiResponse);
  }
});

router.put('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const employee = await employeeService.updateEmployee(id, req.body);
    
    if (!employee) {
      return res.status(404).json({
        code: 404,
        message: '员工不存在',
        data: null
      } as ApiResponse);
    }
    
    res.json({
      code: 200,
      message: '更新成功',
      data: employee
    } as ApiResponse);
  } catch (error) {
    console.error('Update employee error:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      data: null
    } as ApiResponse);
  }
});

router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const success = await employeeService.deleteEmployee(id);
    
    if (!success) {
      return res.status(404).json({
        code: 404,
        message: '员工不存在',
        data: null
      } as ApiResponse);
    }
    
    res.json({
      code: 200,
      message: '删除成功',
      data: null
    } as ApiResponse);
  } catch (error) {
    console.error('Delete employee error:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      data: null
    } as ApiResponse);
  }
});

router.post('/import', authMiddleware, upload.single('file'), async (req: AuthRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        code: 400,
        message: '请上传文件',
        data: null
      } as ApiResponse);
    }

    const parsedData = employeeService.parseExcel(req.file.buffer);
    
    res.json({
      code: 200,
      message: '解析成功',
      data: {
        preview: parsedData,
        count: parsedData.length
      }
    } as ApiResponse);
  } catch (error) {
    console.error('Import employees error:', error);
    res.status(500).json({
      code: 500,
      message: '文件解析失败，请检查文件格式',
      data: null
    } as ApiResponse);
  }
});

router.post('/import/confirm', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { data } = req.body;
    
    if (!data || !Array.isArray(data)) {
      return res.status(400).json({
        code: 400,
        message: '数据格式错误',
        data: null
      } as ApiResponse);
    }

    const createdBy = req.user?.id || 'user_001';
    const employees = await employeeService.importEmployees(data, createdBy);
    
    res.json({
      code: 200,
      message: `成功导入 ${employees.length} 条数据`,
      data: employees
    } as ApiResponse);
  } catch (error) {
    console.error('Confirm import error:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      data: null
    } as ApiResponse);
  }
});

router.post('/validate', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { employeeIds } = req.body;
    
    if (!employeeIds || !Array.isArray(employeeIds)) {
      return res.status(400).json({
        code: 400,
        message: '请选择要校验的员工',
        data: null
      } as ApiResponse);
    }

    const results = await employeeService.validateEmployees(employeeIds);
    
    res.json({
      code: 200,
      message: `校验完成，共 ${results.length} 人`,
      data: results
    } as ApiResponse);
  } catch (error) {
    console.error('Validate employees error:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      data: null
    } as ApiResponse);
  }
});

router.get('/:id/validation', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const result = await employeeService.getValidationResult(id);
    
    res.json({
      code: 200,
      message: '获取成功',
      data: result
    } as ApiResponse);
  } catch (error) {
    console.error('Get validation result error:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      data: null
    } as ApiResponse);
  }
});

router.get('/returned/list', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { page, pageSize } = req.query;
    const result = await employeeService.getReturnedEmployees({
      page: page ? parseInt(page as string) : undefined,
      pageSize: pageSize ? parseInt(pageSize as string) : undefined
    });
    
    res.json({
      code: 200,
      message: '获取成功',
      data: result
    } as ApiResponse);
  } catch (error) {
    console.error('Get returned employees error:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      data: null
    } as ApiResponse);
  }
});

router.post('/:id/mark-returned', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { reason, category } = req.body;
    const markedBy = req.user?.id || 'user_001';
    
    if (!reason || !category) {
      return res.status(400).json({
        code: 400,
        message: '请填写退回原因和分类',
        data: null
      } as ApiResponse);
    }

    const employee = await employeeService.markReturned(id, reason, category, markedBy);
    
    if (!employee) {
      return res.status(404).json({
        code: 404,
        message: '员工不存在',
        data: null
      } as ApiResponse);
    }
    
    res.json({
      code: 200,
      message: '标记成功',
      data: employee
    } as ApiResponse);
  } catch (error) {
    console.error('Mark returned error:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      data: null
    } as ApiResponse);
  }
});

router.post('/:id/resubmit', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const employee = await employeeService.resubmit(id);
    
    if (!employee) {
      return res.status(404).json({
        code: 404,
        message: '员工不存在',
        data: null
      } as ApiResponse);
    }
    
    res.json({
      code: 200,
      message: '重新提交成功',
      data: employee
    } as ApiResponse);
  } catch (error) {
    console.error('Resubmit error:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      data: null
    } as ApiResponse);
  }
});

export default router;
