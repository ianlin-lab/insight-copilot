# CLAUDE.md

> 任何 AI agent（Claude Code / Codex / 其他）进入本项目，**第一件事读这个文件**。

---

## 项目概况

这是 **「路径 Pathway」**——一个独立的 AI 驱动 PRD 生成工具，把零散需求碎片一键生成结构化、符合团队风格的 PRD 草稿。

本项目是一个**独立的 Next.js 应用**，与作者的个人作品集站（Vite + React，另一个仓库）通过子域名共享同一个域名，但代码和部署完全隔离、互不影响。

---

## 必读文档

开工前按顺序读：
1. **本文件**（你正在读的）
2. **`docs/ARCHITECTURE.md`** —— 完整架构规划、数据模型、运行时流程、阶段规划
3. **`docs/CHANGELOG.md`** —— 开发日志，了解已经做了什么、留了什么坑

---

## 技术栈

- Next.js (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- Framer Motion（动效）
- Anthropic SDK + Vercel AI SDK（LLM 调用，流式输出）
- 部署：Vercel（子域名绑定，如 `lab.域名` 或 `pathway.域名`）

---

## 目录结构

```
/app
  /page.tsx                    → 工具首页（落地页 + 入口）
  /generate/page.tsx           → 生成工作台（核心页面）
  /api
    /generate/route.ts         → 碎片 → PRD 草稿（流式）
    /refine/route.ts           → 单节重生成
    /clarify/route.ts          → 信息不足 → 返回澄清问题
    /export/route.ts           → 导出
/lib
  /engine
    prompt.ts                  → 纯函数：模板 + 风格 + 范例 + 碎片 → messages
    llm.ts                     → LLM 客户端，provider 抽象
    schema.ts                  → PRD / section 类型定义
  /templates
    prd.default.json           → 模板配置（PM 维护，非代码）
    examples/                  → few-shot 范例
  /effects                     → 特效组件（独立层，不和业务逻辑耦合）
/components
  /ui                          → 基础组件（shadcn）
  /prd                         → PRD 渲染器、分节编辑器
```

---

## 硬规则（所有 agent 必须遵守）

### 安全
- **不把 API Key 暴露到客户端**：`ANTHROPIC_API_KEY` 只在服务端使用，环境变量绝不加 `NEXT_PUBLIC_` 前缀

### 范围
- **不引入数据库**：MVP 阶段无状态，不装 ORM、不建表、不接任何持久化
- **不加登录 / 鉴权**：MVP 不需要

### 代码规范
- TypeScript strict，不用 `any`
- 注释用中文
- 样式用 Tailwind utility class，不用 `@apply`，不写独立 CSS 文件
- 组件默认导出，文件名 kebab-case
- prompt 组装必须是**纯函数**（输入模板+碎片 → 输出 messages 数组），方便测试和换模型

### 架构原则
- **关注点分离**：UI / engine / templates / effects 各自独立
- **LLM provider 抽象**：换模型（Sonnet → Haiku、加 fallback）不动业务代码
- **每个能力一个 API route**：加新功能 = 加新 route，不改老的
- **模板是配置不是代码**：PRD 骨架、风格规则、few-shot 放 `/lib/templates/`，JSON/MD 格式
- **特效懒加载**：WebGL / 3D 组件用 `next/dynamic` + `ssr: false`，不进主包

---

## 多 agent 协作规则

本项目会被多个 AI agent 交替开发（Claude Code、Codex 等）。

### 接手时
1. 读 `CLAUDE.md`（本文件）
2. 读 `docs/ARCHITECTURE.md`
3. 读 `docs/CHANGELOG.md` 最近几条，了解当前进度

### 交接时
每次完成一轮工作，**必须**在 `docs/CHANGELOG.md` 顶部追加一条记录：

```markdown
## YYYY-MM-DD | Agent 名称
- 做了什么（简要）
- 改了 / 新增了哪些文件
- 已知问题 / TODO
```

---

## 当前阶段

**Phase 0（demo）**：单页，无登录无数据库。碎片 → 生成 → 分节可编辑 → 复制。目标是验证 prompt 输出质量。

详见 `docs/ARCHITECTURE.md` 第 10 节的完整阶段规划。
