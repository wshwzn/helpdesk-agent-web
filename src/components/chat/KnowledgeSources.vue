<script setup lang="ts">
import { ref } from 'vue'

import type { KnowledgeCitation } from '@/types/conversation'

const PREVIEW_LENGTH = 140

defineProps<{
  citations: KnowledgeCitation[]
}>()

const expandedIndexes = ref<number[]>([])
const sourcesExpanded = ref(false)

/**
 * 展开或收起整组参考来源，默认保持折叠以减少消息区域占用。
 */
function toggleSources(): void {
  sourcesExpanded.value = !sourcesExpanded.value
}

/**
 * 将知识片段压缩为空白统一的短预览，避免来源卡片默认占用过多空间。
 */
function previewContent(content: string): string {
  const normalized = content.trim().replace(/\s+/g, ' ')
  return normalized.length > PREVIEW_LENGTH
    ? `${normalized.slice(0, PREVIEW_LENGTH)}……`
    : normalized
}

/**
 * 判断片段是否足够长，需要提供展开和收起操作。
 */
function canExpand(content: string): boolean {
  return content.trim().replace(/\s+/g, ' ').length > PREVIEW_LENGTH
}

/**
 * 判断指定来源片段当前是否已经展开。
 */
function isExpanded(index: number): boolean {
  return expandedIndexes.value.includes(index)
}

/**
 * 切换指定来源片段的完整内容显示状态。
 */
function toggleExpanded(index: number): void {
  expandedIndexes.value = isExpanded(index)
    ? expandedIndexes.value.filter((item) => item !== index)
    : [...expandedIndexes.value, index]
}
</script>

<template>
  <section class="knowledge-sources">
    <header class="knowledge-sources__header">
      <button
        type="button"
        class="knowledge-sources__trigger"
        :aria-expanded="sourcesExpanded"
        @click="toggleSources"
      >
        <span class="knowledge-sources__summary">
          <strong>参考来源</strong>
          <small>{{ citations.length }} 个片段</small>
        </span>
        <span
          class="knowledge-sources__arrow"
          :class="{ 'knowledge-sources__arrow--expanded': sourcesExpanded }"
          aria-hidden="true"
        >⌄</span>
      </button>
    </header>

    <div v-show="sourcesExpanded" class="knowledge-sources__list">
      <article
        v-for="(citation, index) in citations"
        :key="`${citation.knowledgeBaseName}-${citation.sourceName}-${citation.chunkSequence}`"
        class="knowledge-source"
      >
        <div class="knowledge-source__meta">
          <strong>{{ citation.sourceName }}</strong>
          <span>第 {{ citation.chunkSequence }} 段</span>
        </div>
        <small>{{ citation.knowledgeBaseName }}</small>
        <p :class="{ 'knowledge-source__content--expanded': isExpanded(index) }">
          {{ isExpanded(index) ? citation.content : previewContent(citation.content) }}
        </p>
        <button
          v-if="canExpand(citation.content)"
          type="button"
          class="knowledge-source__toggle"
          :aria-expanded="isExpanded(index)"
          @click="toggleExpanded(index)"
        >
          {{ isExpanded(index) ? '收起片段' : '展开完整片段' }}
        </button>
      </article>
    </div>
  </section>
</template>
