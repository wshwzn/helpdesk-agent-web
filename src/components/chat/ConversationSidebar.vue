<script setup lang="ts">
import { ElButton, vLoading } from 'element-plus'
import { Delete } from '@element-plus/icons-vue'

import type { Conversation } from '@/types/conversation'
import { formatDateTime } from '@/utils/date'

defineProps<{
  conversations: Conversation[]
  selectedId: number | null
  loading: boolean
  disabled: boolean
  deletingId: number | null
}>()

const emit = defineEmits<{
  select: [conversation: Conversation]
  create: []
  delete: [conversation: Conversation]
}>()
</script>

<template>
  <aside class="conversation-sidebar">
    <div class="conversation-sidebar__heading">
      <div>
        <p class="section-kicker">工作区</p>
        <h2>客户对话</h2>
      </div>
      <el-button class="new-chat-button" type="primary" circle :disabled="disabled" @click="emit('create')">
        <span aria-label="新建对话">＋</span>
      </el-button>
    </div>

    <div v-loading="loading" class="conversation-list">
      <div
        v-for="conversation in conversations"
        :key="conversation.id"
        class="conversation-item"
        :class="{ 'conversation-item--active': conversation.id === selectedId }"
      >
        <button
          class="conversation-item__select"
          :disabled="disabled"
          type="button"
          @click="emit('select', conversation)"
        >
          <span class="conversation-item__icon">✦</span>
          <span class="conversation-item__content">
            <strong>{{ conversation.title }}</strong>
            <small>{{ formatDateTime(conversation.lastMessageAt || conversation.updatedAt) }}</small>
          </span>
        </button>
        <el-button
          class="conversation-item__delete"
          text
          circle
          type="danger"
          :icon="Delete"
          :loading="deletingId === conversation.id"
          :disabled="disabled"
          :aria-label="`删除对话：${conversation.title}`"
          @click.stop="emit('delete', conversation)"
        />
      </div>

      <div v-if="!loading && conversations.length === 0" class="conversation-empty">
        <span>还没有对话</span>
        <small>点击右上角加号开始咨询</small>
      </div>
    </div>
  </aside>
</template>
