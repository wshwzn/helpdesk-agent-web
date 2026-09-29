<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { vLoading } from 'element-plus'

import MarkdownContent from '@/components/chat/MarkdownContent.vue'
import KnowledgeSources from '@/components/chat/KnowledgeSources.vue'
import PendingActionCard from '@/components/chat/PendingActionCard.vue'
import type { ChatMessage, PendingAction } from '@/types/conversation'

const props = defineProps<{
  messages: ChatMessage[]
  pendingActions: PendingAction[]
  busyActionIds: number[]
  loading: boolean
}>()

const emit = defineEmits<{
  updateAction: [actionId: number, title: string, description: string, version: number]
  confirmAction: [actionId: number, version: number]
  cancelAction: [actionId: number, version: number]
}>()

const scrollContainer = ref<HTMLElement | null>(null)

/**
 * 将消息区域滚动到最新内容，确保流式文本始终可见。
 */
async function scrollToLatestMessage(): Promise<void> {
  await nextTick()
  if (scrollContainer.value) {
    scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight
  }
}

/**
 * 返回指定 AI 消息生成的操作卡片，保持卡片与回答的视觉关联。
 */
function actionsForMessage(messageId: number): PendingAction[] {
  return props.pendingActions.filter((action) => action.assistantMessageId === messageId)
}

/**
 * 判断当前操作是否正在保存、确认或取消。
 */
function isActionBusy(actionId: number): boolean {
  return props.busyActionIds.includes(actionId)
}

/**
 * 将卡片提交的草稿修改事件转交给聊天页面。
 */
function forwardActionUpdate(
  actionId: number,
  title: string,
  description: string,
  version: number,
): void {
  emit('updateAction', actionId, title, description, version)
}

/**
 * 将卡片确认事件转交给聊天页面。
 */
function forwardActionConfirmation(actionId: number, version: number): void {
  emit('confirmAction', actionId, version)
}

/**
 * 将卡片取消事件转交给聊天页面。
 */
function forwardActionCancellation(actionId: number, version: number): void {
  emit('cancelAction', actionId, version)
}

watch(
  () => [
    props.messages
      .map((message) => `${message.id}:${message.content}:${message.citations?.length ?? 0}`)
      .join('|'),
    props.pendingActions.map((action) => `${action.id}:${action.status}:${action.version}`).join('|'),
  ],
  scrollToLatestMessage,
)
</script>

<template>
  <div ref="scrollContainer" v-loading="loading" class="message-list">
    <div v-if="!loading && messages.length === 0" class="chat-welcome">
      <div class="chat-welcome__orb">AI</div>
      <p class="section-kicker">智能客户服务</p>
      <h2>有什么可以帮你？</h2>
      <p>描述你遇到的问题，我会结合已有信息尽力回答。无法解决时，还可以继续转人工工单。</p>
    </div>

    <template v-for="message in messages" :key="message.id">
      <article class="message-row" :class="`message-row--${message.role.toLowerCase()}`">
        <div v-if="message.role === 'ASSISTANT'" class="message-avatar message-avatar--assistant">AI</div>
        <div class="message-bubble" :class="{ 'message-bubble--failed': message.status === 'FAILED' }">
          <MarkdownContent
            v-if="message.content && message.role === 'ASSISTANT'"
            :content="message.content"
          />
          <p v-else-if="message.content" class="message-content">{{ message.content }}</p>
          <p v-else-if="message.status === 'PENDING'" class="message-pending">
            <span></span><span></span><span></span>
          </p>
          <p v-else class="message-error">回答生成失败，请稍后重试</p>
          <KnowledgeSources
            v-if="message.role === 'ASSISTANT' && message.citations?.length"
            :citations="message.citations"
          />
          <small v-if="message.role === 'ASSISTANT' && message.modelName" class="message-meta">
            {{ message.modelName }}
            <template v-if="message.totalTokens"> · {{ message.totalTokens }} tokens</template>
          </small>
        </div>
        <div v-if="message.role === 'USER'" class="message-avatar message-avatar--user">我</div>
      </article>

      <div v-if="actionsForMessage(message.id).length" class="pending-action-list">
        <PendingActionCard
          v-for="action in actionsForMessage(message.id)"
          :key="action.id"
          :action="action"
          :busy="isActionBusy(action.id)"
          @update="forwardActionUpdate"
          @confirm="forwardActionConfirmation"
          @cancel="forwardActionCancellation"
        />
      </div>
    </template>
  </div>
</template>
