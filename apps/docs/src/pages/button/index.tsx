import React from 'react';
import { Button } from '@unifying/ui';

const ButtonDemo: React.FC = () => {
  return (
    <div style={{ padding: '20px' }}>
      <h1>Button Component</h1>

      <section style={{ marginBottom: '40px' }}>
        <h2>Button Types</h2>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <Button type="primary">Primary</Button>
          <Button type="secondary">Secondary</Button>
          <Button type="success">Success</Button>
          <Button type="warning">Warning</Button>
          <Button type="danger">Danger</Button>
          <Button type="link">Link</Button>
        </div>
      </section>

      <section style={{ marginBottom: '40px' }}>
        <h2>Button Sizes</h2>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <Button type="primary" size="small">
            Small
          </Button>
          <Button type="primary" size="medium">
            Medium
          </Button>
          <Button type="primary" size="large">
            Large
          </Button>
        </div>
      </section>

      <section style={{ marginBottom: '40px' }}>
        <h2>Button Shapes</h2>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <Button type="primary" shape="default">
            Default
          </Button>
          <Button type="primary" shape="circle">
            Circle
          </Button>
          <Button type="primary" shape="round">
            Round
          </Button>
        </div>
      </section>

      <section style={{ marginBottom: '40px' }}>
        <h2>Button States</h2>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <Button type="primary">Normal</Button>
          <Button type="primary" disabled>
            Disabled
          </Button>
          <Button type="primary" loading>
            Loading
          </Button>
        </div>
      </section>

      <section style={{ marginBottom: '40px' }}>
        <h2>Block Button</h2>
        <Button type="primary" block>
          Block Button
        </Button>
      </section>

      <section style={{ marginBottom: '40px' }}>
        <h2>Ghost Button</h2>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <Button type="primary" ghost>
            Primary Ghost
          </Button>
          <Button type="danger" ghost>
            Danger Ghost
          </Button>
        </div>
      </section>

      <section style={{ marginBottom: '40px' }}>
        <h2>Button with Icon</h2>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <Button type="primary" icon={<span>★</span>}>
            With Icon
          </Button>
          <Button type="primary" icon={<span>★</span>} />
        </div>
      </section>

      <section style={{ marginBottom: '40px' }}>
        <h2>Button Click Handler</h2>
        <Button type="primary" onClick={() => alert('Button clicked!')}>
          Click Me
        </Button>
      </section>
    </div>
  );
};

export default ButtonDemo;
