import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore.js';
import { authApi } from '../../api/auth.js';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await authApi.login(username, password);
      
      if (response.code === 200 && response.data) {
        login(response.data.token, response.data.user);
        navigate('/dashboard');
      } else {
        setError(response.message || '登录失败');
      }
    } catch (err: any) {
      setError(err.message || '网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-primary-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-2xl mb-4">
            <span className="text-3xl">🏢</span>
          </div>
          <h1 className="text-2xl font-bold text-neutral-800 mb-2">社保转移申报系统</h1>
          <p className="text-neutral-500">企业人事批量管理工具</p>
        </div>

        <div className="card">
          <div className="card-body">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="input-label">用户名</label>
                <input
                  type="text"
                  className="input"
                  placeholder="请输入用户名"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>

              <div>
                <label className="input-label">密码</label>
                <input
                  type="password"
                  className="input"
                  placeholder="请输入密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>

              {error && (
                <div className="bg-danger-50 text-danger-600 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="w-full btn-primary"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    登录中...
                  </>
                ) : (
                  '登 录'
                )}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-neutral-200">
              <p className="text-sm text-neutral-500 text-center">
                测试账号：<span className="font-mono bg-neutral-100 px-2 py-1 rounded">admin / admin123</span>
              </p>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-neutral-400 mt-6">
          © 2025 企业人事管理系统 · 社保关系转移接续批量申报工具
        </p>
      </div>
    </div>
  );
};

export default Login;
