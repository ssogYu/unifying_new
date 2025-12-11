已完成的 10 个核心功能
✅ 环境版本锁定

.nvmrc - Node 18.18.0
.tool-versions - asdf 工具版本
package.json#engines - npm/pnpm 版本约束
✅ TypeScript 环境配置

根 tsconfig.json 与路径别名
各包独立配置（库级、应用级、React 组件级）
✅ Prettier 代码格式化

.prettierrc - 统一的代码风格
.prettierignore - 忽略列表
✅ ESLint 代码检查

.eslintrc - TypeScript + Prettier 集成
.eslintignore - 忽略列表
✅ 拼写检查

cspell.json - 代码和文档拼写检查
✅ Git 提交规范

commitizen - 交互式提交界面
husky - Git 钩子管理
lint-staged - 增量检查
commitlint - 提交信息验证
✅ 公共库打包方案

tsup 配置 - 快速构建工具
ESM + CommonJS 双格式输出
TypeScript 定义生成
✅ 子包间依赖管理

workspace:\* 协议配置
路径别名支持
自动链接和依赖解析
✅ 单元测试

vitest.config.ts - 快速测试框架
React 环境支持 (jsdom)
覆盖率报告生成
✅ 发布方案

changesets - 自动化版本管理
CHANGELOG 生成
npm 发布流程
