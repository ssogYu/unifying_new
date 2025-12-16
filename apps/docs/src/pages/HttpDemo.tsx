/**
 * HTTP 服务演示组件
 * 展示如何在 React 组件中优雅地使用 HTTP 服务
 */

import React from 'react';
import { useApiCall } from '../hooks/useApi';
import { UserApiService } from '../services/api';
import { httpService } from '../services/http';
import { LoginRequest } from '../services/types';

/**
 * 登录演示组件
 */
const LoginDemo: React.FC = () => {
  const [credentials, setCredentials] = React.useState<LoginRequest>({
    username: '',
    password: '',
  });

  const { execute: login, loading, error, data, reset } = useApiCall(UserApiService.login);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!credentials.username || !credentials.password) {
      alert('请输入用户名和密码');
      return;
    }

    try {
      await login(credentials);
      // 登录成功后更新 token
      if (data?.token) {
        httpService.updateAuthToken(data.token);
      }
    } catch (err) {
      // 错误已在 useApiCall 中处理
    }
  };

  const handleLogout = () => {
    httpService.clearAuth();
    reset();
    setCredentials({ username: '', password: '' });
  };

  return (
    <div
      style={{ border: '1px solid #ddd', padding: '16px', margin: '16px 0', borderRadius: '8px' }}
    >
      <h3>登录演示</h3>

      {!data ? (
        <form onSubmit={handleLogin}>
          <div style={{ margin: '8px 0' }}>
            <label>
              用户名:
              <input
                type="text"
                value={credentials.username}
                onChange={(e) => setCredentials((prev) => ({ ...prev, username: e.target.value }))}
                style={{ marginLeft: '8px', padding: '4px' }}
              />
            </label>
          </div>
          <div style={{ margin: '8px 0' }}>
            <label>
              密码:
              <input
                type="password"
                value={credentials.password}
                onChange={(e) => setCredentials((prev) => ({ ...prev, password: e.target.value }))}
                style={{ marginLeft: '8px', padding: '4px' }}
              />
            </label>
          </div>
          <button type="submit" disabled={loading}>
            {loading ? '登录中...' : '登录'}
          </button>
        </form>
      ) : (
        <div>
          <p style={{ color: 'green' }}>✅ 登录成功!</p>
          <p>
            <strong>用户:</strong> {data.user.name}
          </p>
          <p>
            <strong>Token:</strong> {data.token.substring(0, 20)}...
          </p>
          <button onClick={handleLogout}>退出登录</button>
        </div>
      )}

      {error && <p style={{ color: 'red', marginTop: '8px' }}>登录失败: {error}</p>}
    </div>
  );
};

/**
 * HTTP 功能演示组件
 */
const HttpFeatures: React.FC = () => {
  const [testResults, setTestResults] = React.useState<string[]>([]);

  const addResult = (message: string) => {
    setTestResults((prev) => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testHttpRequest = async () => {
    addResult('🧪 开始测试 HTTP 请求...');

    try {
      // 测试 GET 请求
      addResult('📤 发送 GET 请求到 /test');
      // const response = await http.get('/test')
      // addResult(`📥 收到响应: ${JSON.stringify(response.data)}`)
      addResult('📥 模拟响应成功');
    } catch (error) {
      addResult(`❌ 请求失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  const testErrorHandling = () => {
    addResult('🧪 测试错误处理...');
    try {
      throw new Error('模拟网络错误');
    } catch (error) {
      addResult(`✅ 错误被正确捕获: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  const showAuthStatus = () => {
    const token = localStorage.getItem('auth_token');
    addResult(`🔐 当前认证状态: ${token ? '已登录' : '未登录'}`);
  };

  return (
    <div
      style={{ border: '1px solid #ddd', padding: '16px', margin: '16px 0', borderRadius: '8px' }}
    >
      <h3>HTTP 功能测试</h3>

      <div style={{ marginBottom: '16px' }}>
        <button onClick={testHttpRequest} style={{ marginRight: '8px' }}>
          测试 HTTP 请求
        </button>
        <button onClick={testErrorHandling} style={{ marginRight: '8px' }}>
          测试错误处理
        </button>
        <button onClick={showAuthStatus} style={{ marginRight: '8px' }}>
          查看认证状态
        </button>
        <button onClick={() => setTestResults([])}>清空日志</button>
      </div>

      <div
        style={{
          backgroundColor: '#f5f5f5',
          padding: '12px',
          borderRadius: '4px',
          fontFamily: 'monospace',
          fontSize: '12px',
          maxHeight: '200px',
          overflow: 'auto',
        }}
      >
        {testResults.length === 0 ? (
          <div style={{ color: '#999' }}>点击上方按钮开始测试...</div>
        ) : (
          testResults.map((result, index) => (
            <div key={index} style={{ margin: '4px 0' }}>
              {result}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

/**
 * HTTP 服务演示主组件
 */
export const HttpDemo: React.FC = () => {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <h1>HTTP 服务集成演示</h1>
      <p>这个组件演示了如何优雅地在 React 应用中使用 @unifying/core 的 HTTP 服务</p>

      <LoginDemo />
      <HttpFeatures />

      <div
        style={{
          marginTop: '32px',
          padding: '16px',
          backgroundColor: '#e8f4fd',
          borderRadius: '8px',
          fontSize: '14px',
          lineHeight: '1.6',
        }}
      >
        <h3>🎯 集成特点</h3>
        <ul>
          <li>
            <strong>单一实例</strong>: 使用单例模式确保整个应用使用同一个 HTTP 客户端
          </li>
          <li>
            <strong>类型安全</strong>: 完整的 TypeScript 类型支持
          </li>
          <li>
            <strong>拦截器处理</strong>: 自动添加认证 token、请求 ID 等
          </li>
          <li>
            <strong>错误处理</strong>: 统一的错误处理和业务逻辑
          </li>
          <li>
            <strong>React Hooks</strong>: 优雅的状态管理和数据获取
          </li>
          <li>
            <strong>开发友好</strong>: 开发环境下的详细日志
          </li>
        </ul>
      </div>
    </div>
  );
};
