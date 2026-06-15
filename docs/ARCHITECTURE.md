# 路径 Pathway — 产品架构与开发规划

> 这份文档是给 Claude Code 的开发蓝图。目标：把零散需求碎片一键生成结构化、符合团队风格的 PRD 草稿。架构按「会长成真产品」来设计，保证后续扩展方便。

---

## 1. 产品定位

一句话：把零散的需求碎片（会议记录 / 一句话想法 / 几条 bullet）一键生成**结构化、符合用户团队风格的 PRD 草稿**，支持分节编辑、局部重生成、导出。

双重身份：
- 对外是 Lab 板块的可交互 demo，用来展示能力
- 对内是自用 / 小团队可用的提效工具

---

## 2. 技术选型（给 Claude Code 的硬约束）

- **框架：Next.js (App Router) + TypeScript** —— 一套代码同时有前端和后端，LLM API Key 只留在服务端，**绝不进浏览器**。
- **样式：Tailwind CSS + shadcn/ui** —— 组件干净、可扩展。
- **动效/特效：Framer Motion**（注意：这是 React 动画库 `framer-motion`，跟做官网用的 Framer 建站工具是两码事）；炫的背景用 WebGL（`react-three-fiber` + `three.js`）或轻量 shader 渐变 / 颗粒。
- **LLM：Anthropic SDK**，默认模型 `claude-sonnet-4-6`；流式输出建议用 **Vercel AI SDK（`ai` 包）** 简化「边生成边渲染」。
- **部署：Vercel**（Next.js 原生，自定义域名 / 子域名一键配）。
- **数据库：MVP 阶段不要数据库（无状态）**；后续加历史记录时再接 Postgres（Supabase / Neon）+ ORM（Drizzle 或 Prisma）。

---

## 3. 核心数据模型（让一切可扩展的关键决策）

**不要把 PRD 当成一坨 markdown 字符串**，要存成结构化的「分节文档」：

```ts
type PRDSection = {
  id: string;
  title: string;        // 章节名
  type: string;         // background / goals / personas / scenarios / requirements / metrics ...
  content: string;      // markdown
  status: "draft" | "edited" | "regenerating";
};

type PRD = {
  id: string;
  sourceFragment: string;   // 原始碎片
  template: string;          // 用了哪个模板
  sections: PRDSection[];    // 有序
  createdAt: string;
};
```

这样「局部重生成、单节编辑、按节导出、未来换模板」全部变简单。

---

## 4. 模板即配置（PM 的核心资产，不写死在代码里）

把这三样放进**配置文件**（JSON / MD），随时能改、不用动代码：

1. **PRD 骨架** —— 有哪些 section、每节要回答什么
2. **风格规则** —— 图锚定 / 少子标题 / 给研发留实现空间……显式写成规则
3. **few-shot 范例** —— 1–2 份真实写过的好 PRD

好处：以后想加新文档类型（竞品分析、评审纪要……），只要**加一个新模板配置**，不用重写逻辑。

---

## 5. 目录结构（建议 Claude Code 照这个搭）

```
/app
  /page.tsx                    # 工具首页（落地页 + 入口）
  /generate/page.tsx           # 生成工作台（核心页面）
  /api
    /generate/route.ts         # 碎片 → PRD 草稿（流式）
    /refine/route.ts           # 单节重生成
    /clarify/route.ts          # 信息不足 → 返回澄清问题
    /export/route.ts           # 导出
/lib
  /engine
    prompt.ts                  # 纯函数：模板 + 风格 + 范例 + 碎片 → messages
    llm.ts                     # LLM 客户端，provider 抽象（方便换模型 / 加 fallback）
    schema.ts                  # PRD / section 类型定义
  /templates
    prd.default.json           # 模板配置（PM 维护，非代码）
    examples/                  # few-shot 范例
  /effects                     # 特效组件，独立一层，不和业务逻辑纠缠
/components
  /ui                          # 基础组件（shadcn）
  /prd                         # PRD 渲染器、分节编辑器
/store                         # 客户端状态（MVP 用 React state，长大了上 Zustand）
```

---

## 6. 运行时流程

```
碎片输入
  → /api/clarify（信息不足时先返回 3 个澄清问题，用户答完再继续）
  → /api/generate（服务端用模板 + 范例组装 prompt，调 Claude 流式返回）
  → 前端渲染成分节可编辑文档
  → 用户编辑 / 对某节调 /api/refine 重生成
  → /api/export 导出 / 复制
```

> 「澄清反问」这一步是 demo 和「能用」的分水岭，务必做。

---

## 7. 特效层架构（满足「炫」，又不拖累工具）

- **特效单独成层**（`/lib/effects` 或 `/components/effects`），业务逻辑不感知它的存在，方便随时换皮。
- **重特效放落地页 / Hero**（WebGL shader 渐变 / 3D / 颗粒），**真正的工具界面保持干净克制** —— 重特效放进工具里会拖慢、干扰使用。
- 配暗黑极简调性，建议「细腻 shader 渐变 + 颗粒噪点 + Framer Motion 微交互」，比满屏粒子更高级。
- **性能红线**：特效不能阻塞首屏和生成交互。

---

## 8. 可扩展性原则（后续加功能的保障）

- **关注点分离**：UI / engine(prompt+llm) / templates(配置) / integrations 各自独立。
- **prompt 组装是纯函数** → 好测、好换模型。
- **LLM provider 抽象** → 换 Sonnet / Haiku 或加备用模型不动业务。
- **每个能力一个 API route** → 加「导出飞书」「批量生成」就是加一个 route，不动老的。
- **按 feature 组织目录** → 新功能自成一块。

---

## 9. 域名 / 与现有站点的关系（已确认：现有项目是 Vite + React）

**约束**：不申请新域名，挂在现有域名下。

**结论**：Pathway 是**独立的 Next.js 项目（独立仓库）**，通过子域名挂到现有域名下。与作品集站（Vite + React）代码和部署完全隔离。

### 9.1 为什么不在现有 Vite 项目里加

现有站是 Vite + React（纯前端）。Pathway 需要服务端能力（藏 API Key、流式调 LLM、以后加数据库），硬往 Vite 里塞等于重新造一套后端。Next.js 天然全栈 + Vercel AI SDK 流式开箱即用，独立出来是正确选择。

### 9.2 怎么挂到同一个域名

1. Pathway 用 `create-next-app` 初始化，独立 Git 仓库
2. 部署到 Vercel，在 Vercel 项目设置里添加自定义域名：`lab.你的域名`（或 `pathway.你的域名`）
3. 去你的 DNS 服务商，加一条 CNAME 记录：`lab` → `cname.vercel-dns.com`
4. 从作品集 Lab 卡片链接到 `https://lab.你的域名`，用户感知上是一个站

两个项目各自独立部署、独立迭代，互不影响。

---

## 10. 阶段规划

| 阶段 | 内容 | 工作量 |
|---|---|---|
| **Phase 0（demo）** | 单页，无登录无数据库，碎片→草稿→编辑→复制。**先验证 prompt 出来的质量**（真正的风险在这，不在工程） | 半天–1 天 |
| **Phase 1（可用）** | 澄清反问、局部重生成、模板配置化、导出 markdown、特效落地页 | 几天 |
| **Phase 2（产品）** | 历史记录（接数据库）、多模板 / 项目、输入源接入（传文件 / 粘链接）、导出飞书 / Confluence、eval 集 | 持续 |
| **Phase 3（给别人用才做）** | 登录、权限、用量与计费 | 按需 |

---

## 附：给 Claude Code 的起手指令建议

> 读 CLAUDE.md 和 docs/ARCHITECTURE.md，按 Phase 0 搭项目骨架。用 Next.js (App Router) + TypeScript + Tailwind + shadcn/ui。首页 `/` 是一个简洁的输入页面，一个输入框收需求碎片，一个生成按钮，调用服务端 `/api/generate`（用 Anthropic SDK + Vercel AI SDK 流式），把返回的 PRD 按 section 渲染成可编辑卡片，支持复制导出。模板、风格规则、few-shot 范例放在 `/lib/templates/prd.default.json` 里。先不要数据库、不要登录。做完后更新 docs/CHANGELOG.md。
