# 知序 · 企业知识工作区

`helpdesk-agent-web` 是 `helpdesk-agent` 的独立员工问答前端，使用 Vue 3、TypeScript、Vite、Pinia、Vue Router、Axios 和 Element Plus，使用 Vitest 进行测试。

## 当前功能

- 注册、登录、退出，沿用后端现有账号与权限体系。
- 新建提问、分页查看和删除对话、查找已加载的历史记录。真正发送问题时才创建会话。
- 企业知识问答统一发送 `KNOWLEDGE` 模式；等待服务端 `done` 中的完整消息后展示回答与报告。
- 展示有依据的结论、缺失条件和冲突双方；技术失败单独提示，历史无报告回答标注“未附核验报告”。
- 适用范围澄清支持最多三个选项，只能提交最新有效卡片；续答携带原卡片编号与多个范围。
- 点击引用编号或来源查看引用原文、业务版本、适用范围及回答时的证据快照。仅展示答案实际引用的证据。
- 支持停止等待、问题回填、桌面布局和手机窄屏导航。

## 本地运行

先启动 `helpdesk-agent` 后端，默认地址为 `http://localhost:8080`，再执行：

```bash
npm install
npm run dev
```

浏览器访问 `http://127.0.0.1:5173`。开发服务器会把 `/api` 请求代理到后端。若后端地址不同，请复制 `.env.example` 为 `.env.local`，修改 `VITE_BACKEND_URL`；不要提交该文件。账号及默认知识库、模型均使用后端配置，前端不内置登录凭据。

## 常用命令

```bash
npm run dev         # 启动开发服务器
npm run test        # 运行 Vitest 测试
npm run type-check  # 执行 TypeScript 类型检查
npm run build      # 类型检查并生成生产构建
npm run preview    # 本地预览生产构建
```

## 目录说明

- `src/views/`：登录、注册及员工知识问答页面。
- `src/components/chat/`：输入框、历史导航、结构化回答、澄清卡片、证据侧栏。
- `src/composables/useKnowledgeChat.ts`：会话分页、发送、停止等待和迟到响应隔离。
- `src/api/`：HTTP 与 POST SSE 请求。
- `src/types/`：接口和知识核验报告类型。
- `src/utils/knowledge.ts`：引用筛选、澄清请求构造及状态展示规则。
- `src/stores/`：登录用户和令牌状态。
- `src/styles/workspace.css`：工作区视觉及响应式布局。
- `notes/`：开发说明与验证记录。

## 接口与交互边界

使用既有认证接口，以及 `/api/conversations`、`/api/conversations/{id}/messages`、`/api/conversations/{id}/messages/stream`。未新增后端接口或数据库字段。

普通提问应自行写明地区、对象和事项，不承诺自动继承历史问题条件。明确的澄清续答通过 `clarificationMessageId` 和 `applicabilityScopes` 关联原问题。

“停止等待”中断浏览器请求，不保证后台或模型计费停止。后台可能仍完成回答，重新打开对话以服务端保存结果为准。页面不展示虚构的检索阶段或进度百分比。

历史来源属于回答时的证据快照，不表示文档现在仍有效。历史检索框仅过滤已加载的会话；查看更多记录需继续分页加载。

本轮重建员工端，管理端仍在独立仓库中。旧工单组件与接口文件暂保留，但当前聊天页已不加载工单操作或草稿轮询。登录令牌仍沿用现有 `localStorage` 方案，未改变鉴权架构。
