import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { parseSseBlock, streamConversationMessage } from '@/api/sse'
import type { AuthResponse } from '@/types/auth'
import { clearAuthSession, writeAuthSession } from '@/utils/auth-storage'

const testSession: AuthResponse = {
  accessToken: 'test-token',
  tokenType: 'Bearer',
  expiresAt: '2026-09-28T00:00:00Z',
  user: {
    id: 1,
    username: 'customer01',
    displayName: '测试客户',
    role: 'CUSTOMER',
  },
}

beforeEach(() => {
  const entries = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    get length() { return entries.size },
    clear: () => entries.clear(),
    getItem: (key: string) => entries.get(key) ?? null,
    key: (index: number) => [...entries.keys()][index] ?? null,
    removeItem: (key: string) => entries.delete(key),
    setItem: (key: string, value: string) => entries.set(key, value),
  } satisfies Storage)
})

afterEach(() => {
  clearAuthSession()
  vi.unstubAllGlobals()
})

describe('SSE 事件解析', () => {
  it('多选续答应发送知识模式、原卡片编号和完整范围数组', async () => {
    writeAuthSession(testSession)
    const body = 'event: done\ndata: {"type":"done","assistantMessage":null}\n\n'
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(body, { status: 200 })))
    await streamConversationMessage(1, { content: '选择上海、北京', applicabilityScopes: ['CN_SH', 'CN_BJ'], clarificationMessageId: 42 }, {
      onStart: vi.fn(), onDelta: vi.fn(), onDone: vi.fn(), onError: vi.fn(),
    })
    expect(fetch).toHaveBeenCalledWith('/api/conversations/1/messages/stream', expect.objectContaining({
      body: JSON.stringify({ content: '选择上海、北京', applicabilityScopes: ['CN_SH', 'CN_BJ'], clarificationMessageId: 42, mode: 'KNOWLEDGE' }),
    }))
  })
  it('应解析事件名称并合并多行数据', () => {
    const parsed = parseSseBlock('event: delta\r\ndata: 第一行\r\ndata: 第二行')

    expect(parsed).toEqual({ event: 'delta', data: '第一行\n第二行' })
  })

  it('应忽略注释和不包含数据的事件块', () => {
    expect(parseSseBlock(': heartbeat\nevent: ping')).toBeNull()
  })

  it('应按顺序分发被网络分片拆开的聊天事件', async () => {
    writeAuthSession(testSession)
    const body = [
      'event: start\ndata: {"type":"start","userMessage":null,"assistantMessageId":2,"content":null,"pendingAction":null,"assistantMessage":null,"errorCode":null,"message":null}\n\n',
      'event: delta\ndata: {"type":"delta","userMessage":null,"assistantMessageId":null,"content":"你好","pendingAction":null,"assistantMessage":null,"errorCode":null,"message":null}\n\n',
      'event: action_required\ndata: {"type":"action_required","userMessage":null,"assistantMessageId":null,"content":null,"pendingAction":{"id":8},"assistantMessage":null,"errorCode":null,"message":null}\n\n',
      'event: done\ndata: {"type":"done","userMessage":null,"assistantMessageId":null,"content":null,"pendingAction":null,"assistantMessage":null,"errorCode":null,"message":null}\n\n',
    ].join('')
    const encoded = new TextEncoder().encode(body)
    const responseStream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoded.slice(0, 37))
        controller.enqueue(encoded.slice(37, 153))
        controller.enqueue(encoded.slice(153))
        controller.close()
      },
    })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(responseStream, { status: 200 })))
    const order: string[] = []

    await streamConversationMessage(1, '你好', {
      onStart: () => order.push('start'),
      onDelta: () => order.push('delta'),
      onActionRequired: () => order.push('action_required'),
      onDone: () => order.push('done'),
      onError: () => order.push('error'),
    })

    expect(order).toEqual(['start', 'delta', 'action_required', 'done'])
    expect(fetch).toHaveBeenCalledWith(
      '/api/conversations/1/messages/stream',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('预检失败时应保留后端业务错误码', async () => {
    writeAuthSession(testSession)
    const response = new Response(JSON.stringify({
      success: false,
      code: 'MODEL_STREAMING_NOT_SUPPORTED',
      message: '模型不支持流式输出',
      data: null,
      timestamp: new Date().toISOString(),
    }), {
      status: 409,
      headers: { 'Content-Type': 'application/json' },
    })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response))

    const promise = streamConversationMessage(1, '你好', {
      onStart: vi.fn(),
      onDelta: vi.fn(),
      onActionRequired: vi.fn(),
      onDone: vi.fn(),
      onError: vi.fn(),
    })

    await expect(promise).rejects.toMatchObject({
      code: 'MODEL_STREAMING_NOT_SUPPORTED',
    })
  })

  it('最后一个事件没有空行结尾时仍应正常结束', async () => {
    writeAuthSession(testSession)
    const body = 'event: done\ndata: {"type":"done","userMessage":null,"assistantMessageId":null,"content":null,"pendingAction":null,"assistantMessage":null,"errorCode":null,"message":null}'
    const responseStream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(body))
        controller.close()
      },
    })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(responseStream, { status: 200 })))
    const onDone = vi.fn()

    await streamConversationMessage(1, '你好', {
      onStart: vi.fn(),
      onDelta: vi.fn(),
      onActionRequired: vi.fn(),
      onDone,
      onError: vi.fn(),
    })

    expect(onDone).toHaveBeenCalledOnce()
  })
})
