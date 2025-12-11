# pnpm Monorepo 项目完整指南

一个现代化的 **pnpm monorepo** 工程方案模板，包含完整的开发工具链、最佳实践和生产级配置。

**更新时间**: 2025年12月11日  
**项目状态**: ✅ 已优化（移除单元测试框架）  
**核心功能**: 9 个完整特性

---

## 📑 目录

1. [项目概览](#项目概览)
2. [核心功能](#核心功能)
3. [项目结构](#项目结构)
4. [快速开始](#快速开始)
5. [pnpm 指令大全](#pnpm-指令大全)
6. [配置说明](#配置说明)
7. [开发工作流](#开发工作流)
8. [发布流程](#发布流程)
9. [技术栈](#技术栈)
10. [常见问题](#常见问题)

---

## 项目概览

### 什么是 Monorepo？

Monorepo（单一仓库）是一种代码管理策略，将多个相关的项目存储在同一个 Git 仓库中。本项目使用 **pnpm workspaces** 实现 monorepo 管理。

### 项目特点

- ✅ **pnpm 工作区**: 快速、磁盘高效的包管理器
- ✅ **TypeScript**: 完整的类型检查和开发支持
- ✅ **多包管理**: 3 个可复用库 + 1 个示例应用
- ✅ **代码质量**: ESLint + Prettier 自动化检查
- ✅ **Git 规范**: Husky + commitlint + commitizen
- ✅ **构建方案**: tsup（库）+ Vite（应用）
- ✅ **版本管理**: Changesets 自动化发布
- ✅ **拼写检查**: cspell 代码拼写检查
- ✅ **环境锁定**: Node.js 版本固定（.nvmrc + .tool-versions）

### 为什么选择这个模板？

```
✓ 生产级配置，开箱即用
✓ 完整的开发工具链，无需额外配置
✓ 最佳实践的代码组织方式
✓ 易于扩展和定制
✓ 详尽的文档和示例代码
```

---

## 核心功能

### 1️⃣ 环境版本锁定

**目的**: 确保所有开发者使用相同的 Node.js 和 pnpm 版本

**配置文件**:

- `.nvmrc` - nvm 版本管理
- `.tool-versions` - asdf 版本管理

**当前版本**:

- Node.js >= 18.0.0
- pnpm >= 8.0.0

**使用方法**:

```bash
# 使用 nvm
nvm use

# 或使用 asdf
asdf install
```

---

### 2️⃣ TypeScript 配置

**目的**: 提供类型安全和智能编辑器支持

**配置文件**:

- `tsconfig.json` (根) - 基础配置 + 路径别名
- `packages/*/tsconfig.json` - 各包的继承配置

**路径别名**:

```typescript
// 可以直接使用别名导入
import { add } from '@monorepo/core';
import { isEmpty } from '@monorepo/utils';
import { Button } from '@monorepo/components';
```

**编译目标**: ES2020  
**严格模式**: 启用全部类型检查

---

### 3️⃣ Prettier 代码格式化

**目的**: 统一代码风格，自动化格式化

**配置**:

- 行长度: 100 字符
- 缩进: 2 空格
- 引号: 单引号
- 尾逗号: 启用

**文件**:

- `.prettierrc` - Prettier 配置
- `.prettierignore` - 忽略文件列表

**使用**:

```bash
pnpm format          # 格式化所有文件
pnpm format:check    # 检查格式是否符合要求
```

---

### 4️⃣ ESLint 代码检查

**目的**: 发现代码错误和不规范写法

**配置文件**:

- `.eslintrc` - ESLint 配置
- `.eslintignore` - 忽略文件列表

**检查内容**:

- TypeScript 类型相关错误
- Prettier 格式化冲突
- 代码质量问题
- 最佳实践建议

**使用**:

```bash
pnpm lint            # 检查所有包
pnpm lint:fix        # 自动修复
pnpm -F @monorepo/core lint     # 检查特定包
```

---

### 5️⃣ 拼写检查

**目的**: 检查代码和文档中的拼写错误

**配置文件**: `cspell.json`

**检查范围**:

- 源代码文件
- 文档文件
- 配置文件

**使用**:

```bash
pnpm spell-check     # 检查拼写
pnpm spell-check:fix # 自动修复
```

---

### 6️⃣ Git 提交规范

**目的**: 规范化 Git 提交信息，便于版本管理

**工具链**:

- **Husky**: Git hooks 管理
- **commitlint**: 提交信息验证
- **commitizen**: 交互式提交

**配置文件**:

- `.husky/` - Git hooks 目录
- `commitlint.config.js` - 验证规则
- `.czrc` - commitizen 配置

**提交流程**:

```bash
# 方法 1: 使用 pnpm 脚本（推荐）
pnpm commit

# 方法 2: 使用 Git 别名
git cz

# 方法 3: 使用 pnpm exec
pnpm exec cz commit

# 方法 4: 标准 git commit（需符合规范）
git commit -m "feat: 新增功能"
```

**提交信息格式**:

```
<type>(<scope>): <subject>
<blank line>
<body>
<blank line>
<footer>
```

**类型 (type)**:

- `feat`: 新功能
- `fix`: 修复
- `docs`: 文档
- `style`: 代码风格（不影响功能）
- `refactor`: 重构
- `perf`: 性能优化
- `test`: 测试相关
- `chore`: 构建、工具链等

**范围 (scope)** (可选):

- `core`, `utils`, `components`, `docs` 等

**示例**:

```bash
git cz
# 交互式选择：
# ❯ feat
# ❯ core
# ❯ Add new utility function

# 生成: feat(core): Add new utility function
```

---

### 7️⃣ 库打包方案

**目的**: 将库代码编译为可复用的 npm 包

**工具**: **tsup** - 超快速 TypeScript 打包工具

**配置文件**: `packages/*/tsup.config.ts`

**输出格式**:

- ESM (`.js` 和 `.mjs`)
- CommonJS (`.cjs`)
- TypeScript 类型定义 (`.d.ts`)

**产物位置**: `packages/*/dist/`

**使用**:

```bash
pnpm build           # 构建所有包
pnpm -F @monorepo/core build    # 构建特定包
pnpm dev             # 开发模式（监听文件变化）
```

**package.json 导出配置**:

```json
{
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  }
}
```

---

### 8️⃣ 子包依赖管理

**目的**: 管理 monorepo 中各包之间的依赖关系

**工作区协议**:

```json
{
  "dependencies": {
    "@monorepo/core": "workspace:*"
  }
}
```

- `workspace:*` - 使用本地版本（任何版本都可以）
- `workspace:^` - 兼容版本
- `workspace:~` - 补丁版本

**依赖规则**:

```
核心库
  ↑
工具库、组件库
  ↑
应用程序
```

**安装和更新**:

```bash
# 给特定包添加依赖
pnpm add -F @monorepo/components react react-dom

# 给根目录添加开发依赖
pnpm add -D -w typescript eslint

# 更新所有包的依赖
pnpm update
```

**内部导入**:

```typescript
// 在 apps/docs 中导入其他包
import { add } from '@monorepo/core';
import { isEmpty } from '@monorepo/utils';
import { Button } from '@monorepo/components';
```

---

### 9️⃣ 发布和版本管理

**目的**: 自动化版本管理和 npm 发布流程

**工具**: **Changesets** - 版本管理 + 发布

**配置文件**: `.changeset/`

**工作流**:

#### 1. 创建变更文件

```bash
pnpm changeset
```

**交互式提示**:

```
Which packages would you like to include? › @monorepo/core
Which packages should have a major bump? › none
What kind of change is this for @monorepo/core? › Patch
Describe the change: Added new utility function
```

生成文件: `.changeset/kind-bears-1234.md`

#### 2. 提交变更

```bash
git add .changeset/
git commit -m "chore: release changes"
git push
```

#### 3. 发布版本

```bash
# 一键发布（构建 + 更新版本 + 发布到 npm）
pnpm changeset:publish
```

**版本管理规则**:

- **Major**: 不兼容的 API 变更
- **Minor**: 新增功能（向后兼容）
- **Patch**: 修复 Bug

**版本号格式**: `MAJOR.MINOR.PATCH` (如 1.2.3)

**验证发布**:

```bash
# 检查 npm 上的包
npm info @monorepo/core

# 在其他项目中安装使用
npm install @monorepo/core
```

---

## 项目结构

### 完整目录树

```
monorepo/
├── packages/                    # 可复用库目录
│   ├── core/                   # 核心业务逻辑
│   │   ├── src/
│   │   │   └── index.ts        # 导出 add, multiply
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── tsup.config.ts
│   │
│   ├── utils/                  # 工具函数
│   │   ├── src/
│   │   │   └── index.ts        # 导出 isEmpty, isNumber 等
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── tsup.config.ts
│   │
│   └── components/             # React 组件库
│       ├── src/
│       │   └── index.tsx       # Button 组件
│       ├── package.json
│       ├── tsconfig.json
│       └── tsup.config.ts
│
├── apps/                       # 应用程序目录
│   └── docs/                   # 文档/示例应用
│       ├── src/
│       │   └── main.tsx        # Vite + React 应用
│       ├── index.html
│       ├── package.json
│       ├── tsconfig.json
│       └── vite.config.ts
│
├── .changeset/                 # 版本管理
│   ├── config.json
│   └── README.md
│
├── .husky/                     # Git Hooks
│   ├── pre-commit
│   ├── commit-msg
│   └── prepare-commit-msg
│
├── 配置文件
│   ├── pnpm-workspace.yaml     # pnpm 工作区配置
│   ├── tsconfig.json           # TypeScript 基础配置
│   ├── .eslintrc               # ESLint 配置
│   ├── .prettierrc             # Prettier 配置
│   ├── .prettierignore         # Prettier 忽略文件
│   ├── .eslintignore           # ESLint 忽略文件
│   ├── .gitignore              # Git 忽略文件
│   ├── commitlint.config.js    # 提交信息验证
│   ├── cspell.json             # 拼写检查
│   ├── .nvmrc                  # Node 版本
│   ├── .tool-versions          # asdf 版本
│   ├── .czrc                   # commitizen 配置
│   └── .lintstagedrc.json      # 预提交检查
│
├── package.json                # 根配置
├── pnpm-lock.yaml              # 依赖锁文件
└── README.md                   # 项目说明（本文件）
```

### 包的用途

| 包名                   | 位置                   | 类型 | 描述                     |
| ---------------------- | ---------------------- | ---- | ------------------------ |
| `@monorepo/core`       | `packages/core/`       | 库   | 核心业务逻辑（数学函数） |
| `@monorepo/utils`      | `packages/utils/`      | 库   | 通用工具函数             |
| `@monorepo/components` | `packages/components/` | 库   | React 组件库             |
| `monorepo` (docs)      | `apps/docs/`           | 应用 | Vite React 应用示例      |

---

## 快速开始

### 前置要求

- Node.js >= 18.0.0
- pnpm >= 8.0.0

### 安装步骤

#### 1. 克隆或初始化项目

```bash
# 进入项目目录
cd /Users/ssngyu/Desktop/normal

# 或者如果是新项目
git clone <repository-url>
cd normal
```

#### 2. 安装依赖

```bash
# 使用 pnpm 安装所有依赖（所有包 + 根目录）
pnpm install

# 初始化 Husky Git Hooks
pnpm prepare
```

#### 3. 验证安装

```bash
# 检查所有命令是否可用
pnpm type-check   # TypeScript 类型检查
pnpm lint         # ESLint 检查
pnpm build        # 构建所有包
```

### 开发第一个功能

#### 方式 1: 修改现有库

```bash
# 编辑 packages/core/src/index.ts
# 添加新函数

# 构建
pnpm build

# 检查类型和代码质量
pnpm type-check
pnpm lint
pnpm format

# 提交
git cz
```

#### 方式 2: 创建新包

```bash
# 1. 创建目录结构
mkdir -p packages/new-package/src

# 2. 创建 package.json
cat > packages/new-package/package.json << 'EOF'
{
  "name": "@monorepo/new-package",
  "version": "1.0.0",
  "description": "New package",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "dev": "tsup --watch",
    "build": "tsup",
    "type-check": "tsc --noEmit",
    "lint": "eslint src --ext .ts,.tsx",
    "lint:fix": "eslint src --ext .ts,.tsx --fix"
  },
  "dependencies": {},
  "devDependencies": {
    "tsup": "^7.0.0",
    "typescript": "^5.0.0",
    "eslint": "^8.0.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0"
  }
}
EOF

# 3. 创建 tsconfig.json
# 复制已有包的配置并调整

# 4. 创建 tsup.config.ts
# 复制已有包的配置

# 5. 安装依赖
pnpm install

# 6. 编写代码
echo "export const myFunction = () => {};" > packages/new-package/src/index.ts

# 7. 构建和验证
pnpm build
pnpm lint
```

#### 方式 3: 创建新应用

```bash
# 使用 Vite 创建 React 应用
pnpm create vite apps/my-app --template react-ts

# 进入应用目录
cd apps/my-app

# 添加 monorepo 包依赖
pnpm add @monorepo/core @monorepo/utils @monorepo/components

# 开发
pnpm dev
```

---

## pnpm 指令大全

### 🏗️ 构建和开发

```bash
# 所有包进入开发模式（监听文件变化）
pnpm dev

# 构建所有包
pnpm build

# 开发特定包
pnpm -F @monorepo/core dev

# 构建特定包
pnpm -F @monorepo/components build
```

### 📝 代码质量

```bash
# TypeScript 类型检查
pnpm type-check

# ESLint 代码检查
pnpm lint

# 自动修复 ESLint 错误
pnpm lint:fix

# Prettier 格式化
pnpm format

# 检查格式是否符合要求
pnpm format:check

# 拼写检查
pnpm spell-check

# 自动修复拼写
pnpm spell-check:fix

# 运行所有检查（推荐提交前运行）
pnpm type-check && pnpm lint && pnpm format:check
```

### 📦 依赖管理

```bash
# 安装所有依赖
pnpm install

# 升级所有依赖
pnpm update

# 给特定包添加依赖
pnpm add -F @monorepo/core lodash

# 给特定包添加开发依赖
pnpm add -D -F @monorepo/core vitest

# 给根目录添加依赖（工作区级）
pnpm add -w -D some-tool

# 删除依赖
pnpm remove @monorepo/utils

# 查看依赖树
pnpm ls

# 清理依赖
pnpm prune
```

### 🔄 Workspace 操作

```bash
# 在所有包中运行命令
pnpm -r build

# 在所有包中并行运行（不等待依赖）
pnpm -r --parallel dev

# 仅在特定包中运行
pnpm -F @monorepo/core build

# 在特定包及其依赖中运行
pnpm -F @monorepo/core --recursive build
```

### 🌿 Git 和发布

```bash
# 创建规范提交（交互式）
pnpm commit

# 或使用 Git 别名
git cz

# 创建版本变更
pnpm changeset

# 更新 CHANGELOG 和版本号
pnpm changeset:version

# 发布到 npm（构建 + 更新版本 + 发布）
pnpm changeset:publish

# 初始化 Husky hooks
pnpm prepare
```

### 🔍 调试和检查

```bash
# 列出工作区中的所有包
pnpm ls -r --depth 0

# 查看特定包的详情
pnpm info @monorepo/core

# 检查过时的依赖
pnpm outdated

# 运行 package.json 中的脚本
pnpm <script-name>

# 查看所有可用脚本
pnpm run

# 显示配置信息
pnpm config list
```

### 🧹 清理

```bash
# 删除所有 node_modules 目录
pnpm install --frozen-lockfile

# 清理缓存
pnpm store prune

# 删除 pnpm-lock.yaml 并重新安装
rm pnpm-lock.yaml
pnpm install
```

---

## 配置说明

### pnpm-workspace.yaml

定义工作区的包位置：

```yaml
packages:
  - 'packages/*' # packages 目录下的所有子目录
  - 'apps/*' # apps 目录下的所有子目录

shared-workspace-lockfile: true # 使用共享的 pnpm-lock.yaml
```

### tsconfig.json (根)

TypeScript 基础配置和路径别名：

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020"],
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "paths": {
      "@monorepo/*": ["packages/*/src"]
    }
  }
}
```

**路径别名说明**:

- `@monorepo/core` → `packages/core/src`
- `@monorepo/utils` → `packages/utils/src`
- `@monorepo/components` → `packages/components/src`

### tsconfig.json (各包)

继承根配置并设置本地编译选项：

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "jsx": "react-jsx"
  },
  "include": ["src"],
  "exclude": ["node_modules"]
}
```

### .eslintrc

代码质量检查配置：

```json
{
  "root": true,
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": 2020,
    "sourceType": "module"
  },
  "extends": ["eslint:recommended", "plugin:@typescript-eslint/recommended", "prettier"],
  "plugins": ["@typescript-eslint", "prettier"],
  "rules": {
    "prettier/prettier": "error",
    "@typescript-eslint/no-explicit-any": "warn"
  },
  "ignorePatterns": ["dist", "node_modules", "*.config.js"]
}
```

### .prettierrc

代码格式化配置：

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false
}
```

### commitlint.config.js

Git 提交信息验证：

```javascript
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'chore', 'ci', 'revert'],
    ],
    'type-case': [2, 'always', 'lowerCase'],
    'subject-case': [2, 'always', 'lowerCase'],
  },
};
```

### cspell.json

拼写检查配置：

```json
{
  "version": "0.2",
  "language": "en",
  "words": ["monorepo", "pnpm", "tsup"],
  "ignoreWords": [],
  "import": [],
  "useGitignore": true
}
```

---

## 开发工作流

### 日常开发步骤

#### 1. 创建分支

```bash
# 创建特性分支
git checkout -b feat/add-new-function

# 或修复分支
git checkout -b fix/bug-name
```

#### 2. 编写代码

编辑文件并进行开发：

```bash
# 在特定包中开发（监听文件变化）
pnpm -F @monorepo/core dev
```

#### 3. 代码检查

在提交前进行检查：

```bash
# 逐个检查
pnpm type-check
pnpm lint
pnpm format

# 或一次性检查所有
pnpm type-check && pnpm lint && pnpm format:check
```

#### 4. 修复错误

```bash
# 自动修复 ESLint 和 Prettier 错误
pnpm lint:fix
pnpm format
```

#### 5. 测试和构建

```bash
# 构建所有包以验证没有构建错误
pnpm build

# 验证特定包
pnpm -F @monorepo/core build
```

#### 6. 提交代码

```bash
# 使用交互式提交（推荐）
pnpm commit

# 或使用 Git 别名
git cz

# 或者手动提交（需要符合规范）
git commit -m "feat(core): add new utility function"
```

#### 7. 推送和创建 PR

```bash
git push origin feat/add-new-function
# 在 GitHub/GitLab 创建 Pull Request
```

#### 8. 代码审查和合并

- 团队成员审查代码
- CI/CD 自动运行检查
- 合并到主分支

### 预提交检查 (lint-staged)

提交时自动运行检查（由 Husky 触发）：

**.lintstagedrc.json**:

```json
{
  "*.{ts,tsx,js,jsx}": ["eslint --fix", "prettier --write"],
  "*.{md,json,yaml}": ["prettier --write"]
}
```

**流程**:

1. 执行 `git commit`
2. Husky 的 `pre-commit` hook 触发
3. lint-staged 对暂存文件运行 ESLint 和 Prettier
4. 如果检查失败，提交被中止
5. 修复错误后重新提交

---

## 发布流程

### 完整发布步骤

#### 1. 开发和提交代码

```bash
# 进行开发并提交多个 commit
git cz
git cz
```

#### 2. 创建发布变更

```bash
# 启动交互式变更创建
pnpm changeset

# 选择需要发布的包
# ? Which packages would you like to include?
# ✔ @monorepo/core

# 选择版本提升类型
# ? What kind of change is this for @monorepo/core?
# ✔ patch

# 输入变更描述
# ? Describe the change
# Fixed bug in add function
```

**生成文件**: `.changeset/kind-bears-1234.md`

```markdown
---
'@monorepo/core': patch
'@monorepo/utils': minor
---

Fixed critical bug in core package
Added new type guards in utils
```

#### 3. 提交变更到 Git

```bash
git add .changeset/
git commit -m "chore: release changes"
git push
```

#### 4. 一键发布

```bash
# 构建 → 更新版本 → 发布到 npm
pnpm changeset:publish
```

**发生的事**:

1. `pnpm build` - 构建所有包
2. `pnpm changeset version` - 更新版本号和 CHANGELOG
3. `changeset publish` - 发布到 npm

#### 5. 验证发布

```bash
# 检查 npm 上的包版本
npm info @monorepo/core

# 或在网上查看
# https://www.npmjs.com/package/@monorepo/core

# 在其他项目安装验证
npm install @monorepo/core@latest
```

### 版本号规则

遵循 **Semantic Versioning (语义化版本)**:

```
MAJOR.MINOR.PATCH

例: 1.2.3
    ↑ ↑ ↑
    │ │ └─ 修复 Bug (patch)
    │ └─── 新增功能 (minor)
    └───── 不兼容更改 (major)
```

**版本提升规则**:

| 变更类型 | 版本  | 说明                 |
| -------- | ----- | -------------------- |
| Patch    | 1.0.1 | Bug 修复（向后兼容） |
| Minor    | 1.1.0 | 新功能（向后兼容）   |
| Major    | 2.0.0 | 破坏性变更           |

### CHANGELOG 自动生成

每次发布都会自动生成 CHANGELOG：

**packages/core/CHANGELOG.md**:

```markdown
## 1.1.0

### Features

- Add new multiply function
- Improve type definitions

### Bug Fixes

- Fix floating point precision issue

### Contributors

- John Doe
```

---

## 技术栈

### 核心技术

| 技术           | 版本     | 用途            |
| -------------- | -------- | --------------- |
| **pnpm**       | ^10.0.0  | 包管理器        |
| **Node.js**    | >=18.0.0 | 运行时环境      |
| **TypeScript** | ^5.0.0   | 类型检查        |
| **Vite**       | ^5.0.0   | 应用构建        |
| **tsup**       | ^7.0.0   | 库打包          |
| **React**      | ^18.0.0  | UI 框架（可选） |

### 开发工具

| 工具                  | 版本    | 用途        |
| --------------------- | ------- | ----------- |
| **ESLint**            | ^8.0.0  | 代码检查    |
| **Prettier**          | ^3.0.0  | 代码格式化  |
| **TypeScript ESLint** | ^6.0.0  | TS 类型检查 |
| **Husky**             | ^8.0.0  | Git Hooks   |
| **commitlint**        | ^18.0.0 | 提交验证    |
| **commitizen**        | ^4.0.0  | 交互式提交  |
| **lint-staged**       | ^15.0.0 | 预提交检查  |
| **Changesets**        | ^2.0.0  | 版本管理    |
| **cspell**            | ^8.0.0  | 拼写检查    |

### 依赖管理策略

- **生产依赖**: 核心业务代码依赖的包
- **开发依赖**: 构建工具、检查工具等
- **对等依赖**: 库提供但使用者需要安装的包（如 React）
- **工作区依赖**: 使用 `workspace:*` 协议引用本地包

---

## 常见问题

### 安装和初始化

#### Q: 如何安装项目？

**A**:

```bash
cd /Users/ssngyu/Desktop/normal
pnpm install
pnpm prepare
```

#### Q: pnpm install 很慢怎么办？

**A**:

```bash
# 切换镜像源
pnpm config set registry https://registry.npmmirror.com

# 或使用原始源
pnpm config set registry https://registry.npmjs.org

# 清理缓存后重试
pnpm store prune
pnpm install
```

#### Q: Node 版本不匹配怎么办？

**A**:

```bash
# 使用 nvm 切换版本
nvm install 18.18.0
nvm use

# 或使用 asdf
asdf install
```

### 开发和构建

#### Q: 如何在包之间共享代码？

**A**:
创建共享的工具包或组件，其他包通过路径别名导入：

```typescript
// packages/components/src/index.tsx
import { add } from '@monorepo/core';

export const MyComponent = () => {
  return <div>{add(1, 2)}</div>;
};
```

#### Q: 如何添加第三方依赖？

**A**:

```bash
# 给特定包添加依赖
pnpm add -F @monorepo/core lodash

# 给根目录添加开发依赖（所有包可用）
pnpm add -D -w typescript eslint

# 给工作区所有包添加同一依赖
pnpm add -r react react-dom
```

#### Q: 构建失败怎么办？

**A**:

```bash
# 1. 删除所有构建产物
rm -rf packages/*/dist apps/*/dist

# 2. 删除 node_modules 并重新安装
rm -rf node_modules pnpm-lock.yaml
pnpm install

# 3. 逐个检查错误
pnpm type-check
pnpm lint

# 4. 修复问题后重新构建
pnpm build
```

### Git 和提交

#### Q: 如何创建规范的提交信息？

**A**:

```bash
# 使用 pnpm 脚本（推荐）
pnpm commit

# 或使用 Git 别名
git cz

# 或直接使用 cz
pnpm exec cz commit

# 或手动遵循格式
git commit -m "feat(core): add new function"

# 格式: <type>(<scope>): <subject>
# type: feat|fix|docs|style|refactor|perf|test|chore
# scope: 包名（可选）
# subject: 简短描述
```

#### Q: 提交被拒绝了怎么办？

**A**:

```bash
# 通常是因为代码质量问题
# 1. 检查和修复错误
pnpm lint:fix
pnpm format

# 2. 重新提交
git cz
```

#### Q: 如何修改已提交的信息？

**A**:

```bash
# 修改最后一次提交
git commit --amend

# 或使用 commitizen
git cz --hook
```

### 版本和发布

#### Q: 如何发布新版本？

**A**:

```bash
# 1. 创建变更
pnpm changeset

# 2. 提交变更
git add .changeset/
git commit -m "chore: release"
git push

# 3. 发布
pnpm changeset:publish
```

#### Q: 如何预发版本（alpha/beta）？

**A**:

```bash
# 创建预发版本的变更
pnpm changeset

# 选择 "I will handle that myself" 或手动编辑 .changeset 文件
# 然后发布时指定标签
changeset publish --tag alpha
```

#### Q: 如何撤销已发布的版本？

**A**:

```bash
# 使用 npm deprecate 标记为已废弃
npm deprecate @monorepo/core@1.0.0 "This version has critical bugs"

# 或 unpublish（不推荐，最好发布补丁版本）
npm unpublish @monorepo/core@1.0.0 --force
```

### 错误排查

#### Q: "找不到模块 @monorepo/core" 错误

**A**:

```bash
# 1. 确保包存在
ls packages/core/package.json

# 2. 确保依赖已安装
pnpm install

# 3. 检查 tsconfig.json 中的路径别名配置
cat tsconfig.json | grep -A 5 '"paths"'

# 4. 确保导入路径正确
import { add } from '@monorepo/core';  // ✓ 正确
import { add } from '../packages/core'; // ✗ 错误
```

#### Q: "Permission denied" 错误

**A**:

```bash
# 给 Husky hooks 添加执行权限
chmod +x .husky/*

# 或重新初始化
rm -rf .husky
pnpm prepare
```

#### Q: ESLint 报告 TypeScript 错误

**A**:

```bash
# 更新 TypeScript 版本
pnpm add -D -w typescript@latest

# 重新生成类型检查
pnpm type-check

# 如果还有问题，清理缓存
pnpm lint --fix
```

### 性能优化

#### Q: 构建速度太慢

**A**:

```bash
# 1. 只构建变更的包
pnpm -r --filter "...modified" build

# 2. 使用缓存
pnpm build --cache

# 3. 并行构建
pnpm -r --parallel build

# 4. 检查依赖是否过多
pnpm ls | grep -c "packages/"
```

#### Q: 安装依赖太慢

**A**:

```bash
# 1. 使用最快的镜像
pnpm config set registry https://registry.npmmirror.com

# 2. 使用离线缓存
pnpm install --offline

# 3. 只安装生产依赖（开发时不需要）
pnpm install --prod

# 4. 清理旧缓存
pnpm store prune --force
```

---

## 总结

本 pnpm monorepo 模板提供了：

✅ **完整的工程基础设施**

- TypeScript + ESLint + Prettier 完整的质量保证
- Git hooks + commitlint + commitizen 规范的提交流程
- Husky 自动化的预提交检查
- Changesets 自动化的版本管理和发布

✅ **现代化的开发体验**

- pnpm workspaces 高效的依赖管理
- 路径别名 便捷的模块导入
- tsup + Vite 快速的构建工具
- 详细的文档和示例代码

✅ **生产级别的配置**

- 严格的 TypeScript 类型检查
- 自动的代码格式化和检查
- 完整的 Git 工作流规范
- 语义化版本和 CHANGELOG 生成

**开始使用**:

```bash
pnpm install    # 安装依赖
pnpm dev        # 开发
pnpm build      # 构建
pnpm lint       # 检查
pnpm format     # 格式化
```

**更多信息**:

- 官方文档: https://pnpm.io/
- TypeScript: https://www.typescriptlang.org/
- Vite: https://vitejs.dev/
- Changesets: https://github.com/changesets/changesets

---

**最后更新**: 2025年12月11日  
**项目状态**: ✅ 完全可用  
**核心功能**: 9 个（已移除单元测试框架）
