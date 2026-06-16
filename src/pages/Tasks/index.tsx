import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { taskApi } from '../../api/tasks.js';
import { employeeApi } from '../../api/employees.js';
import { StatusBadge, EmployeeTypeBadge } from '../../components/StatusBadge/index.jsx';
import Modal from '../../components/Modal/index.jsx';
import type { Task, Employee, MaterialItem, TimelineItem } from '../../../shared/types.js';

const Tasks: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<(Task & { employees: Employee[] }) | null>(null);
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [splitting, setSplitting] = useState(false);
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
      const [taskRes, materialsRes, timelineRes] = await Promise.all([
        taskApi.getTask(task.id),
        taskApi.getTaskMaterials(task.id),
        taskApi.getTaskTimeline(task.id)
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
          setSelectedTask({ ...selectedTask, ...response.data });
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
      }
    } catch (error) {
      console.error('更新时间线失败', error);
    }
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

                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center p-3 bg-neutral-50 rounded-lg">
                    <p className="text-2xl font-bold text-neutral-800">{task.employeeCount}</p>
                    <p className="text-xs text-neutral-500">人数</p>
                  </div>
                  <div className="text-center p-3 bg-neutral-50 rounded-lg">
                    <p className="text-2xl font-bold text-primary-600">{task.materials?.length || 0}</p>
                    <p className="text-xs text-neutral-500">材料项</p>
                  </div>
                  <div className="text-center p-3 bg-neutral-50 rounded-lg">
                    <p className="text-2xl font-bold text-warning-600">{task.timeline?.length || 0}</p>
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
                  <h4 className="font-semibold text-neutral-800 mb-4">📋 所需材料</h4>
                  <div className="space-y-2">
                    {materials.map((item, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 bg-neutral-50 rounded-lg">
                        <input
                          type="checkbox"
                          checked={item.collected}
                          onChange={(e) => {
                            const newMaterials = [...materials];
                            newMaterials[index].collected = e.target.checked;
                            setMaterials(newMaterials);
                          }}
                          className="mt-1 rounded border-neutral-300"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-neutral-800">{item.name}</p>
                          {item.description && (
                            <p className="text-sm text-neutral-500">{item.description}</p>
                          )}
                        </div>
                        <span className={`badge ${item.optional ? 'badge-neutral' : 'badge-danger'}`}>
                          {item.optional ? '可选' : '必需'}
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
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Tasks;
