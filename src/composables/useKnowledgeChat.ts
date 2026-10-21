import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { createConversation, deleteConversation, listConversations, listMessages } from '@/api/conversation'
import { normalizeApiError } from '@/api/http'
import { streamConversationMessage } from '@/api/sse'
import type { ChatMessage, Conversation, SendMessagePayload } from '@/types/conversation'
import { canContinue, clarificationPayload } from '@/utils/knowledge'

/** 管理可信问答的会话、分页和请求生命周期，拒绝切换后迟到响应污染当前界面。 */
export function useKnowledgeChat() {
  const conversations = ref<Conversation[]>([])
  const selected = ref<Conversation | null>(null)
  const messages = ref<ChatMessage[]>([])
  const draft = ref('')
  const loading = ref(false)
  const loadingOlder = ref(false)
  const loadingHistory = ref(false)
  const streaming = ref(false)
  const deleting = ref(false)
  const historyError = ref('')
  const messageError = ref('')
  const conversationPage = ref(0)
  const hasMore = ref(false)
  const oldestPage = ref(1)
  const busy = computed(() => streaming.value || deleting.value)
  const hasPending = computed(() => messages.value.some(item => item.status === 'PENDING'))
  let selectionEpoch = 0
  let controller: AbortController | null = null

  /** 分页读取真实会话列表，加载失败保留已有列表与重试入口。 */
  async function loadHistory(more = false): Promise<void> {
    if (loadingHistory.value) return
    loadingHistory.value = true
    historyError.value = ''
    try {
      const page = await listConversations(more ? conversationPage.value + 1 : 1)
      const existing = more ? conversations.value : []
      conversations.value = [...new Map([...existing, ...page.records].map(item => [item.id, item])).values()]
      conversationPage.value = page.page
      hasMore.value = page.page < page.pages
    } catch (error) { historyError.value = normalizeApiError(error).message }
    finally { loadingHistory.value = false }
  }

  /** 打开会话的最新一页消息，使用请求序号防止快速切换造成串话。 */
  async function selectConversation(conversation: Conversation): Promise<void> {
    if (busy.value) return
    const epoch = ++selectionEpoch
    selected.value = conversation
    messages.value = []
    messageError.value = ''
    loading.value = true
    loadingOlder.value = false
    oldestPage.value = 1
    try {
      const first = await listMessages(conversation.id)
      const last = first.pages > 1 ? await listMessages(conversation.id, first.pages) : first
      if (epoch !== selectionEpoch) return
      messages.value = last.records
      oldestPage.value = Math.max(1, last.page)
    } catch (error) { if (epoch === selectionEpoch) messageError.value = normalizeApiError(error).message }
    finally { if (epoch === selectionEpoch) loading.value = false }
  }

  /** 向前翻页补充历史，保持消息顺序并避免切换会话后的迟到写入。 */
  async function loadOlder(): Promise<void> {
    if (!selected.value || oldestPage.value <= 1 || loadingOlder.value || busy.value) return
    const epoch = selectionEpoch
    const id = selected.value.id
    loadingOlder.value = true
    try {
      const page = await listMessages(id, oldestPage.value - 1)
      if (epoch !== selectionEpoch) return
      messages.value = [...new Map([...page.records, ...messages.value].map(item => [item.id, item])).values()]
      oldestPage.value = page.page
      await nextTick()
    } catch (error) { if (epoch === selectionEpoch) ElMessage.error(normalizeApiError(error).message) }
    finally { if (epoch === selectionEpoch) loadingOlder.value = false }
  }

  /** 新提问先返回空白工作区，真正发送时再创建会话，避免积累空记录。 */
  function newQuestion(): void {
    if (busy.value) return
    selectionEpoch++
    selected.value = null
    messages.value = []
    draft.value = ''
    messageError.value = ''
    loading.value = false
    loadingOlder.value = false
    oldestPage.value = 1
  }

  /** 将等待消息转换为失败，仅清除本地未交付内容，不伪造后端报告。 */
  function failPending(code: string): void {
    const pending = [...messages.value].reverse().find(item => item.role === 'ASSISTANT' && item.status === 'PENDING')
    if (pending) { pending.status = 'FAILED'; pending.content = null; pending.errorCode = code }
  }

  /** 发送一个问题或显式澄清续答；只在 start 后清空普通问题草稿。 */
  async function send(payload: SendMessagePayload = { content: draft.value.trim() }, clearDraft = true): Promise<void> {
    if (busy.value || loading.value || loadingOlder.value || hasPending.value || messageError.value) return
    if (!payload.content.trim() || payload.content.length > 2000) return
    streaming.value = true
    const activeController = new AbortController()
    controller = activeController
    let completed = false
    try {
      if (!selected.value) {
        selected.value = await createConversation(payload.content.trim().slice(0, 60))
        conversations.value.unshift(selected.value)
      }
      if (activeController.signal.aborted) return
      const id = selected.value.id
      await streamConversationMessage(id, payload, {
        /** start 才代表后端已保存问题，此时放入消息与等待占位。 */
        onStart(event) {
          if (activeController.signal.aborted || !event.userMessage || !event.assistantMessageId) return
          if (clearDraft) draft.value = ''
          messages.value.push(event.userMessage, {
            id: event.assistantMessageId, conversationId: id, role: 'ASSISTANT', content: null,
            status: 'PENDING', mode: 'KNOWLEDGE', modelConfigId: null, modelName: null,
            promptTokens: null, completionTokens: null, totalTokens: null, errorCode: null, citations: [],
            createdAt: event.userMessage.createdAt, updatedAt: event.userMessage.updatedAt,
          })
        },
        /** 正文等待 done 的完整报告一同展示，避免断流后呈现缺失引用的回答。 */
        onDelta() { /* 当前后端核验后一次性发送正文，界面以最终落库消息为准。 */ },
        /** 最终消息包含引用和范围，用它替换占位，不自由拼装核验结果。 */
        onDone(event) {
          if (activeController.signal.aborted || !event.assistantMessage) return
          completed = true
          const index = messages.value.findIndex(item => item.id === event.assistantMessage!.id)
          if (index >= 0) messages.value[index] = event.assistantMessage
        },
        /** 服务端技术失败单独展示，不能当成证据不足或正确拒答。 */
        onError(event) { if (!activeController.signal.aborted) failPending(event.errorCode ?? 'CHAT_GENERATION_FAILED') },
      }, activeController.signal)
      if (!completed && !activeController.signal.aborted) {
        failPending('CHAT_GENERATION_FAILED')
        // 只读回查取得运行编号，不重新发起模型生成。
        const first = await listMessages(id)
        const last = first.pages > 1 ? await listMessages(id, first.pages) : first
        messages.value = last.records
        oldestPage.value = Math.max(1, last.page)
      }
      await loadHistory()
    } catch (error) {
      if (!activeController.signal.aborted && !completed) {
        failPending(normalizeApiError(error).code)
        ElMessage.error(normalizeApiError(error).message)
      }
    } finally {
      if (activeController.signal.aborted && !completed) failPending('CLIENT_CANCELLED')
      streaming.value = false
      controller = null
    }
  }

  /** 续答只能使用当前最新的有效澄清卡片，后台继续校验配置修订。 */
  async function clarify(message: ChatMessage, scopes: string[]): Promise<void> {
    if (!canContinue(message, messages.value)) return
    try { await send(clarificationPayload(message, scopes), false) }
    catch (error) { ElMessage.error(normalizeApiError(error).message) }
  }

  /** 中断浏览器等待；不宣称模型厂商已经停止运行或计费。 */
  function stop(): void { controller?.abort() }

  /** 删除前明确确认，后端归档成功后才移除当前列表项。 */
  async function remove(conversation: Conversation): Promise<void> {
    if (busy.value) return
    try {
      await ElMessageBox.confirm(`删除“${conversation.title}”后，它将从你的对话列表移除。`, '删除这段对话？',
        { confirmButtonText: '删除对话', cancelButtonText: '保留', type: 'warning' })
      if (busy.value) return
      deleting.value = true
      await deleteConversation(conversation.id)
      deleting.value = false
      if (selected.value?.id === conversation.id) newQuestion()
      await loadHistory()
    } catch (error) {
      if (error !== 'cancel' && error !== 'close') ElMessage.error(normalizeApiError(error).message)
    } finally { deleting.value = false }
  }

  onBeforeUnmount(() => { selectionEpoch++; controller?.abort() })
  return { conversations, selected, messages, draft, loading, loadingOlder, loadingHistory, streaming,
    busy, hasPending, historyError, messageError, hasMore, oldestPage,
    loadHistory, selectConversation, loadOlder, newQuestion, send, clarify, stop, remove }
}
