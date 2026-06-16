import React, { useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import { statisticsApi, type StatisticsFilter } from '../../api/statistics.js';
import type { SuccessRateData, AverageTimeData, RejectionReasonData } from '../../../shared/types.js';

const Statistics: React.FC = () => {
  const [successRateData, setSuccessRateData] = useState<SuccessRateData[]>([]);
  const [averageTimeData, setAverageTimeData] = useState<AverageTimeData[]>([]);
  const [rejectionData, setRejectionData] = useState<RejectionReasonData[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatisticsFilter>({
    city: '',
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    loadCities();
  }, []);

  useEffect(() => {
    loadData();
  }, [filter]);

  const loadCities = async () => {
    try {
      const res = await statisticsApi.getCities();
      if (res.code === 200 && res.data) {
        setCities(res.data);
      }
    } catch (error) {
      console.error('加载城市列表失败', error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [successRes, timeRes, rejectionRes] = await Promise.all([
        statisticsApi.getSuccessRate(filter),
        statisticsApi.getAverageTime(filter),
        statisticsApi.getRejectionReasons(filter)
      ]);

      if (successRes.code === 200 && successRes.data) {
        setSuccessRateData(successRes.data);
      }
      if (timeRes.code === 200 && timeRes.data) {
        setAverageTimeData(timeRes.data);
      }
      if (rejectionRes.code === 200 && rejectionRes.data) {
        setRejectionData(rejectionRes.data);
      }
    } catch (error) {
      console.error('加载统计数据失败', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResetFilter = () => {
    setFilter({ city: '', startDate: '', endDate: '' });
  };

  const successRateOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' }
    },
    legend: {
      data: ['成功数', '失败数', '成功率'],
      top: 0
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '15%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: successRateData.map(d => d.city)
    },
    yAxis: [
      {
        type: 'value',
        name: '数量',
        min: 0
      },
      {
        type: 'value',
        name: '成功率(%)',
        min: 0,
        max: 100,
        axisLabel: { formatter: '{value}%' }
      }
    ],
    series: [
      {
        name: '成功数',
        type: 'bar',
        stack: 'total',
        itemStyle: { color: '#22c55e' },
        data: successRateData.map(d => d.successCount)
      },
      {
        name: '失败数',
        type: 'bar',
        stack: 'total',
        itemStyle: { color: '#ef4444' },
        data: successRateData.map(d => d.failCount)
      },
      {
        name: '成功率',
        type: 'line',
        yAxisIndex: 1,
        itemStyle: { color: '#0ea5e9' },
        lineStyle: { width: 3 },
        symbol: 'circle',
        symbolSize: 8,
        data: successRateData.map(d => d.rate)
      }
    ]
  };

  const averageTimeOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: '{b}: {c} 工作日'
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'value',
      name: '工作日',
      min: 0
    },
    yAxis: {
      type: 'category',
      data: averageTimeData.map(d => d.city)
    },
    series: [
      {
        type: 'bar',
        itemStyle: {
          color: (params: any) => {
            const value = params.value;
            if (value <= 10) return '#22c55e';
            if (value <= 20) return '#f59e0b';
            return '#ef4444';
          }
        },
        label: {
          show: true,
          position: 'right',
          formatter: '{c} 工作日'
        },
        data: averageTimeData.map(d => d.days)
      }
    ]
  };

  const rejectionOption = {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)'
    },
    legend: {
      orient: 'vertical',
      left: 'left',
      top: 'center'
    },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['65%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 8,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: false,
          position: 'center'
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 18,
            fontWeight: 'bold',
            formatter: '{b}\n{c}次 ({d}%)'
          }
        },
        labelLine: {
          show: false
        },
        data: rejectionData.map(d => ({
          value: d.count,
          name: d.reason
        }))
      }
    ]
  };

  const totalSuccess = successRateData.reduce((sum, d) => sum + d.successCount, 0);
  const totalFail = successRateData.reduce((sum, d) => sum + d.failCount, 0);
  const overallSuccessRate = totalSuccess + totalFail > 0
    ? ((totalSuccess / (totalSuccess + totalFail)) * 100).toFixed(1)
    : '0';
  const avgDays = averageTimeData.length > 0
    ? (averageTimeData.reduce((sum, d) => sum + d.days, 0) / averageTimeData.length).toFixed(1)
    : '0';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="text-neutral-500">加载中...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-800 mb-2">统计分析</h1>
          <p className="text-neutral-500">汇总各地区办理成功率、平均耗时和高频退件原因</p>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            <div>
              <label className="input-label">城市</label>
              <select
                className="input"
                value={filter.city || ''}
                onChange={(e) => setFilter({ ...filter, city: e.target.value || undefined })}
              >
                <option value="">全部城市</option>
                {cities.map(city => <option key={city} value={city}>{city}</option>)}
              </select>
            </div>
            <div>
              <label className="input-label">办结/退件起始</label>
              <input
                type="date"
                className="input"
                value={filter.startDate || ''}
                onChange={(e) => setFilter({ ...filter, startDate: e.target.value || undefined })}
              />
            </div>
            <div>
              <label className="input-label">办结/退件截止</label>
              <input
                type="date"
                className="input"
                value={filter.endDate || ''}
                onChange={(e) => setFilter({ ...filter, endDate: e.target.value || undefined })}
              />
            </div>
            <div className="md:col-span-2 flex gap-3">
              <button
                onClick={handleResetFilter}
                className="btn-secondary flex-1"
              >
                重置筛选
              </button>
              <a
                href={statisticsApi.getExportUrl(filter)}
                className="btn-primary flex-1 text-center"
              >
                导出报表
              </a>
            </div>
          </div>
          {(filter.city || filter.startDate || filter.endDate) && (
            <div className="mt-3 text-sm text-neutral-500">
              当前筛选：
              {filter.city && <span className="ml-2 badge badge-primary">城市：{filter.city}</span>}
              {filter.startDate && <span className="ml-2 badge badge-primary">办结起始：{filter.startDate}</span>}
              {filter.endDate && <span className="ml-2 badge badge-primary">办结截止：{filter.endDate}</span>}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="card-body text-center">
            <p className="text-3xl font-bold text-primary-600">{totalSuccess + totalFail}</p>
            <p className="text-sm text-neutral-500 mt-1">总申报数</p>
          </div>
        </div>
        <div className="card">
          <div className="card-body text-center">
            <p className="text-3xl font-bold text-success-600">{overallSuccessRate}%</p>
            <p className="text-sm text-neutral-500 mt-1">总体成功率</p>
          </div>
        </div>
        <div className="card">
          <div className="card-body text-center">
            <p className="text-3xl font-bold text-warning-600">{avgDays}</p>
            <p className="text-sm text-neutral-500 mt-1">平均耗时(工作日)</p>
          </div>
        </div>
        <div className="card">
          <div className="card-body text-center">
            <p className="text-3xl font-bold text-danger-600">{totalFail}</p>
            <p className="text-sm text-neutral-500 mt-1">退件总数</p>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold text-neutral-800">📊 各地区办理成功率</h3>
        </div>
        <div className="card-body">
          <ReactECharts
            option={successRateOption}
            style={{ height: '400px' }}
            notMerge={true}
            lazyUpdate={true}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold text-neutral-800">⏱️ 各地区平均办理耗时</h3>
          </div>
          <div className="card-body">
            <ReactECharts
              option={averageTimeOption}
              style={{ height: '350px' }}
              notMerge={true}
              lazyUpdate={true}
            />
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold text-neutral-800">📈 高频退件原因分布</h3>
          </div>
          <div className="card-body">
            <ReactECharts
              option={rejectionOption}
              style={{ height: '350px' }}
              notMerge={true}
              lazyUpdate={true}
            />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold text-neutral-800">📋 详细统计表</h3>
        </div>
        <div className="card-body overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>城市</th>
                <th>成功数</th>
                <th>失败数</th>
                <th>成功率</th>
                <th>平均耗时</th>
                <th>主要退件原因</th>
              </tr>
            </thead>
            <tbody>
              {successRateData.map((item, index) => {
                const timeData = averageTimeData.find(t => t.city === item.city);
                const topReason = rejectionData[0];
                return (
                  <tr key={index}>
                    <td className="font-medium">{item.city}</td>
                    <td className="text-success-600">{item.successCount}</td>
                    <td className="text-danger-600">{item.failCount}</td>
                    <td>
                      <span className={`badge ${
                        item.rate >= 90 ? 'badge-success' :
                        item.rate >= 70 ? 'badge-warning' : 'badge-danger'
                      }`}>
                        {item.rate}%
                      </span>
                    </td>
                    <td>{timeData?.days || '-'} 工作日</td>
                    <td>
                      {topReason ? (
                        <span className="badge-warning">{topReason.reason} ({topReason.count}次)</span>
                      ) : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Statistics;
