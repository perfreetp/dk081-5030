import React, { useState, useEffect } from 'react';
import { employeeApi } from '../../api/employees.js';
import { StatusBadge, EmployeeTypeBadge, ValidationStatusBadge } from '../../components/StatusBadge/index.jsx';
import Modal from '../../components/Modal/index.jsx';
import type { Employee, ValidationResult, ValidationItem, EmployeeStatus, EmployeeType } from '../../../shared/types.js';

const Validation: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [validating, setValidating] = useState(false);
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedResult, setSelectedResult] = useState<ValidationResult | null>(null);
  const [filter, setFilter] = useState({ status: undefined as EmployeeStatus | undefined, employeeType: undefined as EmployeeType | undefined, currentCity: '', targetCity: '' });
  const [cities, setCities] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

  useEffect(() => {
    loadData();
    loadCities();
  }, [filter, page]);

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await employeeApi.getEmployees({ ...filter, page, pageSize });
      if (response.code === 200 && response.data) {
        setEmployees(response.data.items);
        setTotal(response.data.total);
      }
    } catch (error) {
      console.error('加载数据失败', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCities = async () => {
    try {
      const response = await employeeApi.getCities();
      if (response.code === 200 && response.data) {
        setCities(response.data);
      }
    } catch (error) {
      console.error('加载城市列表失败', error);
    }
  };

  const handleSelectAll = () => {
    if (selectedEmployees.length === employees.length) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(employees.map(e => e.id));
    }
  };

  const handleSelectOne = (id: string) => {
    if (selectedEmployees.includes(id)) {
      setSelectedEmployees(selectedEmployees.filter(e => e !== id));
    } else {
      setSelectedEmployees([...selectedEmployees, id]);
    }
  };

  const handleValidate = async () => {
    if (selectedEmployees.length === 0) {
      alert('请先选择要校验的人员');
      return;
    }

    setValidating(true);
    try {
      const response = await employeeApi.validateEmployees(selectedEmployees);
      if (response.code === 200 && response.data) {
        setValidationResults(response.data);
      }
    } catch (error) {
      console.error('校验失败', error);
    } finally {
      setValidating(false);
    }
  };

  const handleViewDetail = async (employeeId: string) => {
    try {
      const response = await employeeApi.getValidationResult(employeeId);
      if (response.code === 200 && response.data) {
        setSelectedResult(response.data);
        setShowDetailModal(true);
      }
    } catch (error) {
      console.error('获取校验详情失败', error);
    }
  };

  const handleBulkValidate = async () => {
    if (employees.length === 0) {
      alert('暂无待校验人员');
      return;
    }

    setValidating(true);
    try {
      const allIds = employees.map(e => e.id);
      const response = await employeeApi.validateEmployees(allIds);
      if (response.code === 200 && response.data) {
        setValidationResults(response.data);
        loadData();
      }
    } catch (error) {
      console.error('批量校验失败', error);
    } finally {
      setValidating(false);
    }
  };

  const validationLabels: Record<string, string> = {
    name: '姓名',
    idCard: '证件号',
    currentCity: '当前参保地',
    targetCity: '转入地',
    stopDate: '停保时间',
    hasBenefits: '已享受待遇',
    hasDuplicate: '重复缴费',
    missingCertificate: '缺少单位证明',
  };

  const getValidationSummary = (result?: ValidationResult) => {
    if (!result) return { pass: 0, fail: 0, warning: 0 };
    const items = result.items;
    return {
      pass: items.filter(i => i.pass).length,
      fail: items.filter(i => !i.pass).length,
      warning: 0,
    };
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-800 mb-2">信息校验</h1>
          <p className="text-neutral-500">逐人检查8项关键信息，确保申报材料完整准确</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleBulkValidate} className="btn-secondary" disabled={validating}>
            <span className="mr-2">{validating ? '⏳' : '🔍'}</span>
            {validating ? '校验中...' : '全部校验'}
          </button>
          <button onClick={handleValidate} className="btn-primary" disabled={selectedEmployees.length === 0 || validating}>
            <span className="mr-2">✓</span>
            校验选中 ({selectedEmployees.length})
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="input-label">状态</label>
              <select
                className="input"
                value={filter.status}
                onChange={(e) => { setFilter({ ...filter, status: e.target.value as EmployeeStatus | undefined }); setPage(1); }}
              >
                <option value="">全部</option>
                <option value="pending">待校验</option>
                <option value="validated">已校验</option>
                <option value="in_progress">办理中</option>
                <option value="completed">已完成</option>
                <option value="returned">已退回</option>
              </select>
            </div>
            <div>
              <label className="input-label">人员类型</label>
              <select
                className="input"
                value={filter.employeeType || ''}
                onChange={(e) => { setFilter({ ...filter, employeeType: e.target.value ? e.target.value as EmployeeType : undefined }); setPage(1); }}
              >
                <option value="">全部</option>
                <option value="resignation">离职</option>
                <option value="transfer">调岗</option>
                <option value="assignment">异地派驻</option>
              </select>
            </div>
            <div>
              <label className="input-label">当前参保地</label>
              <select
                className="input"
                value={filter.currentCity}
                onChange={(e) => { setFilter({ ...filter, currentCity: e.target.value }); setPage(1); }}
              >
                <option value="">全部</option>
                {cities.map(city => <option key={city} value={city}>{city}</option>)}
              </select>
            </div>
            <div>
              <label className="input-label">转入地</label>
              <select
                className="input"
                value={filter.targetCity}
                onChange={(e) => { setFilter({ ...filter, targetCity: e.target.value }); setPage(1); }}
              >
                <option value="">全部</option>
                {cities.map(city => <option key={city} value={city}>{city}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      {validationResults.length > 0 && (
        <div className="card border-primary-300 bg-primary-50/50">
          <div className="card-body">
            <h3 className="font-semibold text-primary-800 mb-4">📊 本次校验结果</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-lg text-center">
                <p className="text-2xl font-bold text-neutral-800">{validationResults.length}</p>
                <p className="text-sm text-neutral-500">校验人数</p>
              </div>
              <div className="bg-white p-4 rounded-lg text-center">
                <p className="text-2xl font-bold text-success-600">
                  {validationResults.filter(r => r.overallPass).length}
                </p>
                <p className="text-sm text-neutral-500">全部通过</p>
              </div>
              <div className="bg-white p-4 rounded-lg text-center">
                <p className="text-2xl font-bold text-warning-600">0</p>
                <p className="text-sm text-neutral-500">需确认</p>
              </div>
              <div className="bg-white p-4 rounded-lg text-center">
                <p className="text-2xl font-bold text-danger-600">
                  {validationResults.filter(r => !r.overallPass).length}
                </p>
                <p className="text-sm text-neutral-500">未通过</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-body overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th className="w-12">
                  <input
                    type="checkbox"
                    checked={selectedEmployees.length === employees.length && employees.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-neutral-300"
                  />
                </th>
                <th>姓名</th>
                <th>证件号</th>
                <th>人员类型</th>
                <th>当前参保地</th>
                <th>转入地</th>
                <th>状态</th>
                <th>校验结果</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-neutral-500">加载中...</td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-neutral-500">暂无数据</td>
                </tr>
              ) : (
                employees.map((employee) => {
                  const result = validationResults.find(r => r.employeeId === employee.id);
                  const summary = getValidationSummary(result);
                  return (
                    <tr key={employee.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedEmployees.includes(employee.id)}
                          onChange={() => handleSelectOne(employee.id)}
                          className="rounded border-neutral-300"
                        />
                      </td>
                      <td className="font-medium">{employee.name}</td>
                      <td className="font-mono text-sm">{employee.idCard}</td>
                      <td><EmployeeTypeBadge type={employee.employeeType} /></td>
                      <td>{employee.currentCity}</td>
                      <td>{employee.targetCity}</td>
                      <td><StatusBadge status={employee.status} /></td>
                      <td>
                        {result ? (
                          <div className="flex items-center gap-2">
                            {summary.fail > 0 && <span className="text-danger-600 font-medium">{summary.fail}项未通过</span>}
                            {summary.warning > 0 && <span className="text-warning-600 font-medium">{summary.warning}项待确认</span>}
                            {summary.fail === 0 && summary.warning === 0 && (
                              <span className="text-success-600 font-medium">全部通过</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-neutral-400">未校验</span>
                        )}
                      </td>
                      <td>
                        <button
                          onClick={() => handleViewDetail(employee.id)}
                          className="text-primary-600 hover:text-primary-700 text-sm"
                        >
                          查看详情
                        </button>
                      </td>
                    </tr>
                  );
                })
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
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title="校验详情"
        size="lg"
        footer={
          <button onClick={() => setShowDetailModal(false)} className="btn-primary">
            关闭
          </button>
        }
      >
        {selectedResult && (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg">
              <div>
                <p className="font-medium text-neutral-800">{employees.find(e => e.id === selectedResult.employeeId)?.name || '-'}</p>
                <p className="text-sm text-neutral-500">{employees.find(e => e.id === selectedResult.employeeId)?.idCard || '-'}</p>
              </div>
              <ValidationStatusBadge status={selectedResult.overallPass ? 'pass' : 'fail'} />
            </div>

            <div className="space-y-4">
              {selectedResult.items.map((item: ValidationItem) => (
                <div key={item.key} className="p-4 border border-neutral-200 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <ValidationStatusBadge status={item.pass ? 'pass' : 'fail'} showLabel={false} />
                      <div>
                        <p className="font-medium text-neutral-800">{validationLabels[item.key] || item.name}</p>
                        <p className="text-sm text-neutral-500">{item.message}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Validation;
