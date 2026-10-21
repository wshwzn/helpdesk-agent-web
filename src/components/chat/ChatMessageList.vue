<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import MarkdownContent from '@/components/chat/MarkdownContent.vue'
import KnowledgeSources from '@/components/chat/KnowledgeSources.vue'
import ClarificationCard from '@/components/chat/ClarificationCard.vue'
import WorkspaceIcon from '@/components/WorkspaceIcon.vue'
import type { ChatMessage, KnowledgeEvidence, KnowledgeAnswerReport } from '@/types/conversation'
import { answerLabel, canContinue, citedEvidence, isCancelled } from '@/utils/knowledge'
const props = defineProps<{ messages: ChatMessage[]; loading: boolean; busy: boolean; hasOlder: boolean; loadingOlder: boolean }>()
const emit = defineEmits<{ clarify: [message: ChatMessage, scopes: string[]]; source: [evidence: KnowledgeEvidence, report: KnowledgeAnswerReport]; older: []; refill: [content: string] }>()
const list = ref<HTMLElement | null>(null)
const stickToBottom = ref(true)
/** 阅读旧消息时不抢滚动位置，接近底部时才跟随新的回答。 */
function rememberScroll(): void {
  const el = list.value
  if (el) stickToBottom.value = el.scrollHeight - el.scrollTop - el.clientHeight < 100
}
/** 按服务端引用编号打开相应证据，不拼接管理员原文下载链接。 */
function openSource(message: ChatMessage, id: string): void {
  const report = message.knowledgeAnswer
  const evidence = report?.evidence.find(item => item.id === id)
  if (report && evidence) emit('source', evidence, report)
}
/** 找到这条回复对应的问题，仅回填编辑框，不自动再次计费调用。 */
function refill(message: ChatMessage): void {
  const before = props.messages.slice(0, props.messages.findIndex(item => item.id === message.id))
  emit('refill', before.reverse().find(item => item.role === 'USER')?.content ?? '')
}
/** 较早消息插入顶部时维持阅读位置；新会话或新问题则滚到底部。 */
async function syncScroll(next: string, previous: string): Promise<void> {
  const el = list.value
  const oldHeight = el?.scrollHeight ?? 0
  const firstChanged = next.split(':')[0] !== previous?.split(':')[0]
  await nextTick()
  if (!el) return
  if (firstChanged && props.loadingOlder) el.scrollTop += el.scrollHeight - oldHeight
  else if (stickToBottom.value || firstChanged) el.scrollTop = el.scrollHeight
}
watch(() => `${props.messages[0]?.id}:${props.messages.at(-1)?.id}:${props.messages.at(-1)?.status}:${props.messages.length}`, syncScroll, { flush: 'pre' })
</script>
<template>
  <div ref="list" class="answer-scroll" :aria-busy="loading" @scroll="rememberScroll">
    <div class="answer-column">
      <button v-if="hasOlder" class="load-more" :disabled="loadingOlder" @click="emit('older')">{{ loadingOlder ? '正在加载…' : '查看更早的消息' }}</button>
      <p v-if="loading" class="message-loading" role="status">正在读取对话…</p>
      <article v-for="message in messages.filter(item => item.role === 'USER' || item.role === 'ASSISTANT')" :key="message.id" class="answer-message" :class="`answer-message--${message.role.toLowerCase()}`">
        <template v-if="message.role === 'USER'"><div class="question-author">你</div><h2>{{ message.content }}</h2></template>
        <template v-else>
          <div class="answer-heading"><span class="answer-symbol"><WorkspaceIcon name="book" :size="17" /></span><strong>知序</strong><span class="answer-status" :class="{ 'answer-status--caution': message.status === 'FAILED' || ['CONFLICT', 'INSUFFICIENT_EVIDENCE'].includes(message.knowledgeAnswer?.answer.status ?? '') }">{{ answerLabel(message) }}</span></div>
          <div v-if="message.status === 'PENDING'" class="answer-waiting" role="status"><span class="small-spinner"></span><div>正在检索与核验资料<small>完成核验后会显示答案，请稍候。</small></div></div>
          <div v-else-if="message.status === 'FAILED'" class="answer-failure" role="alert"><strong>{{ isCancelled(message) ? '已停止等待这次回答' : '这次未能完成回答' }}</strong><p>没有可交付的核验结果。你可以稍后重新提问，或联系资料维护者。</p><code v-if="message.knowledgeRunId">运行编号 {{ message.knowledgeRunId }}</code><button class="text-button" :disabled="busy" @click="refill(message)">将问题重新填入输入框 <span>↗</span></button></div>
          <template v-else>
            <template v-if="message.knowledgeAnswer">
              <div v-if="message.knowledgeAnswer.reason === 'APPLICABILITY_REQUIRED'" class="clarification-intro">为了查找适用的制度，请先补充本次问题的范围。</div>
              <p v-else-if="message.knowledgeAnswer.answer.status === 'INSUFFICIENT_EVIDENCE'" class="answer-notice">现有资料不足以完整回答。以下仅列出有依据的信息。</p>
              <p v-else-if="message.knowledgeAnswer.answer.status === 'CONFLICT'" class="answer-notice">资料中的结论存在分歧，暂不能给出唯一答案。</p>
              <p v-else-if="message.knowledgeAnswer.answer.status === 'NEEDS_CLARIFICATION'" class="answer-notice">需要进一步明确问题的适用条件。</p>
              <div v-for="(claim, index) in message.knowledgeAnswer.answer.claims" :key="index" class="answer-claim"><MarkdownContent :content="claim.text" /><div class="inline-references"><button v-for="ref in claim.references" :key="ref.evidenceId + ref.quote" :aria-label="`查看引用 ${ref.evidenceId}`" @click="openSource(message, ref.evidenceId)">{{ ref.evidenceId }} <span>↗</span></button></div></div>
              <div v-for="(conflict, index) in message.knowledgeAnswer.answer.conflicts" :key="index" class="conflict-pair"><div v-for="(claim, side) in [conflict.first, conflict.second]" :key="side"><small>依据 {{ side + 1 }}</small><MarkdownContent :content="claim.text" /><button v-for="ref in claim.references" :key="ref.evidenceId" class="text-button" @click="openSource(message, ref.evidenceId)">查看 {{ ref.evidenceId }} ↗</button></div></div>
              <ul v-if="message.knowledgeAnswer.reason !== 'APPLICABILITY_REQUIRED' && message.knowledgeAnswer.answer.missingConditions.length" class="missing-conditions"><li v-for="condition in message.knowledgeAnswer.answer.missingConditions" :key="condition">{{ condition }}</li></ul>
              <ClarificationCard v-if="message.knowledgeAnswer.clarification?.scopeOptions.length" :options="message.knowledgeAnswer.clarification.scopeOptions" :disabled="busy" :expired="!canContinue(message, messages)" :used="messages.some(item => item.knowledgeAnswer?.continuationOfMessageId === message.id)" :used-scopes="messages.find(item => item.knowledgeAnswer?.continuationOfMessageId === message.id)?.applicabilityScopes ?? []" @continue="emit('clarify', message, $event)" />
              <div v-if="citedEvidence(message.knowledgeAnswer).length" class="source-strip"><span>参考来源</span><button v-for="source in citedEvidence(message.knowledgeAnswer)" :key="source.id" @click="emit('source', source, message.knowledgeAnswer!)"><WorkspaceIcon name="file" :size="14" /><span>{{ source.sourceName }}</span><small>{{ source.id }}</small><span>↗</span></button></div>
            </template>
            <template v-else><MarkdownContent v-if="message.content" :content="message.content" /><KnowledgeSources v-if="message.citations?.length" :citations="message.citations" /></template>
            <div v-if="message.modelName" class="answer-footer">{{ message.modelName }}<span v-if="message.totalTokens != null"> · {{ message.totalTokens.toLocaleString() }} tokens</span><span v-if="message.knowledgeAnswer?.knowledgeBaseName"> · {{ message.knowledgeAnswer.knowledgeBaseName }}</span></div>
          </template>
        </template>
      </article>
    </div>
  </div>
</template>
