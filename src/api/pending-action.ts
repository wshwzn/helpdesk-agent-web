import { requestData } from '@/api/http'
import type {
  PendingAction,
  PendingActionExecution,
  PendingActionStatus,
  UpdatePendingActionPayload,
} from '@/types/conversation'

/**
 * 查询指定对话中的确认操作，用于刷新后恢复工单草稿卡片。
 */
export function listPendingActions(
  conversationId: number,
  status?: PendingActionStatus,
): Promise<PendingAction[]> {
  return requestData<PendingAction[]>({
    method: 'GET',
    url: '/agent/actions',
    params: { conversationId, status },
  })
}

/**
 * 保存客户对工单草稿标题和描述的修改。
 */
export function updatePendingAction(
  actionId: number,
  payload: UpdatePendingActionPayload,
): Promise<PendingAction> {
  return requestData<PendingAction>({
    method: 'PATCH',
    url: `/agent/actions/${actionId}`,
    data: payload,
  })
}

/**
 * 确认草稿并创建真实工单。
 */
export function confirmPendingAction(
  actionId: number,
  version: number,
): Promise<PendingActionExecution> {
  return requestData<PendingActionExecution>({
    method: 'POST',
    url: `/agent/actions/${actionId}/confirm`,
    data: { version },
  })
}

/**
 * 取消尚未执行的工单草稿。
 */
export function cancelPendingAction(actionId: number, version: number): Promise<PendingAction> {
  return requestData<PendingAction>({
    method: 'POST',
    url: `/agent/actions/${actionId}/cancel`,
    data: { version },
  })
}
