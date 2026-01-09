import { useState, useTransition } from 'react';

export const Hooks = () => {
  const [value, setValue] = useState('');
  const [isPending, startTransition] = useTransition();
  const [results, setResults] = useState<any[]>([]);

  const onHandleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
    startTransition(() => {
      setResults(Array(20000).fill(e.target.value));
    });
  };

  return (
    <div>
      <input type="text" value={value} onChange={onHandleChange} />
      {!isPending ? <div>{results}</div> : <div>暂无结果</div>}
    </div>
  );
};
