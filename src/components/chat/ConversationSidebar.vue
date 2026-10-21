<script setup lang="ts">
import { computed, ref } from 'vue'
import BrandMark from '@/components/BrandMark.vue'
import WorkspaceIcon from '@/components/WorkspaceIcon.vue'
import type { Conversation } from '@/types/conversation'
const props = defineProps<{
  conversations: Conversation[]; selectedId: number | null; loading: boolean; disabled: boolean;
  hasMore: boolean; displayName: string; open: boolean; error: string
}>()
const emit = defineEmits<{ select: [conversation: Conversation]; create: []; delete: [conversation: Conversation];
  more: []; logout: []; close: []; retry: [] }>()
const filter = ref('')
const visible = computed(() => props.conversations.filter(item => item.title.toLowerCase().includes(filter.value.toLowerCase())))
</script>
<template>
  <aside class="workspace-sidebar" :class="{ 'workspace-sidebar--open': open }" aria-label="知识工作区导航">
    <a class="workspace-brand" href="/chat" @click.prevent="emit('create')"><BrandMark /><span>知序<small>企业知识工作区</small></span></a>
    <button class="mobile-close icon-button" aria-label="关闭侧栏" @click="emit('close')"><WorkspaceIcon name="close" /></button>
    <button class="new-question" :disabled="disabled" @click="emit('create')"><WorkspaceIcon name="plus" :size="18" /> 新的提问 <span>↗</span></button>
    <div class="sidebar-section-label">我的对话 <span>{{ conversations.length }}{{ hasMore ? '+' : '' }}</span></div>
    <label class="history-search"><WorkspaceIcon name="search" :size="15" /><input v-model="filter" placeholder="查找已加载的对话" aria-label="查找已加载的对话" /></label>
    <nav class="history-list" aria-label="历史对话">
      <div v-for="item in visible" :key="item.id" class="history-item" :class="{ 'history-item--selected': item.id === selectedId }">
        <button class="history-select" :disabled="disabled" :aria-current="item.id === selectedId ? 'page' : undefined" :title="item.title" @click="emit('select', item)"><WorkspaceIcon name="chat" :size="16" /><span>{{ item.title }}</span></button>
        <button class="history-delete icon-button" :disabled="disabled" :aria-label="`删除对话：${item.title}`" @click="emit('delete', item)"><WorkspaceIcon name="trash" :size="14" /></button>
      </div>
      <p v-if="error" class="sidebar-empty" role="alert">{{ error }}<button class="text-button" @click="emit('retry')">重新加载</button></p>
      <p v-else-if="!visible.length && !loading" class="sidebar-empty">{{ filter ? '未找到匹配的对话' : '从一个问题开始。\n你的对话会保存在这里。' }}</p>
      <p v-if="loading" class="sidebar-empty" role="status">正在加载对话…</p>
      <button v-if="hasMore" class="load-more" :disabled="loading || disabled" @click="emit('more')">加载更早的对话</button>
    </nav>
    <div class="sidebar-note"><WorkspaceIcon name="book" :size="18" /><div><strong>让答案有据可循</strong><p>从资料出发，回到事实。</p></div></div>
    <div class="sidebar-account"><span class="account-avatar">{{ displayName.slice(0, 1) || '我' }}</span><div><strong>{{ displayName || '员工' }}</strong><small>个人工作区</small></div><button class="icon-button" :disabled="disabled" aria-label="退出登录" title="退出登录" @click="emit('logout')"><WorkspaceIcon name="logout" :size="17" /></button></div>
  </aside>
</template>
