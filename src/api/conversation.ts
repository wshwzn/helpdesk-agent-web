import { requestData } from '@/api/http'
import type { PageResponse } from '@/types/api'
import type { ChatMessage, Conversation } from '@/types/conversation'

/**
 * 分页查询当前客户的对话，首页默认加载最近更新的二十条。
 */
export function listConversations(): Promise<PageResponse<Conversation>> {
  return requestData<PageResponse<Conversation>>({
    method: 'GET',
    url: '/conversations',
    params: { page: 1, size: 20, status: 'ACTIVE' },
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
 * 分页查询指定对话的历史消息。
 */
export function listMessages(conversationId: number): Promise<PageResponse<ChatMessage>> {
  return requestData<PageResponse<ChatMessage>>({
    method: 'GET',
    url: `/conversations/${conversationId}/messages`,
    params: { page: 1, size: 100 },
  })
}
