import React, { useState, useEffect } from 'react';
import { documentApi } from '../../api/documents.js';
import { employeeApi } from '../../api/employees.js';
import { StatusBadge, EmployeeTypeBadge } from '../../components/StatusBadge/index.jsx';
import Modal from '../../components/Modal/index.jsx';
import type { Employee, DocumentType, EmployeeStatus, EmployeeType } from '../../../shared/types.js';
import type { DocumentRecord } from '../../api/documents.js';

const Documents: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [documentType, setDocumentType] = useState<DocumentType>('stamp_list');
  const [returnCategories, setReturnCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: 'validated' as EmployeeStatus | undefined, employeeType: undefined as EmployeeType | undefined });

  useEffect(() => {
    loadData();
    loadDocuments();
    loadReturnCategories();
  }, [filter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await employeeApi.getEmployees(filter);
      if (response.code === 200 && response.data) {
        setEmployees(response.data.items);
      }
    } catch (error) {
      console.error('加载人员列表失败', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDocuments = async () => {
    try {
      const response = await documentApi.getDocuments();
      if (response.code === 200 && response.data) {
        setDocuments(response.data);
      }
    } catch (error) {
      console.error('加载文档列表失败', error);
    }
  };

  const loadReturnCategories = async () => {
    try {
      const response = await documentApi.getReturnCategories();
      if (response.code === 200 && response.data) {
        setReturnCategories(response.data);
      }
    } catch (error) {
      console.error('加载退回分类失败', error);
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

  const handleGenerate = async () => {
    if (selectedEmployees.length === 0) {
      alert('请先选择要生成文档的人员');
      return;
    }

    setGenerating(true);
    try {
      const response = await documentApi.generateDocument(documentType, selectedEmployees);
      if (response.code === 200 && response.data) {
        alert('文档生成成功！');
        setShowGenerateModal(false);
        loadDocuments();
        setSelectedEmployees([]);
      }
    } catch (error) {
      console.error('生成文档失败', error);
      alert('生成文档失败');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async (doc: DocumentRecord) => {
    try {
      const blob = await documentApi.downloadDocument(doc.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.fileName;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('下载文档失败', error);
      alert('下载失败');
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const blob = await documentApi.downloadTemplate();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = '社保转移人员名单模板.xlsx';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('下载模板失败', error);
      alert('下载失败');
    }
  };

  const documentTypeConfig: Record<DocumentType, { label: string; icon: string; description: string }> = {
    stamp_list: { label: '企业盖章清单', icon: '📋', description: '企业盖章的人员清单，用于社保经办机构办理' },
    confirmation: { label: '员工签署确认单', icon: '✍️', description: '员工个人确认的社保转移申请单' },
    correction: { label: '补正通知', icon: '📝', description: '材料补正通知书，用于退回后告知员工' },
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-800 mb-2">文档生成</h1>
          <p className="text-neutral-500">生成企业盖章清单、员工签署确认单和补正通知</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleDownloadTemplate} className="btn-secondary">
            <span className="mr-2">📄</span>
            下载导入模板
          </button>
          <button
            onClick={() => setShowGenerateModal(true)}
            className="btn-primary"
            disabled={selectedEmployees.length === 0}
          >
            <span className="mr-2">📄</span>
            生成文档 ({selectedEmployees.length})
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <div className="card-header flex items-center justify-between">
              <h3 className="font-semibold text-neutral-800">选择人员</h3>
              <div className="flex gap-3">
                <select
                  className="input w-auto"
                  value={filter.status}
                  onChange={(e) => setFilter({ ...filter, status: e.target.value as EmployeeStatus | undefined })}
                >
                  <option value="validated">已校验</option>
                  <option value="in_progress">办理中</option>
                  <option value="returned">已退回</option>
                  <option value="">全部</option>
                </select>
                <select
                  className="input w-auto"
                  value={filter.employeeType || ''}
                  onChange={(e) => setFilter({ ...filter, employeeType: e.target.value ? e.target.value as EmployeeType : undefined })}
                >
                  <option value="">全部类型</option>
                  <option value="resignation">离职</option>
                  <option value="transfer">调岗</option>
                  <option value="assignment">异地派驻</option>
                </select>
              </div>
            </div>
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
                    <th>类型</th>
                    <th>当前参保地</th>
                    <th>转入地</th>
                    <th>状态</th>
                    <th>退回次数</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-neutral-500">加载中...</td>
                    </tr>
                  ) : employees.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-neutral-500">暂无符合条件的人员</td>
                    </tr>
                  ) : (
                    employees.map((employee) => (
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
                          {employee.returnCount > 0 ? (
                            <span className="badge-danger">{employee.returnCount}次</span>
                          ) : (
                            <span className="text-neutral-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold text-neutral-800">已生成文档</h3>
            </div>
            <div className="card-body">
              {documents.length === 0 ? (
                <p className="text-center text-neutral-400 py-8">暂无已生成的文档</p>
              ) : (
                <div className="space-y-3">
                  {documents.slice(0, 5).map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg hover:bg-neutral-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{documentTypeConfig[doc.type]?.icon || '📄'}</span>
                        <div>
                          <p className="font-medium text-neutral-800">{doc.fileName}</p>
                          <p className="text-sm text-neutral-500">
                            {documentTypeConfig[doc.type]?.label} · {new Date(doc.createdAt).toLocaleString('zh-CN')}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDownload(doc)}
                        className="btn-primary text-sm"
                      >
                        下载
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold text-neutral-800">文档类型说明</h3>
            </div>
            <div className="card-body space-y-4">
              {Object.entries(documentTypeConfig).map(([type, config]) => (
                <div key={type} className="p-4 bg-neutral-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{config.icon}</span>
                    <span className="font-medium text-neutral-800">{config.label}</span>
                  </div>
                  <p className="text-sm text-neutral-500">{config.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold text-neutral-800">退回原因分类</h3>
            </div>
            <div className="card-body space-y-2">
              {returnCategories.map((category, index) => (
                <div key={index} className="flex items-center gap-2 p-2 hover:bg-neutral-50 rounded-lg">
                  <span className="status-dot bg-warning-500" />
                  <span className="text-sm text-neutral-700">{category}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Modal
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        title="生成文档"
        footer={
          <>
            <button onClick={() => setShowGenerateModal(false)} className="btn-secondary">
              取消
            </button>
            <button onClick={handleGenerate} className="btn-primary" disabled={generating}>
              {generating ? '生成中...' : '确认生成'}
            </button>
          </>
        }
      >
        <div className="space-y-6">
          <div>
            <label className="input-label">选择文档类型</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
              {Object.entries(documentTypeConfig).map(([type, config]) => (
                <div
                  key={type}
                  className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                    documentType === type
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-neutral-200 hover:border-primary-300'
                  }`}
                  onClick={() => setDocumentType(type as DocumentType)}
                >
                  <div className="text-center">
                    <span className="text-3xl block mb-2">{config.icon}</span>
                    <p className="font-medium text-neutral-800">{config.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 bg-neutral-50 rounded-lg">
            <p className="text-sm text-neutral-600 mb-2">
              已选择 <span className="font-semibold text-primary-600">{selectedEmployees.length}</span> 名人员
            </p>
            <p className="text-sm text-neutral-500">
              {documentTypeConfig[documentType]?.description}
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Documents;
