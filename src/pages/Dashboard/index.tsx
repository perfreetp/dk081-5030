import React, { useState, useEffect } from 'react';
import { statisticsApi } from '../../api/statistics.js';
import type { DashboardStats, TodoItem } from '../../../shared/types.js';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statsRes, todosRes] = await Promise.all([
        statisticsApi.getDashboardStats(),
        statisticsApi.getTodos()
      ]);

      if (statsRes.code === 200 && statsRes.data) {
        setStats(statsRes.data);
      }
      if (todosRes.code === 200 && todosRes.data) {
        setTodos(todosRes.data);
      }
    } catch (error) {
      console.error('加载数据失败', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="text-neutral-500">加载中...</span>
      </div>
    );
  }

  const statCards = [
    { label: '总人数', value: stats?.totalEmployees || 0, icon: '👥', color: 'primary' },
    { label: '待校验', value: stats?.pendingValidation || 0, icon: '⏳', color: 'warning' },
    { label: '办理中', value: stats?.inProgress || 0, icon: '🔄', color: 'info' },
    { label: '已完成', value: stats?.completed || 0, icon: '✅', color: 'success' },
    { label: '已退回', value: stats?.returned || 0, icon: '↩️', color: 'danger' },
    { label: '成功率', value: `${stats?.successRate || 0}%`, icon: '📈', color: 'success' },
  ];

  const colorClasses: Record<string, string> = {
    primary: 'from-primary-500 to-primary-600',
    warning: 'from-warning-500 to-warning-600',
    info: 'from-primary-400 to-primary-500',
    success: 'from-success-500 to-success-600',
    danger: 'from-danger-500 to-danger-600',
  };

  const getCityProgressWidth = (count: number) => {
    const total = stats?.totalEmployees || 1;
    const percentage = Math.min((count / total) * 100, 100);
    return `${percentage}%`;
  };

  const getPriorityBadge = (priority: string) => {
    const className = priority === 'high' ? 'badge-danger' :
                      priority === 'medium' ? 'badge-warning' : 'badge-info';
    const label = priority === 'high' ? '高优先级' :
                  priority === 'medium' ? '中优先级' : '低优先级';
    return { className, label };
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-neutral-800 mb-2">仪表板</h1>
        <p className="text-neutral-500">查看社保转移申报工作总览</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map((stat, index) => (
          <div key={index} className="card hover:shadow-card-hover transition-shadow">
            <div className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl">{stat.icon}</span>
                <div className={`px-2.5 h-1 rounded-full bg-gradient-to-r ${colorClasses[stat.color]}`}></div>
              </div>
              <p className="text-3xl font-bold text-neutral-800">{stat.value}</p>
              <p className="text-sm text-neutral-500 mt-1">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold text-neutral-800">📋 待办事项</h3>
          </div>
          <div className="card-body">
            {todos.length === 0 ? (
              <p className="text-center text-neutral-400 py-8">暂无待办事项</p>
            ) : (
              <div className="space-y-3">
                {todos.map((todo, index) => {
                  const badge = getPriorityBadge(todo.priority);
                  return (
                    <div
                      key={index}
                      className="flex items-start gap-4 p-4 rounded-lg bg-neutral-50 hover:bg-neutral-100 transition-colors"
                    >
                      <span className="text-lg">{todo.icon}</span>
                      <div className="flex-1">
                        <p className="font-medium text-neutral-800">{todo.title}</p>
                        <p className="text-sm text-neutral-500">{todo.description}</p>
                        <div className="flex items-center gap-4 mt-2">
                          <span className={`badge ${badge.className}`}>
                            {badge.label}
                          </span>
                          <span className="text-xs text-neutral-400">{todo.dueDate}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold text-neutral-800">📊 各城市分布</h3>
          </div>
          <div className="card-body">
            {stats?.byCity && stats.byCity.length === 0 ? (
              <p className="text-center text-neutral-400">暂无数据</p>
            ) : (
              <div className="space-y-4">
                {stats?.byCity?.map((item, index) => (
                  <div key={index}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-neutral-600">{item.city}</span>
                      <span className="text-sm font-medium text-neutral-800">{item.count} 人</span>
                    </div>
                    <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary-400 to-primary-600 rounded-full"
                        style={{ width: getCityProgressWidth(item.count) }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold text-neutral-800">📤 按类型分布</h3>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-neutral-600">离职</span>
                <span className="font-medium text-neutral-800">{stats?.byType?.resignation || 0} 人</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-600">调岗</span>
                <span className="font-medium text-neutral-800">{stats?.byType?.transfer || 0} 人</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-600">异地派驻</span>
                <span className="font-medium text-neutral-800">{stats?.byType?.assignment || 0} 人</span>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold text-neutral-800">⚠️ 校验问题</h3>
          </div>
          <div className="card-body">
            <div className="text-center">
              <p className="text-4xl font-bold text-danger-600 mb-2">{stats?.validationIssues || 0}</p>
              <p className="text-sm text-neutral-500">项待处理问题</p>
              <div className="mt-4 p-4 bg-danger-50 rounded-lg">
                <p className="text-sm text-danger-600">
                  {stats?.validationIssues
                    ? '请前往信息校验页面处理这些问题'
                    : '所有人员信息校验通过'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold text-neutral-800">⏱️ 平均办理时间</h3>
          </div>
          <div className="card-body">
            <div className="text-center">
              <p className="text-4xl font-bold text-primary-600 mb-2">{stats?.averageTime || 0}</p>
              <p className="text-sm text-neutral-500">工作日</p>
              <div className="mt-4 p-4 bg-primary-50 rounded-lg">
                <p className="text-sm text-primary-600">
                  {stats?.averageTime && stats.averageTime > 15
                    ? '办理周期较长，建议优化流程'
                    : '办理效率良好'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
