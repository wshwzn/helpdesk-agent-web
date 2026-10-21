import type { ChatMessage, KnowledgeAnswerReport, KnowledgeClaim, KnowledgeEvidence } from '@/types/conversation'

/** 合并普通结论与冲突双方，使引用列表只展示答案实际引用的证据。 */
export function answerClaims(report: KnowledgeAnswerReport): KnowledgeClaim[] {
  return [...report.answer.claims, ...report.answer.conflicts.flatMap(item => [item.first, item.second])]
}

/** 按本轮证据编号筛选引用，检索候选不能冒充已使用的来源。 */
export function citedEvidence(report: KnowledgeAnswerReport): KnowledgeEvidence[] {
  const used = new Set(answerClaims(report).flatMap(claim => claim.references.map(ref => ref.evidenceId)))
  return report.evidence.filter(item => used.has(item.id))
}

/** 只允许当前消息序列末尾的完整澄清卡片续答，旧卡片不得继续提交。 */
export function canContinue(message: ChatMessage, messages: ChatMessage[]): boolean {
  return message.id === messages.at(-1)?.id && message.status === 'COMPLETED'
    && message.role === 'ASSISTANT' && message.knowledgeAnswer?.reason === 'APPLICABILITY_REQUIRED'
    && Boolean(message.knowledgeAnswer.clarification?.scopeOptions.length)
}

/** 严格使用卡片给出的选项构造续答，不把地区选择当作新的独立问题。 */
export function clarificationPayload(message: ChatMessage, scopes: string[]) {
  const options = message.knowledgeAnswer?.clarification?.scopeOptions ?? []
  if (!scopes.length || scopes.length > 3 || new Set(scopes).size !== scopes.length
      || scopes.includes('ALL') || scopes.some(scope => !options.some(option => option.value === scope))) {
    throw new Error('请选择卡片中的 1 至 3 个适用范围')
  }
  return {
    content: `选择${scopes.map(scope => options.find(option => option.value === scope)!.label).join('、')}`,
    applicabilityScopes: scopes,
    clarificationMessageId: message.id,
  }
}

/** 统一识别当前页面中止和后端持久化中止，刷新后保留相同业务提示。 */
export function isCancelled(message: ChatMessage): boolean {
  return message.status === 'FAILED' && ['CLIENT_CANCELLED', 'STREAM_CANCELLED'].includes(message.errorCode ?? '')
}

/** 根据后端业务状态展示措辞，旧回答不能因有引用就冒充已核验。 */
export function answerLabel(message: ChatMessage): string {
  if (message.status === 'FAILED') return isCancelled(message) ? '已停止等待' : '未能完成回答'
  if (message.status === 'PENDING') return '正在处理'
  const report = message.knowledgeAnswer
  if (!report) return '历史回答 · 未附核验报告'
  if (report.reason === 'NOT_CONFIGURED') return '暂无可用知识库'
  if (report.reason === 'NO_MATCH') return '未找到可用依据'
  return { ANSWERABLE: '依据资料回答', NEEDS_CLARIFICATION: '需要补充条件',
    INSUFFICIENT_EVIDENCE: '证据尚不完整', CONFLICT: '资料存在分歧' }[report.answer.status]
}
