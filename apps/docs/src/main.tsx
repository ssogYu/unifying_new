import React from 'react';
import ReactDOM from 'react-dom/client';
import { Hooks } from './pages/hooks';

const App: React.FC = () => {
  return (
    <div>
      <Hooks />
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);
