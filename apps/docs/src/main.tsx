import React from 'react';
import ReactDOM from 'react-dom/client';
import { isEmpty } from '@unifying/utils';
import { Button } from '@unifying/components';

const App: React.FC = () => {
  return (
    <div>
      <h1>Monorepo Documentation</h1>
      <p>Result of add(2, 3)</p>
      <p>Is undefined empty? {isEmpty(undefined) ? 'yes' : 'no'}</p>
      <Button variant="primary">Sample Button</Button>
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);
