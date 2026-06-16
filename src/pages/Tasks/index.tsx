import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { taskApi } from '../../api/tasks.js';
import { employeeApi } from '../../api/employees.js';
import { StatusBadge, EmployeeTypeBadge } from '../../components/StatusBadge/index.jsx';
import Modal from '../../components/Modal/index.jsx';
import type { Task, Employee, MaterialItem, TimelineItem, CollaborationRecord } from '../../../shared/types.js';

const Tasks: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<(Task & { employees: Employee[] }) | null>(null);
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [collaborationRecords, setCollaborationRecords] = useState<CollaborationRecord[]>([]);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [splitting, setSplitting] = useState(false);
  const [newRecordType, setNewRecordType] = useState<CollaborationRecord['type']>('note');
  const [newRecordContent, setNewRecordContent] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const response = await taskApi.getTasks();
      if (response.code === 200 && response.data) {
        setTasks(response.data);
      }
    } catch (error) {
      console.error('加载任务失败', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSplitTasks = async () => {
    setSplitting(true);
    try {
      const response = await taskApi.splitTasks();
      if (response.code === 200 && response.data) {
        setTasks(response.data);
      }
    } catch (error) {
      console.error('拆分任务失败', error);
    } finally {
      setSplitting(false);
    }
  };

  const handleViewTask = async (task: Task) => {
    try {
      const [taskRes, materialsRes, timelineRes, collabRes] = await Promise.all([
        taskApi.getTask(task.id),
        taskApi.getTaskMaterials(task.id),
        taskApi.getTaskTimeline(task.id),
        taskApi.getCollaborationRecords(task.id)
      ]);

      if (taskRes.code === 200 && taskRes.data) {
        setSelectedTask(taskRes.data);
      }
      if (materialsRes.code === 200 && materialsRes.data) {
        setMaterials(materialsRes.data);
      }
      if (timelineRes.code === 200 && timelineRes.data) {
        setTimeline(timelineRes.data);
      }
      if (collabRes.code === 200 && collabRes.data) {
        setCollaborationRecords(collabRes.data);
      }
      setNewRecordType('note');
      setNewRecordContent('');
      setShowDetailModal(true);
    } catch (error) {
      console.error('加载任务详情失败', error);
    }
  };

  const handleUpdateStatus = async (taskId: string, status: string) => {
    try {
      const response = await taskApi.updateTaskStatus(taskId, status);
      if (response.code === 200) {
        loadTasks();
        if (selectedTask?.id === taskId && response.data) {
          const [taskRes, materialsRes, timelineRes] = await Promise.all([
            taskApi.getTask(taskId),
            taskApi.getTaskMaterials(taskId),
            taskApi.getTaskTimeline(taskId)
          ]);
          if (taskRes.code === 200 && taskRes.data) setSelectedTask(taskRes.data);
          if (materialsRes.code === 200 && materialsRes.data) setMaterials(materialsRes.data);
          if (timelineRes.code === 200 && timelineRes.data) setTimeline(timelineRes.data);
        }
      }
    } catch (error) {
      console.error('更新状态失败', error);
    }
  };

  const handleToggleTimeline = async (index: number, completed: boolean) => {
    if (!selectedTask) return;
    try {
      const response = await taskApi.updateTimelineItem(selectedTask.id, index, completed);
      if (response.code === 200 && response.data) {
        setTimeline(response.data);
        const taskRes = await taskApi.getTask(selectedTask.id);
        if (taskRes.code === 200 && taskRes.data) {
          setSelectedTask(taskRes.data);
        }
        loadTasks();
      }
    } catch (error) {
      console.error('更新时间线失败', error);
    }
  };

  const handleToggleMaterial = async (index: number, checked: boolean) => {
    if (!selectedTask) return;
    const newMaterials = [...materials];
    newMaterials[index].collected = checked;
    setMaterials(newMaterials);
    
    try {
      await taskApi.updateTaskMaterials(selectedTask.id, newMaterials);
    } catch (error) {
      console.error('保存材料状态失败', error);
    }
  };

  const getMaterialProgress = () => {
    const required = materials.filter(m => !m.optional);
    if (required.length === 0) return { collected: 0, total: 0, percent: 0 };
    const collected = required.filter(m => m.collected).length;
    return {
      collected,
      total: required.length,
      percent: Math.round((collected / required.length) * 100)
    };
  };

  const handleAddCollaborationRecord = async () => {
    if (!selectedTask || !newRecordContent.trim()) return;
    try {
      const res = await taskApi.addCollaborationRecord(selectedTask.id, newRecordType, newRecordContent.trim());
      if (res.code === 200) {
        setNewRecordContent('');
        const collabRes = await taskApi.getCollaborationRecords(selectedTask.id);
        if (collabRes.code === 200 && collabRes.data) {
          setCollaborationRecords(collabRes.data);
        }
      }
    } catch (error) {
      console.error('添加协作记录失败', error);
    }
  };

  const handleDeleteCollaborationRecord = async (recordId: string) => {
    if (!selectedTask) return;
    try {
      const res = await taskApi.deleteCollaborationRecord(selectedTask.id, recordId);
      if (res.code === 200) {
        const collabRes = await taskApi.getCollaborationRecords(selectedTask.id);
        if (collabRes.code === 200 && collabRes.data) {
          setCollaborationRecords(collabRes.data);
        }
      }
    } catch (error) {
      console.error('删除协作记录失败', error);
    }
  };

  const recordTypeConfig: Record<CollaborationRecord['type'], { label: string; icon: string; color: string }> = {
    note: { label: '备注', icon: '📝', color: 'badge-primary' },
    supplement: { label: '补充说明', icon: '📎', color: 'badge-warning' },
    communication: { label: '沟通记录', icon: '📞', color: 'badge-success' }
  };

  const statusColor: Record<string, string> = {
    pending: 'bg-neutral-400',
    in_progress: 'bg-warning-500',
    completed: 'bg-success-500',
    paused: 'bg-danger-500',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-800 mb-2">申报任务</h1>
          <p className="text-neutral-500">按城市批量拆分申报任务，自动提醒材料和时间节点</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => navigate('/documents')} className="btn-secondary">
            <span className="mr-2">📄</span>
            生成文档
          </button>
          <button onClick={handleSplitTasks} className="btn-primary" disabled={splitting}>
            <span className="mr-2">{splitting ? '⏳' : '📋'}</span>
            {splitting ? '拆分中...' : '按城市拆分任务'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <span className="text-neutral-500">加载中...</span>
        </div>
      ) : tasks.length === 0 ? (
        <div className="card">
          <div className="card-body text-center py-12">
            <div className="text-5xl mb-4">📋</div>
            <h3 className="text-lg font-semibold text-neutral-800 mb-2">暂无申报任务</h3>
            <p className="text-neutral-500 mb-6">请先导入人员信息并完成校验，然后按城市拆分申报任务</p>
            <div className="flex justify-center gap-4">
              <button onClick={() => navigate('/import')} className="btn-secondary">
                导入人员
              </button>
              <button onClick={handleSplitTasks} className="btn-primary" disabled={splitting}>
                拆分任务
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="card hover:shadow-card-hover transition-all cursor-pointer"
              onClick={() => handleViewTask(task)}
            >
              <div className="card-body">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`w-3 h-3 rounded-full ${statusColor[task.status]}`} />
                      <h3 className="text-lg font-semibold text-neutral-800">{task.city}</h3>
                    </div>
                    <p className="text-sm text-neutral-500">转入地社保经办机构</p>
                  </div>
                  <StatusBadge status={task.status === 'pending' ? 'pending' : task.status === 'in_progress' ? 'in_progress' : 'completed'} />
                </div>

                <div className="grid grid-cols-4 gap-3 mb-4">
                  <div className="text-center p-3 bg-neutral-50 rounded-lg">
                    <p className="text-2xl font-bold text-neutral-800">{task.employeeCount}</p>
                    <p className="text-xs text-neutral-500">人数</p>
                  </div>
                  <div className="text-center p-3 bg-neutral-50 rounded-lg">
                    <p className="text-2xl font-bold text-primary-600">{task.progress}%</p>
                    <p className="text-xs text-neutral-500">进度</p>
                  </div>
                  <div className="text-center p-3 bg-neutral-50 rounded-lg">
                    <p className="text-2xl font-bold text-success-600">
                      {(task.materials || []).filter(m => !m.optional && m.collected).length}
                      /
                      {(task.materials || []).filter(m => !m.optional).length}
                    </p>
                    <p className="text-xs text-neutral-500">材料</p>
                  </div>
                  <div className="text-center p-3 bg-neutral-50 rounded-lg">
                    <p className="text-2xl font-bold text-warning-600">
                      {(task.timeline || []).filter(t => t.completed).length}
                      /
                      {task.timeline?.length || 0}
                    </p>
                    <p className="text-xs text-neutral-500">节点</p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-500">
                    创建于 {new Date(task.createdAt).toLocaleDateString('zh-CN')}
                  </span>
                  <span className="text-primary-600 hover:text-primary-700">
                    查看详情 →
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title={`${selectedTask?.city} - 申报任务详情`}
        size="xl"
        footer={
          <div className="flex items-center justify-between w-full">
            <div className="flex gap-2">
              {selectedTask?.status === 'pending' && (
                <button
                  onClick={() => handleUpdateStatus(selectedTask.id, 'in_progress')}
                  className="btn-primary"
                >
                  开始办理
                </button>
              )}
              {selectedTask?.status === 'in_progress' && (
                <>
                  <button
                    onClick={() => handleUpdateStatus(selectedTask.id, 'paused')}
                    className="btn-secondary"
                  >
                    暂停
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(selectedTask.id, 'completed')}
                    className="btn-success"
                  >
                    标记完成
                  </button>
                </>
              )}
              {selectedTask?.status === 'paused' && (
                <button
                  onClick={() => handleUpdateStatus(selectedTask.id, 'in_progress')}
                  className="btn-primary"
                >
                  恢复办理
                </button>
              )}
            </div>
            <button onClick={() => setShowDetailModal(false)} className="btn-secondary">
              关闭
            </button>
          </div>
        }
      >
        {selectedTask && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-neutral-800 mb-4">👥 人员清单 ({selectedTask.employees?.length || 0}人)</h4>
                <div className="max-h-80 overflow-y-auto scrollbar-thin border border-neutral-200 rounded-lg">
                  <table className="table">
                    <thead className="sticky top-0 bg-white">
                      <tr>
                        <th>姓名</th>
                        <th>类型</th>
                        <th>当前参保地</th>
                        <th>状态</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedTask.employees?.map((emp) => (
                        <tr key={emp.id}>
                          <td className="font-medium">{emp.name}</td>
                          <td><EmployeeTypeBadge type={emp.employeeType} /></td>
                          <td>{emp.currentCity}</td>
                          <td><StatusBadge status={emp.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-neutral-800">📋 材料收集进度</h4>
                    <span className="text-sm text-neutral-500">
                      必需材料 {getMaterialProgress().collected}/{getMaterialProgress().total} ({getMaterialProgress().percent}%)
                    </span>
                  </div>
                  <div className="w-full bg-neutral-200 rounded-full h-2 mb-4">
                    <div 
                      className={`h-2 rounded-full transition-all ${getMaterialProgress().percent === 100 ? 'bg-success-500' : 'bg-primary-500'}`}
                      style={{ width: `${getMaterialProgress().percent}%` }}
                    />
                  </div>
                  <div className="space-y-2 max-h-56 overflow-y-auto">
                    {materials.map((item, index) => (
                      <div 
                        key={index} 
                        className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
                          item.collected 
                            ? 'bg-success-50 border border-success-200' 
                            : item.optional 
                              ? 'bg-neutral-50' 
                              : 'bg-neutral-50 border border-neutral-200'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={item.collected}
                          onChange={(e) => handleToggleMaterial(index, e.target.checked)}
                          className="mt-1 rounded border-neutral-300"
                        />
                        <div className="flex-1">
                          <p className={`font-medium ${item.collected ? 'text-success-700 line-through' : 'text-neutral-800'}`}>
                            {item.name}
                          </p>
                          {item.description && (
                            <p className="text-sm text-neutral-500">{item.description}</p>
                          )}
                        </div>
                        <span className={`badge ${item.optional ? 'badge-neutral' : (item.collected ? 'badge-success' : 'badge-danger')}`}>
                          {item.optional ? '可选' : (item.collected ? '已收集' : '必需')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-neutral-800 mb-4">⏱️ 办理时间线</h4>
                  <div className="relative pl-6">
                    <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-neutral-200" />
                    {timeline.map((item, index) => (
                      <div key={index} className="relative mb-4 last:mb-0">
                        <div
                          className={`absolute -left-6 w-4 h-4 rounded-full border-2 ${
                            item.completed
                              ? 'bg-success-500 border-success-500'
                              : 'bg-white border-neutral-300'
                          } cursor-pointer`}
                          onClick={() => handleToggleTimeline(index, !item.completed)}
                        />
                        <div className={`p-3 rounded-lg ${item.completed ? 'bg-success-50' : 'bg-neutral-50'}`}>
                          <div className="flex items-center justify-between">
                            <p className={`font-medium ${item.completed ? 'text-success-700' : 'text-neutral-800'}`}>
                              {item.name}
                            </p>
                            <span className="text-xs text-neutral-500">{item.dueDate}</span>
                          </div>
                          {item.description && (
                            <p className="text-sm text-neutral-500 mt-1">{item.description}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-neutral-200 pt-6">
              <h4 className="font-semibold text-neutral-800 mb-4">💬 协作记录</h4>
              <div className="mb-4">
                <div className="flex gap-3 mb-3">
                  {(['note', 'supplement', 'communication'] as const).map(type => (
                    <button
                      key={type}
                      onClick={() => setNewRecordType(type)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        newRecordType === type
                          ? 'bg-primary-100 text-primary-700 border border-primary-300'
                          : 'bg-neutral-100 text-neutral-600 border border-neutral-200 hover:bg-neutral-200'
                      }`}
                    >
                      {recordTypeConfig[type].icon} {recordTypeConfig[type].label}
                    </button>
                  ))}
                </div>
                <div className="flex gap-3">
                  <textarea
                    value={newRecordContent}
                    onChange={(e) => setNewRecordContent(e.target.value)}
                    placeholder={
                      newRecordType === 'note' ? '输入备注内容...' :
                      newRecordType === 'supplement' ? '输入补充说明...' :
                      '记录与经办机构的沟通内容...'
                    }
                    className="input flex-1 min-h-[60px] resize-y"
                    rows={2}
                  />
                  <button
                    onClick={handleAddCollaborationRecord}
                    disabled={!newRecordContent.trim()}
                    className="btn-primary self-end"
                  >
                    添加
                  </button>
                </div>
              </div>
              {collaborationRecords.length > 0 ? (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {collaborationRecords.map(record => {
                    const config = recordTypeConfig[record.type];
                    return (
                      <div key={record.id} className="p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <span>{config.icon}</span>
                            <span className={`badge ${config.color}`}>{config.label}</span>
                            <span className="text-xs text-neutral-500">
                              {new Date(record.createdAt).toLocaleString('zh-CN')}
                            </span>
                          </div>
                          <button
                            onClick={() => handleDeleteCollaborationRecord(record.id)}
                            className="text-neutral-400 hover:text-danger-500 text-sm transition-colors"
                          >
                            ✕
                          </button>
                        </div>
                        <p className="mt-2 text-sm text-neutral-700 whitespace-pre-wrap">{record.content}</p>
                        <p className="mt-1 text-xs text-neutral-400">by {record.createdBy}</p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6 text-neutral-400 text-sm">
                  暂无协作记录，可添加备注、补充说明或沟通记录
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Tasks;
