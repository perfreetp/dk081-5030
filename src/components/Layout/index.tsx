import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore.js';

const Layout: React.FC = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { path: '/dashboard', label: '仪表板', icon: '📊' },
    { path: '/import', label: '人员导入', icon: '📥' },
    { path: '/validation', label: '信息校验', icon: '✅' },
    { path: '/tasks', label: '申报任务', icon: '📋' },
    { path: '/documents', label: '文档生成', icon: '📄' },
    { path: '/returns', label: '退回管理', icon: '↩️' },
    { path: '/statistics', label: '统计分析', icon: '📈' },
  ];

  return (
    <div className="flex h-screen bg-neutral-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-neutral-200 flex flex-col">
        <div className="p-6 border-b border-neutral-200">
          <h1 className="text-xl font-bold text-primary-700 flex items-center gap-2">
            <span className="text-2xl">🏢</span>
            社保转移申报系统
          </h1>
          <p className="text-xs text-neutral-500 mt-1">企业人事批量管理工具</p>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto scrollbar-thin">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'active' : ''}`
              }
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-neutral-200">
          <div className="flex items-center gap-3 px-4 py-3 bg-neutral-50 rounded-lg mb-3">
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-semibold">
              {user?.name?.charAt(0) || '用'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-neutral-800 truncate">{user?.name}</p>
              <p className="text-xs text-neutral-500 truncate">{user?.role === 'admin' ? '管理员' : '人事专员'}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full btn-ghost text-sm justify-start"
          >
            <span className="mr-2">🚪</span>
            退出登录
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden flex flex-col">
        <header className="bg-white border-b border-neutral-200 px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-neutral-800">
                欢迎回来，{user?.name}
              </h2>
              <p className="text-sm text-neutral-500">
                {new Date().toLocaleDateString('zh-CN', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  weekday: 'long'
                })}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-neutral-600">
                <span className="status-dot bg-success-500 animate-pulse"></span>
                <span>系统运行正常</span>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-8 scrollbar-thin">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
