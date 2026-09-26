import { ApiRequestError, apiBaseUrl } from '@/api/http'
import type { ApiResponse } from '@/types/api'
import type { ChatStreamEvent } from '@/types/conversation'
import { readAccessToken } from '@/utils/auth-storage'

export interface ParsedSseEvent {
  event: string
  data: string
}

export interface ChatStreamHandlers {
  onStart: (event: ChatStreamEvent) => void
  onDelta: (event: ChatStreamEvent) => void
  onDone: (event: ChatStreamEvent) => void
  onError: (event: ChatStreamEvent) => void
}

/**
 * 解析一个完整的 SSE 文本块，忽略注释和未知字段。
 */
export function parseSseBlock(block: string): ParsedSseEvent | null {
  let event = 'message'
  const dataLines: string[] = []

  for (const rawLine of block.split(/\r?\n/)) {
    if (!rawLine || rawLine.startsWith(':')) {
      continue
    }
    const separatorIndex = rawLine.indexOf(':')
    const field = separatorIndex === -1 ? rawLine : rawLine.slice(0, separatorIndex)
    let value = separatorIndex === -1 ? '' : rawLine.slice(separatorIndex + 1)
    if (value.startsWith(' ')) {
      value = value.slice(1)
    }
    if (field === 'event') {
      event = value
    } else if (field === 'data') {
      dataLines.push(value)
    }
  }

  return dataLines.length > 0 ? { event, data: dataLines.join('\n') } : null
}

/**
 * 发送客户消息并持续读取后端返回的 POST SSE 事件流。
 */
export async function streamConversationMessage(
  conversationId: number,
  content: string,
  handlers: ChatStreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  const token = readAccessToken()
  if (!token) {
    throw new ApiRequestError('登录状态已失效，请重新登录', 'UNAUTHORIZED')
  }

  const response = await fetch(`${apiBaseUrl}/conversations/${conversationId}/messages/stream`, {
    method: 'POST',
    headers: {
      Accept: 'text/event-stream, application/json',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content }),
    signal,
  })

  if (!response.ok) {
    const payload = await readErrorPayload(response)
    throw new ApiRequestError(payload.message, payload.code, payload.data)
  }
  if (!response.body) {
    throw new ApiRequestError('浏览器未收到流式响应内容', 'EMPTY_STREAM')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''
  let receivedTerminalEvent = false

  while (true) {
    const { done, value } = await reader.read()
    buffer += decoder.decode(value, { stream: !done })
    const blocks = buffer.split(/\r?\n\r?\n/)
    buffer = blocks.pop() ?? ''
    for (const block of blocks) {
      const parsed = parseSseBlock(block)
      if (!parsed) {
        continue
      }
      const event = JSON.parse(parsed.data) as ChatStreamEvent
      receivedTerminalEvent = dispatchChatEvent(parsed.event, event, handlers) || receivedTerminalEvent
    }
    if (done) {
      const parsed = parseSseBlock(buffer)
      if (parsed) {
        const event = JSON.parse(parsed.data) as ChatStreamEvent
        receivedTerminalEvent = dispatchChatEvent(parsed.event, event, handlers) || receivedTerminalEvent
      }
      break
    }
  }

  if (!receivedTerminalEvent) {
    throw new ApiRequestError('流式连接提前结束，请重试', 'STREAM_INTERRUPTED')
  }
}

/**
 * 根据 SSE 事件名称调用对应的聊天页面处理器，并返回是否已经结束。
 */
function dispatchChatEvent(
  eventName: string,
  event: ChatStreamEvent,
  handlers: ChatStreamHandlers,
): boolean {
  if (eventName === 'start') {
    handlers.onStart(event)
    return false
  }
  if (eventName === 'delta') {
    handlers.onDelta(event)
    return false
  }
  if (eventName === 'done') {
    handlers.onDone(event)
    return true
  }
  if (eventName === 'error') {
    handlers.onError(event)
    return true
  }
  return false
}

/**
 * 读取预检阶段返回的标准 JSON 错误，无法解析时使用 HTTP 状态构造兜底信息。
 */
async function readErrorPayload(response: Response): Promise<ApiResponse<unknown>> {
  try {
    return (await response.json()) as ApiResponse<unknown>
  } catch {
    return {
      success: false,
      code: `HTTP_${response.status}`,
      message: `请求失败（HTTP ${response.status}）`,
      data: null,
      timestamp: new Date().toISOString(),
    }
  }
}
