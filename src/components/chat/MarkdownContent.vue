<script setup lang="ts">
import { computed } from 'vue'

import { renderMarkdown } from '@/utils/markdown'

const props = defineProps<{
  content: string
}>()

const renderedContent = computed(() => renderMarkdown(props.content))
</script>

<template>
  <div class="message-content message-markdown" v-html="renderedContent"></div>
</template>
