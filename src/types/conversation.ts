export type ConversationStatus = 'ACTIVE' | 'ARCHIVED'
export type ChatMessageRole = 'USER' | 'ASSISTANT' | 'SYSTEM' | 'TOOL'
export type ChatMessageStatus = 'PENDING' | 'COMPLETED' | 'FAILED'

export interface Conversation {
  id: number
  title: string
  status: ConversationStatus
  lastMessageAt: string | null
  createdAt: string
  updatedAt: string
}

export interface ChatMessage {
  id: number
  conversationId: number
  role: ChatMessageRole
  content: string | null
  status: ChatMessageStatus
  modelConfigId: number | null
  modelName: string | null
  promptTokens: number | null
  completionTokens: number | null
  totalTokens: number | null
  errorCode: string | null
  createdAt: string
  updatedAt: string
}

export interface ChatStreamEvent {
  type: 'start' | 'delta' | 'done' | 'error'
  userMessage: ChatMessage | null
  assistantMessageId: number | null
  content: string | null
  assistantMessage: ChatMessage | null
  errorCode: string | null
  message: string | null
}
