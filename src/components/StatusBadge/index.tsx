import React from 'react';

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: '待校验', className: 'badge-neutral' },
  validated: { label: '已校验', className: 'badge-info' },
  in_progress: { label: '办理中', className: 'badge-warning' },
  completed: { label: '已完成', className: 'badge-success' },
  returned: { label: '已退回', className: 'badge-danger' },
  resubmitted: { label: '已重新提交', className: 'badge-warning' },
};

const employeeTypeConfig: Record<string, { label: string; className: string }> = {
  resignation: { label: '离职', className: 'badge-danger' },
  transfer: { label: '调岗', className: 'badge-warning' },
  assignment: { label: '异地派驻', className: 'badge-info' },
};

const validationStatusConfig: Record<string, { label: string; className: string; icon: string }> = {
  pass: { label: '通过', className: 'text-success-600', icon: '✓' },
  fail: { label: '未通过', className: 'text-danger-600', icon: '✗' },
  warning: { label: '需确认', className: 'text-warning-600', icon: '!' },
};

export const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const config = statusConfig[status] || { label: status, className: 'badge-neutral' };
  return <span className={config.className}>{config.label}</span>;
};

export const EmployeeTypeBadge: React.FC<{ type: string }> = ({ type }) => {
  const config = employeeTypeConfig[type] || { label: type, className: 'badge-neutral' };
  return <span className={config.className}>{config.label}</span>;
};

export const ValidationStatusBadge: React.FC<{ status: string; showLabel?: boolean }> = ({ status, showLabel = true }) => {
  const config = validationStatusConfig[status] || validationStatusConfig.warning;
  return (
    <span className={`inline-flex items-center gap-1 ${config.className}`}>
      <span className="font-bold">{config.icon}</span>
      {showLabel && <span className="text-sm">{config.label}</span>}
    </span>
  );
};
