import { Router } from 'express';
import { StatisticsService } from '../services/StatisticsService.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import type { ApiResponse } from '../../shared/types.js';
import * as XLSX from 'xlsx';

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

router.get('/export', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { city, startDate, endDate } = req.query as any;
    const exportData = await statisticsService.getExportData(city, startDate, endDate);

    const wb = XLSX.utils.book_new();

    const summaryData = [
      ['指标', '数值'],
      ['办结成功数', exportData.summary.totalCompleted],
      ['退件数', exportData.summary.totalReturned],
      ['已处理总数', exportData.summary.totalProcessed],
      ['成功率(%)', exportData.summary.successRate],
      ['平均耗时(工作日)', exportData.summary.averageDays],
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
    ws1['!cols'] = [{ wch: 20 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, ws1, '总览');

    if (exportData.cityStats.length > 0) {
      const cityData = [
        ['城市', '成功数', '退件数', '处理总数', '成功率(%)'],
        ...exportData.cityStats.map(c => [c.city, c.completed, c.returned, c.total, c.rate])
      ];
      const ws2 = XLSX.utils.aoa_to_sheet(cityData);
      ws2['!cols'] = [{ wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 }];
      XLSX.utils.book_append_sheet(wb, ws2, '分城市统计');
    }

    if (exportData.returnDetailList.length > 0) {
      const returnData = [
        ['姓名', '身份证号', '转入城市', '人员类型', '退件日期', '退件原因'],
        ...exportData.returnDetailList.map(r => [
          r.name,
          r.idCard,
          r.targetCity,
          r.employeeType === 'resignation' ? '离职' : r.employeeType === 'transfer' ? '调岗' : '挂靠',
          r.returnedAt ? new Date(r.returnedAt).toLocaleDateString('zh-CN') : '',
          r.reasons
        ])
      ];
      const ws3 = XLSX.utils.aoa_to_sheet(returnData);
      ws3['!cols'] = [{ wch: 10 }, { wch: 22 }, { wch: 12 }, { wch: 10 }, { wch: 14 }, { wch: 40 }];
      XLSX.utils.book_append_sheet(wb, ws3, '退件明细');
    }

    if (exportData.rejectionReasons.length > 0) {
      const reasonData = [
        ['退件原因', '次数'],
        ...exportData.rejectionReasons.map(r => [r.reason, r.count])
      ];
      const ws4 = XLSX.utils.aoa_to_sheet(reasonData);
      ws4['!cols'] = [{ wch: 30 }, { wch: 10 }];
      XLSX.utils.book_append_sheet(wb, ws4, '退件原因');
    }

    if (exportData.materialDeficiencyList.length > 0) {
      const matData = [
        ['缺失材料', '涉及任务数'],
        ...exportData.materialDeficiencyList.map(m => [m.materialName, m.missingCount])
      ];
      const ws5 = XLSX.utils.aoa_to_sheet(matData);
      ws5['!cols'] = [{ wch: 20 }, { wch: 12 }];
      XLSX.utils.book_append_sheet(wb, ws5, '材料缺失汇总');
    }

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const filename = `复盘报表_${city || '全部城市'}_${startDate || '起始'}_${endDate || '至今'}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.send(buf);
  } catch (error) {
    console.error('Export statistics error:', error);
    res.status(500).json({
      code: 500,
      message: '导出失败',
      data: null
    } as ApiResponse);
  }
});

export default router;
