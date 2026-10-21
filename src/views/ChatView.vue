<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElDialog } from 'element-plus'
import ConversationSidebar from '@/components/chat/ConversationSidebar.vue'
import ChatComposer from '@/components/chat/ChatComposer.vue'
import ChatMessageList from '@/components/chat/ChatMessageList.vue'
import EvidencePanel from '@/components/chat/EvidencePanel.vue'
import WorkspaceIcon from '@/components/WorkspaceIcon.vue'
import { useKnowledgeChat } from '@/composables/useKnowledgeChat'
import { useAuthStore } from '@/stores/auth'
import type { Conversation, KnowledgeAnswerReport, KnowledgeEvidence } from '@/types/conversation'

const auth = useAuthStore()
const router = useRouter()
const chat = useKnowledgeChat()
const { conversations, selected, messages, draft, loading, loadingOlder, loadingHistory, streaming,
  busy, hasPending, historyError, messageError, hasMore, oldestPage } = chat
const sidebarOpen = ref(false)
const helpOpen = ref(false)
const composer = ref<InstanceType<typeof ChatComposer> | null>(null)
const source = ref<{ evidence: KnowledgeEvidence; report: KnowledgeAnswerReport } | null>(null)
let sourceTrigger: HTMLElement | null = null
const suggestions = [
  { icon: 'book', title: '查制度', description: '找到规则，也找到依据', question: '普通员工在上海出差，每晚住宿报销上限是多少？' },
  { icon: 'compare', title: '做比较', description: '厘清不同范围的规定', question: '比较上海和北京普通员工每晚住宿报销上限。' },
  { icon: 'clock', title: '问流程', description: '把工作中的步骤理清', question: '出差结束后，应在多久内提交报销申请？' },
]

/** 示例只填入编辑框，用户确认发送前不创建会话或调用模型。 */
async function fillQuestion(content: string): Promise<void> {
  if (busy.value) return
  draft.value = content
  await nextTick()
  composer.value?.focus()
}
/** 新提问清理已展开的来源及移动侧栏，并保留延迟创建会话的行为。 */
function newQuestion(): void {
  if (busy.value) return
  chat.newQuestion(); source.value = null; sidebarOpen.value = false
}
/** 切换真实会话后关闭移动导航，避免旧证据滞留在新对话旁。 */
function selectConversation(conversation: Conversation): void {
  if (busy.value) return
  source.value = null; sidebarOpen.value = false
  void chat.selectConversation(conversation)
}
/** 用本条答案的快照打开出处，并记住键盘焦点返回位置。 */
function openSource(evidence: KnowledgeEvidence, report: KnowledgeAnswerReport): void {
  sourceTrigger = document.activeElement as HTMLElement | null
  source.value = { evidence, report }
}
/** 关闭来源后返回触发按钮，支持键盘连续阅读引用。 */
async function closeSource(): Promise<void> {
  source.value = null
  await nextTick()
  sourceTrigger?.focus()
}
/** 退出登录并回到入口页，鉴权状态仍由既有 store 管理。 */
async function logout(): Promise<void> { if (!busy.value) { auth.logout(); await router.replace('/login') } }
watch(() => selected.value?.id, () => { source.value = null })
onMounted(() => chat.loadHistory())
</script>
<template>
  <main class="knowledge-workspace" @keydown.esc="sidebarOpen = false">
    <button v-if="sidebarOpen" class="sidebar-scrim" aria-label="关闭导航" @click="sidebarOpen = false"></button>
    <ConversationSidebar :conversations="conversations" :selected-id="selected?.id ?? null" :loading="loadingHistory"
      :disabled="busy" :has-more="hasMore" :display-name="auth.user?.displayName ?? ''" :open="sidebarOpen" :error="historyError"
      @create="newQuestion" @select="selectConversation" @delete="chat.remove" @more="chat.loadHistory(true)"
      @retry="chat.loadHistory()" @logout="logout" @close="sidebarOpen = false" />
    <section class="knowledge-main">
      <header class="workspace-header">
        <div class="workspace-breadcrumb"><button class="icon-button mobile-menu" aria-label="打开导航" @click="sidebarOpen = true"><WorkspaceIcon name="menu" /></button><WorkspaceIcon name="book" :size="17" /><span>知识问答</span><span class="breadcrumb-divider">/</span><span class="breadcrumb-current">{{ selected?.title || '新的提问' }}</span></div>
        <button class="help-button" aria-label="使用说明" @click="helpOpen = true"><WorkspaceIcon name="help" :size="16" /><span>使用说明</span></button>
      </header>
      <div class="knowledge-body" :class="{ 'knowledge-body--with-source': source }">
        <section class="conversation-stage" :class="{ 'conversation-stage--welcome': !selected }">
          <template v-if="!selected">
            <div class="welcome-content">
              <div class="welcome-eyebrow"><span></span> YOUR KNOWLEDGE, IN ORDER</div>
              <div class="welcome-title-row"><div><h1>工作中的疑问，<br />从这里<span>找到依据。</span></h1><p>查找制度、比较规则、理清流程。<br class="small-screen-break" />让散落在资料里的知识，为你所用。</p></div>
                <div class="paper-stack" aria-hidden="true"><div class="paper-sheet paper-sheet--back"></div><div class="paper-sheet paper-sheet--middle"></div><div class="paper-sheet paper-sheet--front"><WorkspaceIcon name="file" :size="26" /><i></i><i></i><i></i><span><WorkspaceIcon name="check" :size="14" />有据可循</span></div><span class="paper-spark">✳</span></div>
              </div>
              <div class="welcome-composer"><ChatComposer ref="composer" v-model="draft" :disabled="busy" :streaming="streaming" @send="chat.send()" @stop="chat.stop" /></div>
              <div class="suggestions-heading"><span>从这些方向开始</span><small>点击填入示例问题</small></div>
              <div class="suggestion-grid"><button v-for="item in suggestions" :key="item.title" :disabled="busy" @click="fillQuestion(item.question)"><span class="suggestion-icon"><WorkspaceIcon :name="item.icon" :size="19" /></span><strong>{{ item.title }}<span>↗</span></strong><p>{{ item.description }}</p></button></div>
              <div class="welcome-note"><span class="note-rule"></span><p>每个答案，都应有来处。<small>资料不足时会明确说明，条件不完整时会先向你确认。</small></p></div>
            </div>
          </template>
          <template v-else>
            <div v-if="messageError" class="workspace-alert" role="alert">{{ messageError }}<button @click="chat.selectConversation(selected)">重新加载对话</button></div>
            <div v-if="hasPending && !streaming && !loading" class="workspace-alert">这段对话还有尚未结束的请求。<button @click="chat.selectConversation(selected)">刷新状态</button></div>
            <ChatMessageList :key="selected.id" :messages="messages" :loading="loading" :busy="busy || loading || Boolean(messageError) || hasPending" :has-older="oldestPage > 1" :loading-older="loadingOlder" @older="chat.loadOlder" @clarify="chat.clarify" @source="openSource" @refill="fillQuestion" />
            <div v-if="!loading && !messages.length && !messageError" class="empty-conversation"><WorkspaceIcon name="chat" :size="28" /><p>这段对话还没有问题，从下方开始提问。</p></div>
            <div class="conversation-composer"><ChatComposer ref="composer" v-model="draft" :disabled="loading || loadingOlder || busy || hasPending || Boolean(messageError)" :streaming="streaming" @send="chat.send()" @stop="chat.stop" /></div>
          </template>
          <footer v-if="!selected" class="workspace-footer"><span>知序 · 企业知识工作区</span><span>以资料为依据，以事实为边界</span></footer>
        </section>
        <EvidencePanel v-if="source" :key="source.report.checkedAt + source.evidence.id" :evidence="source.evidence" :report="source.report" @close="closeSource" />
      </div>
    </section>
    <el-dialog v-model="helpOpen" title="让提问更有结果" width="min(520px, 90vw)" class="workspace-help">
      <p>问题中带上具体地区、对象和事项，有助于找到适用资料。多个地区可以直接写在问题里；需要补充时，选择回答中的范围卡片即可。</p>
      <p>点击答案下的来源或 E1 等引用编号，可以查看当时引用的原文和版本。历史回答保留当时快照，不代表资料仍然有效。</p>
      <p>回答会在检索和核验完成后出现。每次新问题都应写明必要条件；普通追问不会自动继承历史地区或事实。资料不足、资料冲突与生成失败会分别提示。</p>
      <p>“停止等待”只结束当前页面的等待。后台可能继续完成回答，重新打开对话可查看最终状态。</p>
      <template #footer><button class="continue-button" @click="helpOpen = false">知道了</button></template>
    </el-dialog>
  </main>
</template>
