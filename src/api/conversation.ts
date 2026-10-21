import { requestData, requestVoid } from '@/api/http'
import type { PageResponse } from '@/types/api'
import type { ChatMessage, Conversation } from '@/types/conversation'

/**
 * 分页查询当前客户的对话，首页默认加载最近更新的二十条。
 */
export function listConversations(page = 1): Promise<PageResponse<Conversation>> {
  return requestData<PageResponse<Conversation>>({
    method: 'GET',
    url: '/conversations',
    params: { page, size: 20, status: 'ACTIVE' },
  })
}

/**
 * 创建一个新的客户对话。
 */
export function createConversation(title: string): Promise<Conversation> {
  return requestData<Conversation>({
    method: 'POST',
    url: '/conversations',
    data: { title },
  })
}

/**
 * 删除当前客户自己的对话；后端会归档并保留历史审计数据。
 */
export function deleteConversation(conversationId: number): Promise<void> {
  return requestVoid({
    method: 'DELETE',
    url: `/conversations/${conversationId}`,
  })
}

/**
 * 分页查询指定对话的历史消息。
 */
export function listMessages(conversationId: number, page = 1): Promise<PageResponse<ChatMessage>> {
  return requestData<PageResponse<ChatMessage>>({
    method: 'GET',
    url: `/conversations/${conversationId}/messages`,
    params: { page, size: 100 },
  })
}
