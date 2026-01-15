import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { Hooks } from './pages/hooks';
import ButtonDemo from './pages/button';

const App: React.FC = () => {
  const [activePage, setActivePage] = useState<'hooks' | 'button'>('hooks');

  return (
    <div>
      <nav
        style={{
          padding: '20px',
          borderBottom: '1px solid #e0e0e0',
          marginBottom: '20px',
        }}
      >
        <button
          onClick={() => setActivePage('hooks')}
          style={{
            marginRight: '10px',
            padding: '8px 16px',
            background: activePage === 'hooks' ? '#1890ff' : '#fff',
            color: activePage === 'hooks' ? '#fff' : '#000',
            border: '1px solid #d9d9d9',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Hooks
        </button>
        <button
          onClick={() => setActivePage('button')}
          style={{
            padding: '8px 16px',
            background: activePage === 'button' ? '#1890ff' : '#fff',
            color: activePage === 'button' ? '#fff' : '#000',
            border: '1px solid #d9d9d9',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Button Demo
        </button>
      </nav>
      {activePage === 'hooks' && <Hooks />}
      {activePage === 'button' && <ButtonDemo />}
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);
