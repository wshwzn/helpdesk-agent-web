<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { vLoading } from 'element-plus'

import type { ChatMessage } from '@/types/conversation'

const props = defineProps<{
  messages: ChatMessage[]
  loading: boolean
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

watch(() => props.messages.map((message) => `${message.id}:${message.content}`).join('|'), scrollToLatestMessage)
</script>

<template>
  <div ref="scrollContainer" v-loading="loading" class="message-list">
    <div v-if="!loading && messages.length === 0" class="chat-welcome">
      <div class="chat-welcome__orb">AI</div>
      <p class="section-kicker">智能客户服务</p>
      <h2>有什么可以帮你？</h2>
      <p>描述你遇到的问题，我会结合已有信息尽力回答。无法解决时，还可以继续转人工工单。</p>
    </div>

    <article
      v-for="message in messages"
      :key="message.id"
      class="message-row"
      :class="`message-row--${message.role.toLowerCase()}`"
    >
      <div v-if="message.role === 'ASSISTANT'" class="message-avatar message-avatar--assistant">AI</div>
      <div class="message-bubble" :class="{ 'message-bubble--failed': message.status === 'FAILED' }">
        <p v-if="message.content" class="message-content">{{ message.content }}</p>
        <p v-else-if="message.status === 'PENDING'" class="message-pending">
          <span></span><span></span><span></span>
        </p>
        <p v-else class="message-error">回答生成失败，请稍后重试</p>
        <small v-if="message.role === 'ASSISTANT' && message.modelName" class="message-meta">
          {{ message.modelName }}
          <template v-if="message.totalTokens"> · {{ message.totalTokens }} tokens</template>
        </small>
      </div>
      <div v-if="message.role === 'USER'" class="message-avatar message-avatar--user">我</div>
    </article>
  </div>
</template>
