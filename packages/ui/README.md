# @unifying/ui

企业级 React UI 组件库，基于 Webpack 构建。

## 特性

- 🎨 基于 React 18+ 开发
- 📦 使用 Webpack 5 进行构建和打包
- 🎯 TypeScript 支持，提供完整的类型定义
- 💅 使用 Less 进行样式开发，同时支持 CSS 和 Sass
- 🚀 支持 Tree-shaking，优化打包体积
- 📦 支持 ES Module、CommonJS 和 UMD 三种格式
- 🌐 支持多种引入方式，兼容各种使用场景

## 安装

```bash
pnpm add @unifying/ui
```

## 使用

### ES Module 方式（推荐）

适用于现代打包工具（Vite、Webpack、Rollup 等）：

```tsx
import { Button } from '@unifying/ui';

function App() {
  return <Button type="primary">点击我</Button>;
}
```

### CommonJS 方式

适用于 Node.js 环境或使用 require 的项目：

```tsx
const { Button } = require('@unifying/ui');

function App() {
  return <Button type="primary">点击我</Button>;
}
```

### Script 标签方式（UMD）

适用于传统 HTML 页面，通过 CDN 引入：

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>Unifying UI Demo</title>
    <link rel="stylesheet" href="./dist/styles.css" />
  </head>
  <body>
    <div id="root"></div>

    <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
    <script src="./dist/index.umd.js"></script>

    <script>
      const { Button } = UnifyingUI;
      const { createRoot } = ReactDOM;

      function App() {
        return React.createElement(Button, { type: 'primary' }, '点击我');
      }

      const root = createRoot(document.getElementById('root'));
      root.render(React.createElement(App));
    </script>
  </body>
</html>
```

### 按钮组件

Button 组件支持多种类型、尺寸和形状：

```tsx
import { Button } from '@unifying/ui';

function App() {
  return (
    <div>
      <Button type="primary">主要按钮</Button>
      <Button type="secondary">次要按钮</Button>
      <Button type="success">成功按钮</Button>
      <Button type="warning">警告按钮</Button>
      <Button type="danger">危险按钮</Button>
      <Button type="link">链接按钮</Button>

      <Button size="small">小按钮</Button>
      <Button size="medium">中按钮</Button>
      <Button size="large">大按钮</Button>

      <Button shape="circle">圆形</Button>
      <Button shape="round">圆角</Button>

      <Button loading>加载中</Button>
      <Button disabled>禁用</Button>
      <Button block>块级按钮</Button>
      <Button ghost>幽灵按钮</Button>
      <Button danger>危险按钮</Button>
    </div>
  );
}
```

## 开发

```bash
# 安装依赖
pnpm install

# 开发模式
pnpm dev

# 构建所有格式
pnpm build

# 单独构建 ES Module
pnpm build:esm

# 单独构建 CommonJS
pnpm build:cjs

# 单独构建 UMD
pnpm build:umd

# 类型检查
pnpm type-check

# 代码检查
pnpm lint

# 修复代码
pnpm lint:fix
```

## 构建输出

构建后会在 `dist` 目录生成以下文件：

- `index.esm.js` - ES Module 格式，适用于现代打包工具
- `index.cjs.js` - CommonJS 格式，适用于 Node.js 环境
- `index.umd.js` - UMD 格式，适用于浏览器直接引入
- `styles.css` - 样式文件
- `*.js.map` - Source Map 文件，用于调试

## 项目结构

```
packages/ui/
├── src/
│   ├── components/
│   │   └── Button/
│   │       ├── index.tsx       # 组件实现
│   │       └── styles.less     # 组件样式
│   └── index.ts                # 入口文件
├── dist/                       # 构建输出
│   ├── index.esm.js            # ES Module 格式
│   ├── index.cjs.js            # CommonJS 格式
│   ├── index.umd.js            # UMD 格式
│   ├── styles.css              # 样式文件
│   └── components/             # 类型声明文件
│       └── Button/
│           └── index.d.ts
├── webpack.config.cjs          # Webpack 配置
├── tsconfig.json               # TypeScript 配置
└── package.json               # 包配置
```

## License

MIT
