export type ConversationStatus = 'ACTIVE' | 'ARCHIVED'
export type ChatMessageRole = 'USER' | 'ASSISTANT' | 'SYSTEM' | 'TOOL'
export type ChatMessageStatus = 'PENDING' | 'COMPLETED' | 'FAILED'
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH'
export type PendingActionType = 'CREATE_TICKET'
export type PendingActionStatus = 'PENDING' | 'EXECUTED' | 'CANCELLED' | 'EXPIRED' | 'INVALIDATED'

export interface Conversation {
  id: number
  title: string
  status: ConversationStatus
  lastMessageAt: string | null
  createdAt: string
  updatedAt: string
}

export interface KnowledgeCitation {
  knowledgeBaseName: string
  sourceName: string
  chunkSequence: number
  content: string
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
  citations: KnowledgeCitation[]
  createdAt: string
  updatedAt: string
}

export interface PendingAction {
  id: number
  conversationId: number
  assistantMessageId: number
  actionType: PendingActionType
  status: PendingActionStatus
  title: string
  description: string
  priority: TicketPriority
  priorityReason: string | null
  ticketId: number | null
  expiresAt: string
  executedAt: string | null
  cancelledAt: string | null
  version: number
  createdAt: string
  updatedAt: string
}

export interface Ticket {
  id: number
  ticketNo: string
  title: string
  description: string
  status: 'PENDING' | 'PROCESSING' | 'RESOLVED' | 'CANCELLED'
  priority: TicketPriority
}

export interface PendingActionExecution {
  action: PendingAction
  ticket: Ticket
}

export interface UpdatePendingActionPayload {
  title: string
  description: string
  version: number
}

export interface ChatStreamEvent {
  type: 'start' | 'delta' | 'action_required' | 'done' | 'error'
  userMessage: ChatMessage | null
  assistantMessageId: number | null
  content: string | null
  pendingAction: PendingAction | null
  assistantMessage: ChatMessage | null
  errorCode: string | null
  message: string | null
}
