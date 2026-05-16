import { tagTaxonomy } from '../data/tagTaxonomy'
import type { AnalysisResult } from '../types/analysis'

const TAGS = tagTaxonomy

function unique(items: string[]) {
  return Array.from(new Set(items))
}

function includesAny(input: string, keywords: string[]) {
  return keywords.some((keyword) => input.includes(keyword))
}

function createResult(result: AnalysisResult): AnalysisResult {
  return {
    ...result,
    tags: {
      focusObjects: unique(result.tags.focusObjects),
      emotionStates: unique(result.tags.emotionStates),
      evaluationTendencies: unique(result.tags.evaluationTendencies),
      issueTypes: unique(result.tags.issueTypes),
      userDemands: unique(result.tags.userDemands),
      riskSignals: unique(result.tags.riskSignals),
      suggestedActions: unique(result.tags.suggestedActions),
    },
    recommendedActions: unique(result.recommendedActions),
  }
}

function mockAnalyzeFeedback(input: string): AnalysisResult {
  const text = input.trim()
  if (text.length < 6 || !/[\u4e00-\u9fa5a-zA-Z0-9]/.test(text)) {
    return createResult({
      analysisType: 'unclear',
      riskLevel: 'none',
      summary: '当前文本过短或缺少可判断的客户反馈信息，暂无法形成可靠洞察。',
      tags: {
        focusObjects: [TAGS.focusObjects[13]],
        emotionStates: [TAGS.emotionStates[1]],
        evaluationTendencies: [TAGS.evaluationTendencies[1]],
        issueTypes: [TAGS.issueTypes[0]],
        userDemands: [TAGS.userDemands[0]],
        riskSignals: [TAGS.riskSignals[0]],
        suggestedActions: [TAGS.suggestedActions[0]],
      },
      evidence: [{ text: text || '空白输入', reason: '缺少完整语义或客户反馈上下文' }],
      recommendedActions: ['补充一段完整客服会话、评论、电话转写或咨询文本后再分析'],
      confidence: 0,
    })
  }

  const highRisk = includesAny(text, ['公开投诉', '小红书', '黑猫', '12315', '消协', '曝光', '微博', '投诉', '经理', '主管'])
  const repeated = includesAny(text, ['第三次', '第四次', '多次', '反复', '每次', '没人处理', '没人联系', '一直'])
  const refund = includesAny(text, ['退款', '退钱', '赔偿', '补偿', '换货', '维修', '补发'])
  const strongNegative = includesAny(text, ['愤怒', '非常失望', '太离谱', '敷衍', '寒心', '别买', '差评', '质量差', '坏了'])
  const normalNegative = includesAny(text, ['不满意', '不满', '失望', '破损', '延迟', '慢', '不好用', '噪音', '效果不好', '故障', '问题'])
  const positive = includesAny(text, ['满意', '很好', '好用', '超出预期', '推荐', '还会买', '喜欢', '不错', '五星', '赞'])
  const question = includesAny(text, ['吗', '？', '?', '怎么', '如何', '咨询', '想问', '保修', '活动', '规则', '价格'])
  const mixed = positive && (normalNegative || strongNegative || refund)

  const focusObjects = [
    includesAny(text, ['产品', '吹风机', '商品']) ? TAGS.focusObjects[0] : '',
    includesAny(text, ['质量', '坏', '故障', '磕碰']) ? TAGS.focusObjects[1] : '',
    includesAny(text, ['功能', '效果', '噪音']) ? TAGS.focusObjects[2] : '',
    includesAny(text, ['体验', '不好用', '好用']) ? TAGS.focusObjects[3] : '',
    includesAny(text, ['外观', '设计', '颜色']) ? TAGS.focusObjects[4] : '',
    includesAny(text, ['价格', '性价比', '贵', '便宜']) ? TAGS.focusObjects[5] : '',
    includesAny(text, ['物流', '配送', '快递', '延迟']) ? TAGS.focusObjects[6] : '',
    includesAny(text, ['包装', '破损']) ? TAGS.focusObjects[7] : '',
    includesAny(text, ['客服', '服务', '态度']) ? TAGS.focusObjects[8] : '',
    includesAny(text, ['售后', '退款', '换货', '维修', '补发']) ? TAGS.focusObjects[9] : '',
    includesAny(text, ['活动', '规则']) ? TAGS.focusObjects[10] : '',
    includesAny(text, ['保修', '质保']) ? TAGS.focusObjects[11] : '',
    includesAny(text, ['品牌', '官方', '信任']) ? TAGS.focusObjects[12] : '',
  ].filter(Boolean)

  if (highRisk || (repeated && refund) || (strongNegative && refund)) {
    return createResult({
      analysisType: 'risk',
      riskLevel: 'high',
      summary: '文本中同时出现强负面情绪、重复反馈或公开投诉/退款诉求，已具备升级风险信号，需要优先介入。',
      tags: {
        focusObjects: focusObjects.length ? focusObjects : [TAGS.focusObjects[9], TAGS.focusObjects[8]],
        emotionStates: [strongNegative ? TAGS.emotionStates[8] : TAGS.emotionStates[7], repeated ? TAGS.emotionStates[5] : TAGS.emotionStates[6]],
        evaluationTendencies: [TAGS.evaluationTendencies[2], TAGS.evaluationTendencies[7], TAGS.evaluationTendencies[8]],
        issueTypes: [
          includesAny(text, ['坏', '质量', '破损', '磕碰']) ? TAGS.issueTypes[1] : TAGS.issueTypes[10],
          includesAny(text, ['客服', '敷衍', '踢皮球']) ? TAGS.issueTypes[9] : '',
          repeated ? TAGS.issueTypes[10] : '',
        ].filter(Boolean),
        userDemands: [
          refund ? TAGS.userDemands[8] : '',
          includesAny(text, ['赔偿', '补偿']) ? TAGS.userDemands[9] : '',
          includesAny(text, ['经理', '主管']) ? TAGS.userDemands[14] : '',
          includesAny(text, ['人工']) ? TAGS.userDemands[13] : '',
          TAGS.userDemands[7],
        ].filter(Boolean),
        riskSignals: [
          repeated ? TAGS.riskSignals[4] : '',
          repeated ? TAGS.riskSignals[5] : '',
          includesAny(text, ['今天', '马上', '立即', '30 分钟']) ? TAGS.riskSignals[6] : '',
          includesAny(text, ['投诉']) ? TAGS.riskSignals[7] : '',
          includesAny(text, ['公开投诉', '小红书', '黑猫']) ? TAGS.riskSignals[8] : '',
          includesAny(text, ['微博', '曝光']) ? TAGS.riskSignals[9] : '',
          includesAny(text, ['12315', '消协']) ? TAGS.riskSignals[10] : '',
          includesAny(text, ['别买', '慎重购买']) ? TAGS.riskSignals[11] : '',
          TAGS.riskSignals[14],
        ].filter(Boolean),
        suggestedActions: [TAGS.suggestedActions[8], TAGS.suggestedActions[9], TAGS.suggestedActions[10], TAGS.suggestedActions[11], TAGS.suggestedActions[12]],
      },
      evidence: [
        repeated ? { text: '第三次 / 第四次 / 多次反馈', reason: '出现重复反馈或多次未解决信号' } : { text: '强负面表达', reason: '情绪强度较高，存在升级可能' },
        refund ? { text: '退款 / 退钱 / 赔偿', reason: '出现明确经济补偿类诉求' } : { text: '要求主管或人工介入', reason: '用户希望升级处理层级' },
        highRisk ? { text: '公开投诉 / 12315 / 小红书 / 微博', reason: '出现公开化或监管投诉倾向' } : { text: '售后未处理', reason: '问题仍未闭环' },
      ],
      recommendedActions: ['主管优先介入，先安抚情绪并确认责任边界', '启动退款/补偿审核，给出明确处理时限', '创建高优先级工单并触发 SLA 跟进'],
      confidence: 90,
    })
  }

  if (mixed) {
    return createResult({
      analysisType: 'general',
      riskLevel: 'low',
      summary: '文本包含正向认可和局部负面体验，整体属于混合反馈，建议记录优点并跟进具体问题。',
      tags: {
        focusObjects: focusObjects.length ? focusObjects : [TAGS.focusObjects[0], TAGS.focusObjects[3]],
        emotionStates: [TAGS.emotionStates[1], TAGS.emotionStates[3]],
        evaluationTendencies: [TAGS.evaluationTendencies[3]],
        issueTypes: [normalNegative ? TAGS.issueTypes[3] : TAGS.issueTypes[0]],
        userDemands: [question ? TAGS.userDemands[1] : TAGS.userDemands[2], TAGS.userDemands[3]],
        riskSignals: [TAGS.riskSignals[1], TAGS.riskSignals[3]],
        suggestedActions: [TAGS.suggestedActions[1], TAGS.suggestedActions[4], TAGS.suggestedActions[5]],
      },
      evidence: [
        { text: '好用 / 满意 / 推荐', reason: '存在正向评价倾向' },
        { text: '但是 / 不过 / 问题体验', reason: '同时存在待优化反馈' },
      ],
      recommendedActions: ['回复用户并感谢反馈', '将负面细节归入产品反馈池', '普通跟进具体问题是否需要售后处理'],
      confidence: 78,
    })
  }

  if (positive) {
    return createResult({
      analysisType: 'positive',
      riskLevel: 'none',
      summary: '文本以正向体验和推荐意愿为主，适合沉淀为正向案例或用户口碑素材。',
      tags: {
        focusObjects: focusObjects.length ? focusObjects : [TAGS.focusObjects[0], TAGS.focusObjects[3]],
        emotionStates: [TAGS.emotionStates[0]],
        evaluationTendencies: [TAGS.evaluationTendencies[0], includesAny(text, ['超出预期']) ? TAGS.evaluationTendencies[4] : TAGS.evaluationTendencies[6]],
        issueTypes: [TAGS.issueTypes[0]],
        userDemands: [TAGS.userDemands[2]],
        riskSignals: [TAGS.riskSignals[0]],
        suggestedActions: [TAGS.suggestedActions[3], TAGS.suggestedActions[1]],
      },
      evidence: [{ text: '满意 / 好用 / 推荐 / 超出预期', reason: '正向情绪和推荐倾向明显' }],
      recommendedActions: ['记录用户正向反馈', '可沉淀为正向案例，用于产品口碑或客服复盘'],
      confidence: 84,
    })
  }

  if (normalNegative || refund) {
    return createResult({
      analysisType: 'negative',
      riskLevel: refund ? 'medium' : 'low',
      summary: '文本反映了明确负面体验或售后诉求，但暂未出现公开投诉、监管投诉等高风险信号。',
      tags: {
        focusObjects: focusObjects.length ? focusObjects : [TAGS.focusObjects[1], TAGS.focusObjects[9]],
        emotionStates: [strongNegative ? TAGS.emotionStates[4] : TAGS.emotionStates[3]],
        evaluationTendencies: [TAGS.evaluationTendencies[2], refund ? TAGS.evaluationTendencies[5] : TAGS.evaluationTendencies[8]],
        issueTypes: [
          includesAny(text, ['破损', '包装']) ? TAGS.issueTypes[6] : '',
          includesAny(text, ['延迟', '慢']) ? TAGS.issueTypes[7] : '',
          includesAny(text, ['故障', '坏']) ? TAGS.issueTypes[2] : '',
          includesAny(text, ['噪音']) ? TAGS.issueTypes[4] : '',
          includesAny(text, ['效果']) ? TAGS.issueTypes[5] : '',
          includesAny(text, ['客服', '服务']) ? TAGS.issueTypes[9] : '',
          refund ? TAGS.issueTypes[10] : TAGS.issueTypes[3],
        ].filter(Boolean),
        userDemands: [refund ? TAGS.userDemands[8] : TAGS.userDemands[4]],
        riskSignals: [refund ? TAGS.riskSignals[2] : TAGS.riskSignals[3], refund ? TAGS.riskSignals[1] : TAGS.riskSignals[0]],
        suggestedActions: [refund ? TAGS.suggestedActions[6] : TAGS.suggestedActions[5], refund ? TAGS.suggestedActions[7] : TAGS.suggestedActions[1]],
      },
      evidence: [
        { text: '破损 / 故障 / 不满意 / 不好用', reason: '识别到负向体验描述' },
        refund ? { text: '退款 / 换货 / 维修', reason: '出现售后处理诉求' } : { text: '未出现公开投诉', reason: '暂无明显升级风险信号' },
      ],
      recommendedActions: refund ? ['创建跟进任务，由售后确认问题和处理方案', '必要时转人工客服补充安抚'] : ['记录负面反馈并普通跟进', '将问题归类后同步给对应业务团队'],
      confidence: refund ? 82 : 74,
    })
  }

  return createResult({
    analysisType: 'general',
    riskLevel: 'none',
    summary: '文本更接近咨询或中性表达，当前未发现明显负面体验或升级风险。',
    tags: {
      focusObjects: focusObjects.length ? focusObjects : [TAGS.focusObjects[13]],
      emotionStates: [question ? TAGS.emotionStates[2] : TAGS.emotionStates[1]],
      evaluationTendencies: [TAGS.evaluationTendencies[1]],
      issueTypes: [TAGS.issueTypes[0]],
      userDemands: [question ? TAGS.userDemands[1] : TAGS.userDemands[0]],
      riskSignals: [TAGS.riskSignals[0]],
      suggestedActions: [question ? TAGS.suggestedActions[2] : TAGS.suggestedActions[1]],
    },
    evidence: [{ text: question ? '咨询 / 如何 / 吗' : '中性描述', reason: '未识别到明显投诉、退款或公开化表达' }],
    recommendedActions: [question ? '回复用户咨询，并提供清晰规则或处理路径' : '记录反馈，无需升级处理'],
    confidence: question ? 76 : 64,
  })
}

export async function analyzeFeedback(input: string): Promise<AnalysisResult> {
  // TODO: replace mock analyzer with real LLM API call.
  return mockAnalyzeFeedback(input)
}
