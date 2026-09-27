<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElButton, ElInput, ElPopconfirm, ElTag } from 'element-plus'

import type { PendingAction, TicketPriority } from '@/types/conversation'
import { formatDateTime } from '@/utils/date'

const props = defineProps<{
  action: PendingAction
  busy: boolean
}>()

const emit = defineEmits<{
  update: [actionId: number, title: string, description: string, version: number]
  confirm: [actionId: number, version: number]
  cancel: [actionId: number, version: number]
}>()

const editing = ref(false)
const draftTitle = ref(props.action.title)
const draftDescription = ref(props.action.description)

const isPending = computed(() => props.action.status === 'PENDING')
const canSave = computed(() => {
  const title = draftTitle.value.trim()
  const description = draftDescription.value.trim()
  return title.length > 0
    && title.length <= 100
    && description.length > 0
    && description.length <= 2000
})
const statusLabel = computed(() => ({
  PENDING: '等待确认',
  EXECUTED: '已创建工单',
  CANCELLED: '已取消',
  EXPIRED: '已过期',
  INVALIDATED: '已失效',
}[props.action.status]))
const statusTagType = computed(() => ({
  PENDING: 'warning',
  EXECUTED: 'success',
  CANCELLED: 'info',
  EXPIRED: 'info',
  INVALIDATED: 'danger',
}[props.action.status] as 'warning' | 'success' | 'info' | 'danger'))
const priorityLabel = computed(() => ({
  LOW: '低优先级',
  MEDIUM: '中优先级',
  HIGH: '高优先级',
}[props.action.priority]))

watch(
  () => props.action,
  (action) => {
    if (!editing.value) {
      draftTitle.value = action.title
      draftDescription.value = action.description
    }
  },
  { deep: true },
)

/**
 * 进入编辑模式，并从最新服务端草稿重新填充表单。
 */
function startEditing(): void {
  draftTitle.value = props.action.title
  draftDescription.value = props.action.description
  editing.value = true
}

/**
 * 放弃本地编辑内容并恢复卡片展示状态。
 */
function stopEditing(): void {
  draftTitle.value = props.action.title
  draftDescription.value = props.action.description
  editing.value = false
}

/**
 * 校验草稿后通知页面保存标题和描述。
 */
function saveDraft(): void {
  if (!canSave.value || props.busy) {
    return
  }
  emit(
    'update',
    props.action.id,
    draftTitle.value.trim(),
    draftDescription.value.trim(),
    props.action.version,
  )
  editing.value = false
}

/**
 * 返回不同优先级对应的视觉修饰类名。
 */
function priorityClass(priority: TicketPriority): string {
  return `pending-action-card__priority--${priority.toLowerCase()}`
}
</script>

<template>
  <article class="pending-action-card" :class="`pending-action-card--${action.status.toLowerCase()}`">
    <header class="pending-action-card__header">
      <div class="pending-action-card__identity">
        <span class="pending-action-card__icon">单</span>
        <div>
          <small>AI 整理的工单草稿</small>
          <strong>{{ action.actionType === 'CREATE_TICKET' ? '创建客户工单' : action.actionType }}</strong>
        </div>
      </div>
      <el-tag :type="statusTagType" effect="light" round>{{ statusLabel }}</el-tag>
    </header>

    <div v-if="editing" class="pending-action-card__form">
      <label>
        <span>工单标题</span>
        <el-input v-model="draftTitle" maxlength="100" show-word-limit />
      </label>
      <label>
        <span>问题描述</span>
        <el-input
          v-model="draftDescription"
          type="textarea"
          :rows="4"
          maxlength="2000"
          resize="vertical"
          show-word-limit
        />
      </label>
    </div>

    <div v-else class="pending-action-card__content">
      <h3>{{ action.title }}</h3>
      <p>{{ action.description }}</p>
    </div>

    <div class="pending-action-card__priority">
      <span class="pending-action-card__priority-badge" :class="priorityClass(action.priority)">
        {{ priorityLabel }}
      </span>
      <span v-if="action.priorityReason">{{ action.priorityReason }}</span>
    </div>

    <div class="pending-action-card__meta">
      <span v-if="action.status === 'PENDING'">请在 {{ formatDateTime(action.expiresAt) }} 前确认</span>
      <span v-else-if="action.status === 'EXECUTED'">
        工单已创建<span v-if="action.ticketId"> · ID {{ action.ticketId }}</span>
      </span>
      <span v-else-if="action.status === 'CANCELLED'">你已取消本次创建</span>
      <span v-else-if="action.status === 'EXPIRED'">确认期限已结束，请让 AI 重新生成</span>
      <span v-else>AI 回答未完整生成，本草稿已自动失效</span>
    </div>

    <footer v-if="isPending" class="pending-action-card__actions">
      <template v-if="editing">
        <el-button :disabled="busy" @click="stopEditing">放弃修改</el-button>
        <el-button type="primary" :loading="busy" :disabled="!canSave" @click="saveDraft">
          保存草稿
        </el-button>
      </template>
      <template v-else>
        <el-button :disabled="busy" @click="startEditing">修改内容</el-button>
        <el-popconfirm
          title="取消后将不能再确认这份草稿，确定取消吗？"
          confirm-button-text="确定取消"
          cancel-button-text="返回"
          width="260"
          @confirm="emit('cancel', action.id, action.version)"
        >
          <template #reference>
            <el-button :disabled="busy">取消</el-button>
          </template>
        </el-popconfirm>
        <el-popconfirm
          title="将按当前内容创建真实工单，是否继续？"
          confirm-button-text="确认创建"
          cancel-button-text="再看看"
          width="250"
          @confirm="emit('confirm', action.id, action.version)"
        >
          <template #reference>
            <el-button type="primary" :loading="busy">确认创建</el-button>
          </template>
        </el-popconfirm>
      </template>
    </footer>
  </article>
</template>
