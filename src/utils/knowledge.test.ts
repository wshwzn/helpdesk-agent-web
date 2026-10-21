import { describe, expect, it } from 'vitest'
import { answerLabel, canContinue, citedEvidence, clarificationPayload, isCancelled } from './knowledge'
import type { ChatMessage, KnowledgeAnswerReport } from '@/types/conversation'

/** 构造含未引用候选的报告，检查来源和澄清边界，不涉及真实模型调用。 */
function report(): KnowledgeAnswerReport {
  return {
    schemaVersion: 3, reason: 'APPLICABILITY_REQUIRED', knowledgeBaseId: 1, knowledgeBaseName: '测试资料',
    checkedAt: '2026-10-21T12:00:00', applicabilityScope: null, applicabilityScopes: [], continuationOfMessageId: null,
    answer: { status: 'NEEDS_CLARIFICATION', claims: [{ text: '结论', references: [{ evidenceId: 'E1', quote: '原文' }] }],
      missingConditions: [], conflicts: [{ first: { text: '一', references: [{ evidenceId: 'E2', quote: '第二段' }] },
        second: { text: '二', references: [{ evidenceId: 'E3', quote: '第三段' }] } }] },
    evidence: ['E1', 'E2', 'E3', 'E4'].map(id => ({ id, documentId: 1, chunkSequence: 1, sourceName: id, content: '原文', metadata: null })),
    clarification: { originalQuestion: '住宿多少？', policyRevision: 1, topicIds: ['lodging'], scopeOptions: [
      { value: 'CN_SH', label: '上海' }, { value: 'CN_BJ', label: '北京' }, { value: 'CN_GZ', label: '广州' }, { value: 'CN_SZ', label: '深圳' }] },
  }
}
/** 创建可续答消息，其余历史字段按真实接口空值填充。 */
function message(): ChatMessage {
  return { id: 2, conversationId: 1, role: 'ASSISTANT', content: '请选择', status: 'COMPLETED',
    modelConfigId: null, modelName: null, promptTokens: null, completionTokens: null, totalTokens: null,
    errorCode: null, citations: [], knowledgeAnswer: report(), createdAt: '', updatedAt: '' }
}
describe('可信回答展示边界', () => {
  it('当前中止和刷新后的服务端中止显示一致，其他失败保持失败提示', () => {
    for (const errorCode of ['CLIENT_CANCELLED', 'STREAM_CANCELLED']) {
      const cancelled = { ...message(), status: 'FAILED' as const, errorCode }
      expect(isCancelled(cancelled)).toBe(true)
      expect(answerLabel(cancelled)).toBe('已停止等待')
    }
    expect(isCancelled({ ...message(), status: 'FAILED', errorCode: 'MODEL_ERROR' })).toBe(false)
    expect(isCancelled({ ...message(), errorCode: 'STREAM_CANCELLED' })).toBe(false)
  })
  it('只展示已引用证据并包含冲突双方，未引用候选不冒充来源', () => {
    expect(citedEvidence(report()).map(item => item.id)).toEqual(['E1', 'E2', 'E3'])
  })
  it('新消息出现或卡片失败后旧卡片不能续答', () => {
    const item = message()
    expect(canContinue(item, [item])).toBe(true)
    expect(canContinue(item, [item, { ...item, id: 3, status: 'FAILED' }])).toBe(false)
    expect(canContinue({ ...item, status: 'FAILED' }, [item])).toBe(false)
  })
  it('续答保留原卡片编号和多选范围', () => {
    expect(clarificationPayload(message(), ['CN_SH', 'CN_BJ'])).toEqual({ content: '选择上海、北京',
      applicabilityScopes: ['CN_SH', 'CN_BJ'], clarificationMessageId: 2 })
  })
  it('拒绝空选项、未知选项、重复范围、ALL和超过三项', () => {
    for (const scopes of [[], ['UNKNOWN'], ['CN_SH', 'CN_SH'], ['ALL'], ['CN_SH', 'CN_BJ', 'CN_GZ', 'CN_SZ']]) {
      expect(() => clarificationPayload(message(), scopes)).toThrow()
    }
  })
  it('历史未核验、业务不足和技术失败使用不同标签', () => {
    const item = message()
    expect(answerLabel({ ...item, knowledgeAnswer: null })).toContain('未附核验报告')
    expect(answerLabel({ ...item, status: 'FAILED' })).toBe('未能完成回答')
    item.knowledgeAnswer!.reason = 'REVIEWED'
    item.knowledgeAnswer!.answer.status = 'INSUFFICIENT_EVIDENCE'
    expect(answerLabel(item)).toBe('证据尚不完整')
  })
})
