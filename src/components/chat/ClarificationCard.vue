<script setup lang="ts">
import { ref } from 'vue'
import WorkspaceIcon from '@/components/WorkspaceIcon.vue'
const props = defineProps<{ options: { value: string; label: string }[]; disabled: boolean; expired: boolean; used: boolean; usedScopes: string[] }>()
const emit = defineEmits<{ continue: [scopes: string[]] }>()
const selected = ref<string[]>([...props.usedScopes])
const submitted = ref(false)
/** 地区多选在前端限制三项，真实可用选项仍由后端卡片决定。 */
function toggle(value: string): void {
  selected.value = selected.value.includes(value) ? selected.value.filter(item => item !== value)
    : selected.value.length < 3 ? [...selected.value, value] : selected.value
}
/** 提交后保留选择用于回看，不把已使用的卡片显示成新的待办。 */
function submit(): void { submitted.value = true; emit('continue', [...selected.value]) }
</script>
<template>
  <div class="clarification-card">
    <div class="clarification-heading"><strong>这次问题适用于哪里？</strong><small>可多选，最多 3 项</small></div>
    <div class="scope-options" role="group" aria-label="适用范围">
      <button v-for="option in options" :key="option.value" type="button" :aria-pressed="selected.includes(option.value)"
        :disabled="disabled || expired || (!selected.includes(option.value) && selected.length >= 3)" @click="toggle(option.value)">
        <span class="scope-check"><WorkspaceIcon v-if="selected.includes(option.value)" name="check" :size="12" /></span>{{ option.label }}
      </button>
    </div>
    <p v-if="expired" class="clarification-expired">{{ used || submitted ? '范围已提交，续答见下方。如需更换范围，请重新提问。' : '此卡片仅供回看。如需选择范围，请重新提问。' }}</p>
    <button v-else class="continue-button" :disabled="disabled || !selected.length" @click="submit">按所选范围继续 <WorkspaceIcon name="arrow" :size="16" /></button>
  </div>
</template>
