import { describe, expect, it } from 'vitest'

import { renderMarkdown } from '@/utils/markdown'

describe('Markdown 渲染', () => {
  it('应渲染标题、表格和代码块', () => {
    const result = renderMarkdown(`
# 处理步骤

| 状态 | 说明 |
| --- | --- |
| READY | 已完成 |

\`\`\`java
System.out.println("ok");
\`\`\`
`)

    expect(result).toContain('<h1>处理步骤</h1>')
    expect(result).toContain('<table>')
    expect(result).toContain('<code class="language-java">')
  })

  it('应转义原始 HTML 并拒绝危险链接', () => {
    const result = renderMarkdown('<script>alert("xss")</script>\n\n[危险链接](javascript:alert(1))')

    expect(result).not.toContain('<script>')
    expect(result).toContain('&lt;script&gt;')
    expect(result).not.toContain('href="javascript:')
  })
})
