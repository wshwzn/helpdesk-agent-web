<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElButton, ElMessage, ElMessageBox } from 'element-plus'

import { createConversation, listConversations, listMessages } from '@/api/conversation'
import { normalizeApiError } from '@/api/http'
import {
  cancelPendingAction,
  confirmPendingAction,
  listPendingActions,
  updatePendingAction,
} from '@/api/pending-action'
import { streamConversationMessage } from '@/api/sse'
import BrandMark from '@/components/BrandMark.vue'
import ChatComposer from '@/components/chat/ChatComposer.vue'
import ChatMessageList from '@/components/chat/ChatMessageList.vue'
import ConversationSidebar from '@/components/chat/ConversationSidebar.vue'
import { useAuthStore } from '@/stores/auth'
import type { ChatMessage, ChatStreamEvent, Conversation, PendingAction } from '@/types/conversation'

const router = useRouter()
const authStore = useAuthStore()
const conversations = ref<Conversation[]>([])
const selectedConversation = ref<Conversation | null>(null)
const messages = ref<ChatMessage[]>([])
const pendingActions = ref<PendingAction[]>([])
const busyActionIds = ref<number[]>([])
const loadingConversations = ref(false)
const loadingMessages = ref(false)
const streaming = ref(false)
const streamController = ref<AbortController | null>(null)
const selectedConversationId = computed(() => selectedConversation.value?.id ?? null)

/**
 * 加载最近对话，并在首次进入时自动打开第一条记录。
 */
async function loadConversations(selectFirst = true): Promise<void> {
  loadingConversations.value = true
  try {
    const page = await listConversations()
    conversations.value = page.records
    if (selectFirst && !selectedConversation.value && page.records[0]) {
      await selectConversation(page.records[0])
    } else if (selectedConversation.value) {
      selectedConversation.value = page.records.find((item) => item.id === selectedConversation.value?.id)
        ?? selectedConversation.value
    }
  } catch (error) {
    ElMessage.error(normalizeApiError(error).message)
  } finally {
    loadingConversations.value = false
  }
}

/**
 * 切换当前对话并读取其完整消息历史。
 */
async function selectConversation(conversation: Conversation): Promise<void> {
  if (streaming.value) {
    ElMessage.warning('请等待当前回答生成完成')
    return
  }
  selectedConversation.value = conversation
  messages.value = []
  pendingActions.value = []
  loadingMessages.value = true
  try {
    const [messagePage, actions] = await Promise.all([
      listMessages(conversation.id),
      listPendingActions(conversation.id),
    ])
    if (selectedConversationId.value === conversation.id) {
      messages.value = messagePage.records
      pendingActions.value = actions
    }
  } catch (error) {
    ElMessage.error(normalizeApiError(error).message)
  } finally {
    loadingMessages.value = false
  }
}

/**
 * 询问新对话标题，创建成功后立即切换到该对话。
 */
async function createNewConversation(): Promise<void> {
  if (streaming.value) {
    return
  }
  try {
    const result = await ElMessageBox.prompt('给这次咨询起一个简短标题', '新建对话', {
      confirmButtonText: '创建',
      cancelButtonText: '取消',
      inputPlaceholder: '例如：账号登录问题',
      inputPattern: /^.{1,100}$/s,
      inputErrorMessage: '标题长度应为 1 至 100 个字符',
    })
    const conversation = await createConversation(result.value.trim())
    conversations.value.unshift(conversation)
    await selectConversation(conversation)
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      ElMessage.error(normalizeApiError(error).message)
    }
  }
}

/**
 * 将客户消息发送到 SSE 接口，并实时更新正在生成的 AI 消息。
 */
async function sendMessage(content: string): Promise<void> {
  const conversationId = selectedConversationId.value
  if (!conversationId || streaming.value) {
    return
  }

  streaming.value = true
  const controller = new AbortController()
  streamController.value = controller
  try {
    await streamConversationMessage(
      conversationId,
      content,
      {
        onStart: handleStreamStart,
        onDelta: handleStreamDelta,
        onActionRequired: handleActionRequired,
        onDone: handleStreamDone,
        onError: handleStreamError,
      },
      controller.signal,
    )
    await loadConversations(false)
  } catch (error) {
    if (!controller.signal.aborted) {
      ElMessage.error(normalizeApiError(error).message)
      markPendingMessageFailed('STREAM_INTERRUPTED')
    }
  } finally {
    streaming.value = false
    streamController.value = null
  }
}

/**
 * 接收 start 事件，将后端保存的客户消息和 AI 占位消息加入界面。
 */
function handleStreamStart(event: ChatStreamEvent): void {
  if (!event.userMessage || !event.assistantMessageId || !selectedConversationId.value) {
    return
  }
  messages.value.push(event.userMessage)
  messages.value.push({
    id: event.assistantMessageId,
    conversationId: selectedConversationId.value,
    role: 'ASSISTANT',
    content: '',
    status: 'PENDING',
    modelConfigId: null,
    modelName: null,
    promptTokens: null,
    completionTokens: null,
    totalTokens: null,
    errorCode: null,
    citations: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })
}

/**
 * 接收 delta 事件，将新增文本拼接到等待中的 AI 消息。
 */
function handleStreamDelta(event: ChatStreamEvent): void {
  const pendingMessage = findPendingAssistant()
  if (pendingMessage && event.content) {
    pendingMessage.content = `${pendingMessage.content ?? ''}${event.content}`
  }
}

/**
 * 接收 action_required 事件，并把工单草稿挂到对应的 AI 消息下方。
 */
function handleActionRequired(event: ChatStreamEvent): void {
  if (event.pendingAction) {
    upsertPendingAction(event.pendingAction)
  }
}

/**
 * 接收 done 事件，用数据库中的最终消息替换页面占位消息。
 */
function handleStreamDone(event: ChatStreamEvent): void {
  if (!event.assistantMessage) {
    return
  }
  const index = messages.value.findIndex((message) => message.id === event.assistantMessage?.id)
  if (index >= 0) {
    messages.value[index] = event.assistantMessage
  }
}

/**
 * 接收脱敏 error 事件，并把页面中的等待消息更新为失败状态。
 */
function handleStreamError(event: ChatStreamEvent): void {
  markPendingMessageFailed(event.errorCode ?? 'CHAT_GENERATION_FAILED')
  ElMessage.error('AI 回答生成失败，请稍后重试')
}

/**
 * 查找本轮仍处于等待状态的 AI 消息。
 */
function findPendingAssistant(): ChatMessage | undefined {
  return [...messages.value]
    .reverse()
    .find((message) => message.role === 'ASSISTANT' && message.status === 'PENDING')
}

/**
 * 将当前等待中的 AI 消息标记为失败，避免页面一直显示加载状态。
 */
function markPendingMessageFailed(errorCode: string): void {
  const pendingMessage = findPendingAssistant()
  if (pendingMessage) {
    pendingMessage.status = 'FAILED'
    pendingMessage.errorCode = errorCode
  }
}

/**
 * 保存客户修改后的工单标题和描述，并使用服务端新版本替换卡片。
 */
async function savePendingAction(
  actionId: number,
  title: string,
  description: string,
  version: number,
): Promise<void> {
  setActionBusy(actionId, true)
  try {
    const action = await updatePendingAction(actionId, { title, description, version })
    upsertPendingAction(action)
    ElMessage.success('工单草稿已保存')
  } catch (error) {
    await handleActionFailure(error)
  } finally {
    setActionBusy(actionId, false)
  }
}

/**
 * 确认当前草稿并展示后端创建成功的真实工单编号。
 */
async function confirmAction(actionId: number, version: number): Promise<void> {
  setActionBusy(actionId, true)
  try {
    const result = await confirmPendingAction(actionId, version)
    upsertPendingAction(result.action)
    ElMessage.success(`工单 ${result.ticket.ticketNo} 创建成功`)
  } catch (error) {
    await handleActionFailure(error)
  } finally {
    setActionBusy(actionId, false)
  }
}

/**
 * 取消不再需要提交的工单草稿，并同步卡片最终状态。
 */
async function cancelAction(actionId: number, version: number): Promise<void> {
  setActionBusy(actionId, true)
  try {
    const action = await cancelPendingAction(actionId, version)
    upsertPendingAction(action)
    ElMessage.success('工单草稿已取消')
  } catch (error) {
    await handleActionFailure(error)
  } finally {
    setActionBusy(actionId, false)
  }
}

/**
 * 插入或替换当前对话中的确认操作，忽略已经切换离开的对话响应。
 */
function upsertPendingAction(action: PendingAction): void {
  if (action.conversationId !== selectedConversationId.value) {
    return
  }
  const index = pendingActions.value.findIndex((item) => item.id === action.id)
  if (index >= 0) {
    pendingActions.value[index] = action
  } else {
    pendingActions.value.push(action)
  }
}

/**
 * 更新卡片的请求中状态，避免客户重复点击产生并发操作。
 */
function setActionBusy(actionId: number, busy: boolean): void {
  const ids = new Set(busyActionIds.value)
  if (busy) {
    ids.add(actionId)
  } else {
    ids.delete(actionId)
  }
  busyActionIds.value = [...ids]
}

/**
 * 显示操作失败原因并重新加载当前对话卡片，恢复最新版本与状态。
 */
async function handleActionFailure(error: unknown): Promise<void> {
  ElMessage.error(normalizeApiError(error).message)
  const conversationId = selectedConversationId.value
  if (!conversationId) {
    return
  }
  try {
    const actions = await listPendingActions(conversationId)
    if (selectedConversationId.value === conversationId) {
      pendingActions.value = actions
    }
  } catch (refreshError) {
    ElMessage.error(normalizeApiError(refreshError).message)
  }
}

/**
 * 清除登录会话并返回登录页面。
 */
async function logout(): Promise<void> {
  streamController.value?.abort()
  authStore.logout()
  await router.replace('/login')
}

onMounted(() => loadConversations())
onBeforeUnmount(() => streamController.value?.abort())
</script>

<template>
  <main class="chat-page">
    <header class="app-header">
      <div class="app-brand">
        <BrandMark />
        <div>
          <strong>智能工单助手</strong>
          <small>Customer Workspace</small>
        </div>
      </div>
      <div class="user-menu">
        <span class="user-avatar">{{ authStore.user?.displayName.slice(0, 1) }}</span>
        <div class="user-menu__text">
          <strong>{{ authStore.user?.displayName }}</strong>
          <small>{{ authStore.user?.username }}</small>
        </div>
        <el-button text @click="logout">退出</el-button>
      </div>
    </header>

    <section class="chat-workspace">
      <ConversationSidebar
        :conversations="conversations"
        :selected-id="selectedConversationId"
        :loading="loadingConversations"
        :disabled="streaming"
        @select="selectConversation"
        @create="createNewConversation"
      />

      <section class="chat-main">
        <template v-if="selectedConversation">
          <div class="chat-heading">
            <div>
              <p class="section-kicker">当前咨询</p>
              <h1>{{ selectedConversation.title }}</h1>
            </div>
            <span class="online-status"><i></i> AI 服务在线</span>
          </div>
          <ChatMessageList
            :messages="messages"
            :pending-actions="pendingActions"
            :busy-action-ids="busyActionIds"
            :loading="loadingMessages"
            @update-action="savePendingAction"
            @confirm-action="confirmAction"
            @cancel-action="cancelAction"
          />
          <div class="composer-area">
            <ChatComposer
              :disabled="loadingMessages || streaming"
              :streaming="streaming"
              @send="sendMessage"
            />
          </div>
        </template>

        <div v-else class="no-conversation">
          <div class="no-conversation__symbol">＋</div>
          <h2>创建你的第一次咨询</h2>
          <p>新建一个对话，智能助手会在这里实时回答。</p>
          <el-button type="primary" size="large" @click="createNewConversation">新建对话</el-button>
        </div>
      </section>
    </section>
  </main>
</template>
