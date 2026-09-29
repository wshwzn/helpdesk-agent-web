# 智能工单助手客户前端

`helpdesk-agent-web` 是 `helpdesk-agent` 的独立客户前端。当前版本提供客户注册、登录、对话创建、切换和删除、历史消息查看、AI 流式问答，以及 AI 工单草稿的修改、确认和取消。

## 技术栈

- Vue 3、TypeScript、Vite
- Pinia、Vue Router、Axios
- Element Plus
- Vitest

## 本地运行

先启动 `helpdesk-agent` 后端，默认地址为 `http://localhost:8080`，再执行：

```bash
npm install
npm run dev
```

浏览器访问 `http://127.0.0.1:5173`。开发服务器会把 `/api` 请求代理到后端。若后端地址不同，请复制 `.env.example` 为 `.env.local`，修改 `VITE_BACKEND_URL`；不要提交该文件。

## 常用命令

```bash
npm run dev         # 启动开发服务器
npm run test        # 运行 Vitest 测试
npm run type-check  # 执行 TypeScript 类型检查
npm run build       # 类型检查并生成生产构建
npm run preview     # 本地预览生产构建
```

## 目录说明

- `src/views/`：登录、注册和聊天页面。
- `src/components/`：品牌标识及聊天组件。
- `src/api/`：普通 HTTP 请求与 POST SSE 流式请求。
- `src/stores/`：登录用户和令牌状态。
- `src/types/`：接口请求、响应和领域类型。
- `src/utils/`：本地认证存储和日期格式化工具。
- `notes/`：每轮功能变更的中文说明。

## AI 工单确认卡片

AI 判断问题需要人工处理时，聊天流会返回 `action_required` 事件。前端把草稿展示在对应 AI 消息下方，客户可以：

- 查看 AI 整理的标题、描述、优先级和判断理由；
- 修改标题和问题描述；
- 确认后创建真实工单，或取消本次草稿；
- 在刷新或切换对话后恢复已确认、已取消、已过期和已失效状态。

前端使用以下后端接口：

```http
GET   /api/agent/actions?conversationId={id}
PATCH /api/agent/actions/{id}
POST  /api/agent/actions/{id}/confirm
POST  /api/agent/actions/{id}/cancel
```

## 当前范围

当前已经实现客户对话和 AI 工单确认主链路。完整工单列表、跨部门处理、人工客服转接、模型配置与管理端页面暂未包含。登录令牌目前存放在 `localStorage`，适合本地学习与演示；正式部署前应结合后端改为更安全的 HttpOnly Cookie 方案。
