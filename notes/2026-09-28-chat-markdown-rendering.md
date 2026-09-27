# 聊天 Markdown 渲染

## 实现功能与规则

- AI 回复支持 Markdown 标题、段落、列表、引用、链接、表格、行内代码和代码块。
- 流式回复内容变化时会实时重新渲染，最终消息和历史消息使用相同展示方式。
- 客户消息继续按纯文本显示，避免客户输入被意外格式化。
- 禁止 Markdown 中的原始 HTML，并沿用解析器的危险链接校验，降低模型输出导致 XSS 的风险。

## 新增文件

- `src/components/chat/MarkdownContent.vue`：封装 AI 消息的 Markdown 展示。
- `src/utils/markdown.ts`：集中配置并执行 Markdown 解析。
- `src/utils/markdown.test.ts`：验证常用语法和基础安全规则。
- `notes/2026-09-28-chat-markdown-rendering.md`：记录本次前端改动。

## 修改文件

- `src/components/chat/ChatMessageList.vue`：AI 消息改用 Markdown 组件，客户消息保持纯文本。
- `src/styles/index.css`：增加标题、列表、引用、代码和表格等聊天内容样式。
- `package.json`、`package-lock.json`：增加 `markdown-it` 及其 TypeScript 类型依赖。

## API 影响

- 没有修改后端接口、请求参数或响应结构。

## 验证

- 运行 Markdown 单元测试，覆盖标题、表格、代码块、HTML 转义和危险链接。
- 运行 `npm run test`，共 7 个测试通过。
- 运行 `npm run build`，TypeScript 检查和 Vite 生产构建通过。

## 已知限制

- 当前没有代码语法高亮，只保留语言标记和统一代码块样式。
- 当前不支持模型输出的原始 HTML、自定义组件或 Mermaid 图表。
