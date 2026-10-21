<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import WorkspaceIcon from '@/components/WorkspaceIcon.vue'
import type { KnowledgeAnswerReport, KnowledgeEvidence } from '@/types/conversation'
import { answerClaims } from '@/utils/knowledge'
const props = defineProps<{ evidence: KnowledgeEvidence; report: KnowledgeAnswerReport }>()
const emit = defineEmits<{ close: [] }>()
const closeButton = ref<HTMLButtonElement | null>(null)
const quotes = computed(() => [...new Set(answerClaims(props.report).flatMap(claim => claim.references)
  .filter(ref => ref.evidenceId === props.evidence.id).map(ref => ref.quote))])
/** 打开证据时把焦点移到关闭按钮，便于键盘用户返回回答。 */
function focusPanel(): void { closeButton.value?.focus() }
/** Escape 关闭证据；此侧面板非模态，不阻止访问原答案。 */
function onKey(event: KeyboardEvent): void { if (event.key === 'Escape') emit('close') }
onMounted(() => { focusPanel(); window.addEventListener('keydown', onKey) })
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>
<template>
  <aside class="evidence-panel" aria-label="答案引用依据">
    <header><span><WorkspaceIcon name="file" :size="17" /> 引用依据</span><button ref="closeButton" class="icon-button" aria-label="关闭引用依据" @click="emit('close')"><WorkspaceIcon name="close" /></button></header>
    <div class="evidence-panel__body">
      <span class="document-label">{{ evidence.id }} · 第 {{ evidence.chunkSequence }} 段</span>
      <h2>{{ evidence.sourceName }}</h2><p class="evidence-library">{{ report.knowledgeBaseName || '知识库资料' }}</p>
      <dl v-if="evidence.metadata" class="evidence-details"><div><dt>业务版本</dt><dd>{{ evidence.metadata.businessVersion }}</dd></div><div><dt>适用范围</dt><dd>{{ evidence.metadata.applicabilityScope === 'ALL' ? '通用资料' : evidence.metadata.applicabilityScope }}</dd></div><div><dt>当时生效时间</dt><dd>{{ evidence.metadata.validFrom?.replace('T', ' ') || '未记录' }}</dd></div></dl>
      <h3>答案引用原文</h3><blockquote v-for="quote in quotes" :key="quote">{{ quote }}</blockquote>
      <details class="full-evidence"><summary>查看完整检索片段</summary><p>{{ evidence.content }}</p></details>
      <div class="snapshot-note"><WorkspaceIcon name="clock" :size="16" /><p>这是回答时的证据快照。资料更新或撤回后，历史回答仍保留当时依据。<span>{{ report.checkedAt.replace('T', ' ').slice(0, 19) }}</span></p></div>
    </div>
  </aside>
</template>
