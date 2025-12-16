import React from 'react';
import ReactDOM from 'react-dom/client';
import { HttpDemo } from './pages/HttpDemo';

const App: React.FC = () => {
  return (
    <div>
      <HttpDemo />
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);
