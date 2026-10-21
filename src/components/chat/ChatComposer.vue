<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import WorkspaceIcon from '@/components/WorkspaceIcon.vue'
const props = defineProps<{ modelValue: string; disabled: boolean; streaming: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: string]; send: []; stop: [] }>()
const input = ref<HTMLTextAreaElement | null>(null)
/** 输入框随问题长度增长，同时保留长问题的内部滚动。 */
async function resize(): Promise<void> {
  await nextTick()
  if (!input.value) return
  input.value.style.height = 'auto'
  input.value.style.height = `${Math.min(input.value.scrollHeight, 180)}px`
}
/** 更新问题草稿，是否清空由实际发送结果决定。 */
function update(event: Event): void { emit('update:modelValue', (event.target as HTMLTextAreaElement).value) }
/** 中文输入法选词不发送，普通回车发送，Shift 回车换行。 */
function keydown(event: KeyboardEvent): void {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing && event.keyCode !== 229) {
    event.preventDefault()
    if (!props.disabled && props.modelValue.trim()) emit('send')
  }
}
/** 从示例或重新填写操作聚焦输入框，方便继续编辑。 */
function focus(): void { input.value?.focus() }
defineExpose({ focus })
watch(() => props.modelValue, resize)
</script>
<template>
  <div class="question-box" :class="{ 'question-box--busy': streaming }">
    <label for="question-input" class="sr-only">输入你的知识问题</label>
    <textarea id="question-input" ref="input" :value="modelValue" :disabled="disabled" maxlength="2000" rows="2"
      placeholder="问一个工作中的问题，例如：上海出差的住宿上限是多少？" @input="update" @keydown="keydown" />
    <div class="question-box__tools">
      <span class="question-scope"><WorkspaceIcon name="book" :size="15" /> 根据企业资料回答</span>
      <div class="question-box__actions"><small v-if="modelValue.length > 1600">{{ modelValue.length }}/2000</small>
        <button v-if="streaming" class="stop-button" type="button" @click="emit('stop')"><span></span>停止等待</button>
        <button v-else class="submit-question" type="button" :disabled="disabled || !modelValue.trim()" aria-label="发送问题" @click="emit('send')"><WorkspaceIcon name="send" :size="20" /></button>
      </div>
    </div>
  </div>
  <p class="input-footnote"><span>答案附来源，请结合原文判断</span><span>Enter 发送 · Shift + Enter 换行</span></p>
</template>
