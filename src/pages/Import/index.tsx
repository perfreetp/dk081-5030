import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { employeeApi } from '../../api/employees.js';
import { EmployeeTypeBadge } from '../../components/StatusBadge/index.jsx';
import type { Employee } from '../../../shared/types.js';

const Import: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [step, setStep] = useState<'upload' | 'preview' | 'success'>('upload');
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.match(/\.(xlsx|xls|csv)$/i)) {
      alert('请上传Excel或CSV文件');
      return;
    }

    setFile(selectedFile);
    setImporting(true);

    try {
      const response = await employeeApi.importExcel(selectedFile);
      if (response.code === 200 && response.data) {
        setPreview(response.data.preview);
        setStep('preview');
      }
    } catch (error) {
      console.error('解析文件失败', error);
      alert('文件解析失败，请检查格式');
    } finally {
      setImporting(false);
    }
  };

  const handleConfirmImport = async () => {
    if (preview.length === 0) return;

    setImporting(true);
    try {
      const response = await employeeApi.confirmImport(preview);
      if (response.code === 200) {
        setStep('success');
      }
    } catch (error) {
      console.error('导入失败', error);
      alert('导入失败');
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await employeeApi.downloadTemplate();
      if (response.code === 200 && response.data) {
        const url = window.URL.createObjectURL(response.data);
        const a = document.createElement('a');
        a.href = url;
        a.download = '社保转移人员名单模板.xlsx';
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('下载模板失败', error);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (!droppedFile) return;

    if (!droppedFile.name.match(/\.(xlsx|xls|csv)$/i)) {
      alert('请上传Excel或CSV文件');
      return;
    }

    setFile(droppedFile);
    setImporting(true);

    try {
      const response = await employeeApi.importExcel(droppedFile);
      if (response.code === 200 && response.data) {
        setPreview(response.data.preview);
        setStep('preview');
      }
    } catch (error) {
      console.error('解析文件失败', error);
      alert('文件解析失败，请检查格式');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-800 mb-2">人员导入</h1>
          <p className="text-neutral-500">导入离职、调岗、异地派驻人员名单</p>
        </div>
        <button onClick={handleDownloadTemplate} className="btn-secondary">
          <span className="mr-2">📄</span>
          下载导入模板
        </button>
      </div>

      {step === 'upload' && (
        <div className="card">
          <div className="card-body">
            <div
              className="border-2 border-dashed border-neutral-300 rounded-xl p-12 text-center hover:border-primary-400 transition-colors cursor-pointer"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="text-5xl mb-4">📥</div>
              <h3 className="text-lg font-semibold text-neutral-800 mb-2">
                {importing ? '正在解析文件...' : '拖拽文件到此处或点击上传'}
              </h3>
              <p className="text-sm text-neutral-500 mb-4">支持 .xlsx, .xls, .csv 格式</p>
              {importing && (
                <div className="inline-flex items-center gap-2 text-primary-600">
                  <span className="animate-spin">⏳</span>
                  正在解析，请稍候...
                </div>
              )}
            </div>

            <div className="mt-8">
              <h4 className="font-medium text-neutral-800 mb-4">导入说明</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-neutral-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">👤</span>
                <span className="font-medium">离职人员</span>
              </div>
              <p className="text-sm text-neutral-500">已从原单位离职，需要将社保关系转出</p>
            </div>
            <div className="p-4 bg-neutral-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">🔄</span>
                <span className="font-medium">调岗人员</span>
              </div>
              <p className="text-sm text-neutral-500">集团内部跨地区调动，社保关系转移</p>
            </div>
            <div className="p-4 bg-neutral-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">✈️</span>
                <span className="font-medium">异地派驻</span>
              </div>
              <p className="text-sm text-neutral-500">长期派驻外地工作，社保关系转移</p>
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-primary-50 rounded-lg">
          <h4 className="font-medium text-primary-800 mb-2">📋 导入字段说明</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="text-primary-700">姓名</div>
            <div className="text-primary-700">证件号</div>
            <div className="text-primary-700">当前参保地</div>
            <div className="text-primary-700">转入地</div>
            <div className="text-primary-700">停保时间</div>
            <div className="text-primary-700">人员类型</div>
            <div className="text-primary-700">已享受待遇</div>
            <div className="text-primary-700">重复缴费</div>
            <div className="text-primary-700">缺少单位证明</div>
          </div>
        </div>
      </div>
    </div>
      )}

      {step === 'preview' && (
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-neutral-800">数据预览</h3>
              <p className="text-sm text-neutral-500">共 {preview.length} 条数据</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setStep('upload')}
                className="btn-secondary"
              >
                重新选择
              </button>
              <button
                onClick={handleConfirmImport}
                className="btn-primary"
                disabled={importing}
              >
                {importing ? '导入中...' : '确认导入'}
              </button>
            </div>
          </div>
          <div className="card-body overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>姓名</th>
                  <th>证件号</th>
                  <th>人员类型</th>
                  <th>当前参保地</th>
                  <th>转入地</th>
                  <th>停保时间</th>
                  <th>已享受待遇</th>
                  <th>重复缴费</th>
                </tr>
              </thead>
              <tbody>
                {preview.slice(0, 20).map((row, index) => (
                  <tr key={index}>
                    <td>{row.name}</td>
                    <td className="font-mono text-sm">{row.idCard}</td>
                    <td>
                      <EmployeeTypeBadge type={row.employeeType} />
                    </td>
                    <td>{row.currentCity}</td>
                    <td>{row.targetCity}</td>
                    <td>{row.stopDate || '-'}</td>
                    <td className={row.hasBenefits ? 'text-success-600' : 'text-neutral-500'}>
                      {row.hasBenefits ? '是' : '否'}
                    </td>
                    <td className={row.hasDuplicate ? 'text-danger-600' : 'text-neutral-500'}>
                      {row.hasDuplicate ? '是' : '否'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {preview.length > 20 && (
              <p className="text-center text-sm text-neutral-500 mt-4">
                仅显示前 20 条，共 {preview.length} 条数据
              </p>
            )}
          </div>
        </div>
      )}

      {step === 'success' && (
        <div className="card">
          <div className="card-body text-center py-12">
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-2xl font-bold text-neutral-800 mb-2">导入成功！</h2>
            <p className="text-neutral-500 mb-8">
              成功导入 {preview.length} 条人员数据
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => {
                  setStep('upload');
                  setPreview([]);
                  setFile(null);
                }}
                className="btn-secondary"
              >
                继续导入
              </button>
              <button
                onClick={() => navigate('/validation')}
                className="btn-primary"
              >
                前往信息校验
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Import;
