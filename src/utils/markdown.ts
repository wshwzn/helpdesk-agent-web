import MarkdownIt from 'markdown-it'

const markdown = new MarkdownIt({
  breaks: true,
  html: false,
  linkify: true,
  typographer: true,
})

/**
 * 将 AI 返回的 Markdown 文本转换为禁用原始 HTML 的安全展示内容。
 */
export function renderMarkdown(content: string): string {
  return markdown.render(content)
}
