import React, { useState, useEffect } from 'react';
import { employeeApi } from '../../api/employees.js';
import { documentApi } from '../../api/documents.js';
import { StatusBadge, EmployeeTypeBadge } from '../../components/StatusBadge/index.jsx';
import Modal from '../../components/Modal/index.jsx';
import type { Employee } from '../../../shared/types.js';

const Returns: React.FC = () => {
  const [employees, setEmployees] = useState<(Employee & { returnReasons: any[] })[]>([]);
  const [showMarkModal, setShowMarkModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [returnReason, setReturnReason] = useState('');
  const [returnCategory, setReturnCategory] = useState('');
  const [returnCategories, setReturnCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

  useEffect(() => {
    loadData();
    loadReturnCategories();
  }, [page]);

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await employeeApi.getReturnedEmployees({ page, pageSize });
      if (response.code === 200 && response.data) {
        setEmployees(response.data.items);
        setTotal(response.data.total);
      }
    } catch (error) {
      console.error('加载退回人员失败', error);
    } finally {
      setLoading(false);
    }
  };

  const loadReturnCategories = async () => {
    try {
      const response = await documentApi.getReturnCategories();
      if (response.code === 200 && response.data) {
        setReturnCategories(response.data);
        if (response.data.length > 0) {
          setReturnCategory(response.data[0]);
        }
      }
    } catch (error) {
      console.error('加载退回分类失败', error);
    }
  };

  const handleMarkReturned = (employee: Employee) => {
    setSelectedEmployee(employee);
    setReturnReason('');
    setShowMarkModal(true);
  };

  const handleConfirmReturn = async () => {
    if (!selectedEmployee || !returnReason.trim()) {
      alert('请填写退回原因');
      return;
    }

    setSubmitting(true);
    try {
      const response = await employeeApi.markReturned(
        selectedEmployee.id,
        returnReason.trim(),
        returnCategory
      );
      if (response.code === 200) {
        alert('标记成功');
        setShowMarkModal(false);
        loadData();
      }
    } catch (error) {
      console.error('标记退回失败', error);
      alert('标记失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResubmit = async (employeeId: string) => {
    if (!confirm('确认将此人员重新提交申报？')) return;

    try {
      const response = await employeeApi.resubmit(employeeId);
      if (response.code === 200) {
        alert('已重新提交');
        loadData();
      }
    } catch (error) {
      console.error('重新提交失败', error);
      alert('操作失败');
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      '材料不齐全': 'badge-danger',
      '信息不一致': 'badge-warning',
      '已超过时效': 'badge-danger',
      '重复缴费': 'badge-warning',
      '已享受待遇': 'badge-info',
      '其他原因': 'badge-neutral',
    };
    return colors[category] || 'badge-neutral';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-800 mb-2">退回管理</h1>
          <p className="text-neutral-500">对多次退回的人员单独标记原因，便于追溯和改进</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="card-body text-center">
            <p className="text-3xl font-bold text-danger-600">{total}</p>
            <p className="text-sm text-neutral-500 mt-1">退回总人数</p>
          </div>
        </div>
        <div className="card">
          <div className="card-body text-center">
            <p className="text-3xl font-bold text-warning-600">
              {employees.filter(e => e.returnCount === 1).length}
            </p>
            <p className="text-sm text-neutral-500 mt-1">首次退回</p>
          </div>
        </div>
        <div className="card">
          <div className="card-body text-center">
            <p className="text-3xl font-bold text-danger-600">
              {employees.filter(e => e.returnCount >= 2).length}
            </p>
            <p className="text-sm text-neutral-500 mt-1">多次退回</p>
          </div>
        </div>
        <div className="card">
          <div className="card-body text-center">
            <p className="text-3xl font-bold text-primary-600">
              {returnCategories.length}
            </p>
            <p className="text-sm text-neutral-500 mt-1">退回分类</p>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>姓名</th>
                <th>证件号</th>
                <th>类型</th>
                <th>当前参保地</th>
                <th>转入地</th>
                <th>退回次数</th>
                <th>最近退回原因</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-neutral-500">加载中...</td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-neutral-500">暂无退回人员</td>
                </tr>
              ) : (
                employees.map((employee) => (
                  <tr key={employee.id} className={employee.returnCount >= 2 ? 'bg-danger-50/50' : ''}>
                    <td className="font-medium">{employee.name}</td>
                    <td className="font-mono text-sm">{employee.idCard}</td>
                    <td><EmployeeTypeBadge type={employee.employeeType} /></td>
                    <td>{employee.currentCity}</td>
                    <td>{employee.targetCity}</td>
                    <td>
                      <span className={`badge ${employee.returnCount >= 2 ? 'badge-danger' : 'badge-warning'}`}>
                        {employee.returnCount}次
                      </span>
                    </td>
                    <td>
                      {employee.returnReasons && employee.returnReasons.length > 0 ? (
                        <div className="space-y-1">
                          <span className={`badge ${getCategoryColor(employee.returnReasons[0].category)}`}>
                            {employee.returnReasons[0].category}
                          </span>
                          <p className="text-xs text-neutral-500 mt-1 line-clamp-2">
                            {employee.returnReasons[0].reason}
                          </p>
                        </div>
                      ) : (
                        <span className="text-neutral-400 text-sm">-</span>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleMarkReturned(employee)}
                          className="text-warning-600 hover:text-warning-700 text-sm"
                        >
                          标记退回
                        </button>
                        <span className="text-neutral-300">|</span>
                        <button
                          onClick={() => handleResubmit(employee.id)}
                          className="text-primary-600 hover:text-primary-700 text-sm"
                        >
                          重新提交
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div className="flex items-center justify-between mt-6 pt-4 border-t border-neutral-200">
            <span className="text-sm text-neutral-500">共 {total} 条记录</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-ghost px-3 py-1"
              >
                上一页
              </button>
              <span className="text-sm text-neutral-600">第 {page} 页</span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page * pageSize >= total}
                className="btn-ghost px-3 py-1"
              >
                下一页
              </button>
            </div>
          </div>
        </div>
      </div>

      <Modal
        isOpen={showMarkModal}
        onClose={() => setShowMarkModal(false)}
        title="标记退回原因"
        footer={
          <>
            <button onClick={() => setShowMarkModal(false)} className="btn-secondary">
              取消
            </button>
            <button onClick={handleConfirmReturn} className="btn-primary" disabled={submitting}>
              {submitting ? '提交中...' : '确认标记'}
            </button>
          </>
        }
      >
        {selectedEmployee && (
          <div className="space-y-6">
            <div className="p-4 bg-neutral-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-neutral-800">{selectedEmployee.name}</p>
                  <p className="text-sm text-neutral-500">{selectedEmployee.idCard}</p>
                </div>
                <div>
                  <EmployeeTypeBadge type={selectedEmployee.employeeType} />
                </div>
              </div>
            </div>

            <div>
              <label className="input-label">退回分类</label>
              <select
                className="input"
                value={returnCategory}
                onChange={(e) => setReturnCategory(e.target.value)}
              >
                {returnCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="input-label">详细原因</label>
              <textarea
                className="input min-h-[120px]"
                placeholder="请详细描述退回原因，便于后续追溯和改进..."
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
              />
            </div>

            {selectedEmployee.returnCount > 0 && (
              <div className="p-4 bg-warning-50 rounded-lg">
                <p className="text-sm text-warning-700 font-medium mb-2">
                  ⚠️ 该人员已被退回 {selectedEmployee.returnCount} 次
                </p>
                {selectedEmployee.returnReasons?.map((reason, index) => (
                  <div key={index} className="text-sm text-warning-600 mt-2">
                    <span className="font-medium">第{index + 1}次：</span>
                    [{reason.category}] {reason.reason}
                    <span className="text-warning-400 ml-2">
                      {new Date(reason.markedAt).toLocaleDateString('zh-CN')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Returns;
