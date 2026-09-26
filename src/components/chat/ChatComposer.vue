<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  disabled: boolean
  streaming: boolean
}>()

const emit = defineEmits<{
  send: [content: string]
}>()

const content = ref('')

/**
 * 校验并发送当前输入内容，成功触发后清空输入框。
 */
function submitMessage(): void {
  const normalizedContent = content.value.trim()
  if (!normalizedContent || props.disabled) {
    return
  }
  emit('send', normalizedContent)
  content.value = ''
}

/**
 * 在未按 Shift 时使用回车发送，Shift+Enter 保留为换行。
 */
function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    submitMessage()
  }
}
</script>

<template>
  <div class="chat-composer">
    <textarea
      v-model="content"
      :disabled="disabled"
      maxlength="10000"
      placeholder="输入你的问题，按 Enter 发送…"
      rows="1"
      @keydown="handleKeydown"
    ></textarea>
    <button class="send-button" type="button" :disabled="disabled || !content.trim()" @click="submitMessage">
      <span v-if="streaming" class="send-button__loading"></span>
      <span v-else>发送</span>
    </button>
  </div>
  <p class="composer-hint">AI 的回答可能存在误差，重要信息请进一步确认。</p>
</template>
