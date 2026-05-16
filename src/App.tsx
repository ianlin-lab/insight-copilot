import { useRef, useState, type ReactNode } from 'react'
import './App.css'

const MAX_LENGTH = 1000

const templates = {
  chat: `客户：你好，我上周买的吹风机用了三次就坏了，已经申请过售后了。
客服：您好，麻烦提供一下订单号，我帮您查一下。
客户：订单号 A2041，这已经是我第三次反馈了，每次都让我重新提交。
客服：抱歉给您带来困扰，我这边再帮您加急一下。
客户：不用加急了，我要求今天全额退款，否则我会去黑猫和小红书公开投诉。真的非常失望，你们服务态度也太敷衍了。`,
  call: `[00:32] 客户：这已经是我第四次打电话了，每次都说会有人联系我，没人联系我。
[01:05] 客服：非常抱歉给您带来困扰，我先帮您记录一下情况……
[01:18] 客户：我不想再听抱歉了，给我找你们经理，要不就退钱。
[01:46] 客户：再处理不了我就去消协了，你们这种态度太离谱。`,
  review: `淘宝评价 ★ 1.0  包装严重破损，里面的产品也磕碰了。质量差，客服一直踢皮球，让我去找快递，快递让我找商家，已经准备 12315 投诉了，提醒大家别买。
微博 @品牌官方  这种售后真的让人寒心，建议大家慎重购买。同样的问题反馈了三次还是没人处理。`,
  blank: '',
}

type TemplateKey = keyof typeof templates

type AnalysisType = 'positive' | 'general' | 'negative' | 'risk' | 'unclear'
type RiskLevel = 'none' | 'low' | 'medium' | 'high'

type EvidenceItem = {
  text: string
  reason: string
}

type AnalysisResult = {
  analysisType: AnalysisType
  riskLevel: RiskLevel
  summary: string
  tags: {
    focusObjects: string[]
    emotionStates: string[]
    evaluationTendencies: string[]
    issueTypes: string[]
    userDemands: string[]
    riskSignals: string[]
    suggestedActions: string[]
  }
  evidence: EvidenceItem[]
  recommendedActions: string[]
  confidence: number
}

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

function analyzeText(input: string): AnalysisResult {
  const text = input.trim()
  if (text.length < 6 || !/[\u4e00-\u9fa5a-zA-Z0-9]/.test(text)) {
    return createResult({
      analysisType: 'unclear',
      riskLevel: 'none',
      summary: '当前文本过短或缺少可判断的客户反馈信息，暂无法形成可靠洞察。',
      tags: {
        focusObjects: ['无明确对象'],
        emotionStates: ['平静'],
        evaluationTendencies: ['中性反馈'],
        issueTypes: ['无明显问题'],
        userDemands: ['无明确诉求'],
        riskSignals: ['无明显风险'],
        suggestedActions: ['无需处理'],
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
    includesAny(text, ['产品', '吹风机', '商品']) ? '产品本身' : '',
    includesAny(text, ['质量', '坏', '故障', '磕碰']) ? '产品质量' : '',
    includesAny(text, ['功能', '效果', '噪音']) ? '产品功能' : '',
    includesAny(text, ['体验', '不好用', '好用']) ? '使用体验' : '',
    includesAny(text, ['外观', '设计', '颜色']) ? '外观设计' : '',
    includesAny(text, ['价格', '性价比', '贵', '便宜']) ? '价格/性价比' : '',
    includesAny(text, ['物流', '配送', '快递', '延迟']) ? '物流配送' : '',
    includesAny(text, ['包装', '破损']) ? '包装' : '',
    includesAny(text, ['客服', '服务', '态度']) ? '客服服务' : '',
    includesAny(text, ['售后', '退款', '换货', '维修', '补发']) ? '售后处理' : '',
    includesAny(text, ['活动', '规则']) ? '活动规则' : '',
    includesAny(text, ['保修', '质保']) ? '保修政策' : '',
    includesAny(text, ['品牌', '官方', '信任']) ? '品牌信任' : '',
  ].filter(Boolean)

  if (highRisk || (repeated && refund) || (strongNegative && refund)) {
    return createResult({
      analysisType: 'risk',
      riskLevel: 'high',
      summary: '文本中同时出现强负面情绪、重复反馈或公开投诉/退款诉求，已具备升级风险信号，需要优先介入。',
      tags: {
        focusObjects: focusObjects.length ? focusObjects : ['售后处理', '客服服务'],
        emotionStates: [strongNegative ? '强烈不满' : '愤怒', repeated ? '失望' : '焦虑'],
        evaluationTendencies: ['负向反馈', '不再购买', '品牌信任下降'],
        issueTypes: [
          includesAny(text, ['坏', '质量', '破损', '磕碰']) ? '产品质量' : '售后未处理',
          includesAny(text, ['客服', '敷衍', '踢皮球']) ? '服务态度差' : '',
          repeated ? '售后未处理' : '',
        ].filter(Boolean),
        userDemands: [
          refund ? '要求退款' : '',
          includesAny(text, ['赔偿', '补偿']) ? '要求赔偿' : '',
          includesAny(text, ['经理', '主管']) ? '要求主管介入' : '',
          includesAny(text, ['人工']) ? '要求人工处理' : '',
          '要求加急处理',
        ].filter(Boolean),
        riskSignals: [
          repeated ? '重复反馈' : '',
          repeated ? '多次未解决' : '',
          includesAny(text, ['今天', '马上', '立即', '30 分钟']) ? '强时限要求' : '',
          includesAny(text, ['投诉']) ? '投诉倾向' : '',
          includesAny(text, ['公开投诉', '小红书', '黑猫']) ? '公开投诉倾向' : '',
          includesAny(text, ['微博', '曝光']) ? '社媒曝光倾向' : '',
          includesAny(text, ['12315', '消协']) ? '监管投诉倾向' : '',
          includesAny(text, ['别买', '慎重购买']) ? '劝阻购买' : '',
          '高情绪强度',
        ].filter(Boolean),
        suggestedActions: ['主管介入', '退款审核', '补偿安抚', '高优先级工单', 'SLA 告警'],
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
        focusObjects: focusObjects.length ? focusObjects : ['产品本身', '使用体验'],
        emotionStates: ['平静', '轻微不满'],
        evaluationTendencies: ['混合反馈'],
        issueTypes: [normalNegative ? '使用体验' : '无明显问题'],
        userDemands: [question ? '咨询信息' : '表达评价', '提出建议'],
        riskSignals: ['低风险关注', '负面体验'],
        suggestedActions: ['记录反馈', '归入产品反馈池', '普通跟进'],
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
        focusObjects: focusObjects.length ? focusObjects : ['产品本身', '使用体验'],
        emotionStates: ['满意'],
        evaluationTendencies: ['正向反馈', includesAny(text, ['超出预期']) ? '超出预期' : '愿意推荐'],
        issueTypes: ['无明显问题'],
        userDemands: ['表达评价'],
        riskSignals: ['无明显风险'],
        suggestedActions: ['沉淀正向案例', '记录反馈'],
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
        focusObjects: focusObjects.length ? focusObjects : ['产品质量', '售后处理'],
        emotionStates: [strongNegative ? '不满' : '轻微不满'],
        evaluationTendencies: ['负向反馈', refund ? '低于预期' : '品牌信任下降'],
        issueTypes: [
          includesAny(text, ['破损', '包装']) ? '包装破损' : '',
          includesAny(text, ['延迟', '慢']) ? '物流延迟' : '',
          includesAny(text, ['故障', '坏']) ? '功能故障' : '',
          includesAny(text, ['噪音']) ? '噪音偏大' : '',
          includesAny(text, ['效果']) ? '效果不佳' : '',
          includesAny(text, ['客服', '服务']) ? '服务态度差' : '',
          refund ? '售后未处理' : '使用体验',
        ].filter(Boolean),
        userDemands: [refund ? '要求退款' : '寻求帮助'],
        riskSignals: [refund ? '轻微不满' : '负面体验', refund ? '低风险关注' : '无明显风险'],
        suggestedActions: [refund ? '售后跟进' : '普通跟进', refund ? '人工客服介入' : '记录反馈'],
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
      focusObjects: focusObjects.length ? focusObjects : ['无明确对象'],
      emotionStates: [question ? '疑惑' : '平静'],
      evaluationTendencies: ['中性反馈'],
      issueTypes: ['无明显问题'],
      userDemands: [question ? '咨询信息' : '无明确诉求'],
      riskSignals: ['无明显风险'],
      suggestedActions: [question ? '回复用户咨询' : '记录反馈'],
    },
    evidence: [{ text: question ? '咨询 / 如何 / 吗' : '中性描述', reason: '未识别到明显投诉、退款或公开化表达' }],
    recommendedActions: [question ? '回复用户咨询，并提供清晰规则或处理路径' : '记录反馈，无需升级处理'],
    confidence: question ? 76 : 64,
  })
}

const analysisTypeLabels: Record<AnalysisType, string> = {
  positive: '正向反馈 · Positive',
  general: '一般反馈 · General',
  negative: '负向反馈 · Negative',
  risk: '风险反馈 · Risk',
  unclear: '无法判断 · Unclear',
}

const riskLevelLabels: Record<RiskLevel, string> = {
  none: '无风险 · None',
  low: '低风险 · Low',
  medium: '中风险 · Medium',
  high: '高风险 · High',
}

function SparkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v4" />
      <path d="M12 18v4" />
      <path d="M2 12h4" />
      <path d="M18 12h4" />
    </svg>
  )
}

function PhoneIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  )
}

function Header() {
  return (
    <header className="nav">
      <div className="container nav-inner">
        <div className="brand">
          <span className="brand-mark"></span>
          <span>
            Escalation&nbsp;<em>/</em>&nbsp;升级风险识别
          </span>
        </div>
        <nav className="nav-links">
          <a href="#hero">概述</a>
          <a href="#usecases">应用场景</a>
          <a href="#logic">产品逻辑</a>
          <a href="#demo">体验 Demo</a>
        </nav>
        <a href="#" className="nav-cta">
          &nbsp;返回作品集&nbsp;
        </a>
      </div>
    </header>
  )
}

function Tag({ children, high, color }: { children: string; high?: boolean; color?: string }) {
  return (
    <span className={`tag${high ? ' high' : ''}`}>
      <span className="dot" style={color ? { background: color } : undefined}></span>
      {children}
    </span>
  )
}

function Hero() {
  return (
    <section id="hero" className="hero">
      <div className="container">
        <div className="hero-grid">
          <div className="hero-copy">
            <span className="eyebrow">Case Study · AI Product Demo</span>
            <h1>
              在投诉爆发前，
              <br />
              识别<em>升级风险</em>
            </h1>
            <p className="hero-sub">AI 客户升级风险识别 Demo</p>
            <p className="hero-en">AI Escalation Risk Detector for Customer Conversations</p>
            <p className="hero-desc">
              输入一段客服会话、电话转写或电商评论，AI 会识别其中的情绪升级、重复投诉、退款诉求、公开投诉风险，并给出可解释的判断依据和处理建议。
            </p>
            <div className="cta-row">
              <a href="#demo" className="btn btn-primary">体验 Demo</a>
              <a href="#usecases" className="btn btn-ghost">查看应用场景</a>
            </div>
          </div>

          <div className="hero-preview" aria-label="产品预览">
            <div className="preview-head">
              <div>
                <div className="preview-title">电商售后会话 · 客户多次反馈未解决</div>
                <div className="preview-sub">订单 #A2041 · 12:48 · 进行中</div>
              </div>
              <span className="preview-store">官方旗舰店</span>
            </div>
            <div className="hero-chat">
              <div className="hero-bubble">
                <div className="hero-avatar">客</div>
                <div className="hero-msg">这个问题<span className="hl-strong">我已经反馈第三次了</span>，怎么还是没人处理？</div>
              </div>
              <div className="hero-bubble">
                <div className="hero-avatar">客</div>
                <div className="hero-msg">如果今天再不解决，<span className="hl-strong">我要求全额退款</span>，否则<span className="hl-strong">我会去平台公开投诉</span>。</div>
              </div>
              <div className="hero-bubble">
                <div className="hero-avatar">客</div>
                <div className="hero-msg"><span className="hl-strong">真的非常失望</span>，你们服务态度太敷衍了。</div>
              </div>
            </div>
            <div className="hero-ai">
              <div className="hero-ai-head">
                <span className="ai-mark"><SparkIcon /></span>
                <span className="hero-ai-label">AI 识别结果</span>
              </div>
              <div className="ai-tags">
                <Tag high>高风险</Tag>
                <Tag color="#C49050">重复投诉</Tag>
                <Tag color="#A85F38">退款诉求</Tag>
                <Tag color="#B85C3E">公开投诉倾向</Tag>
              </div>
              <div className="ai-action">
                <span className="ai-action-pill">建议动作</span>
                <span>主管介入 + 启动退款审核流程</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function UseCases() {
  return (
    <section id="usecases" className="usecases">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">02 · Use Cases</span>
          <h2>三类反馈数据，<br />同一套识别能力</h2>
          <p>从在线客服会话、电话转写、到电商评论和社媒反馈，AI 从不同形态的客户文本中识别出同样的升级信号。</p>
        </div>
        <div className="uc-stack">
          <ChatUseCase />
          <CallUseCase />
          <ReviewUseCase />
        </div>
      </div>
    </section>
  )
}

function UseCaseShell({ num, title, source, input, output }: { num: string; title: string; source: string; input: ReactNode; output: ReactNode }) {
  return (
    <article className="uc-row">
      <header className="uc-row-head">
        <span className="uc-num">{num}</span>
        <h3>{title}</h3>
        <span className="uc-source">{source}</span>
      </header>
      <div className="uc-row-body">
        {input}
        <div className="uc-bridge" aria-hidden="true">
          <span className="uc-bridge-line"></span>
          <span className="uc-bridge-label">AI 识别</span>
          <span className="uc-bridge-line"></span>
        </div>
        {output}
      </div>
    </article>
  )
}

function OutputCard({ tags, fields, action }: { tags: ReactNode; fields: [string, string][]; action: string }) {
  return (
    <div className="uc-output">
      <div className="uc-output-head">AI 识别结果</div>
      <div className="uc-tags">{tags}</div>
      <dl className="uc-fields">
        {fields.map(([key, value]) => (
          <div key={key}>
            <dt>{key}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <div className="uc-action">
        <span className="pill">建议动作</span>
        <span>{action}</span>
      </div>
    </div>
  )
}

function ChatUseCase() {
  const input = (
    <div className="uc-input chat-pane">
      <div className="chat-pane-head">
        <span className="chat-store">官方旗舰店 · 售后客服</span>
        <span className="chat-meta">订单 #A2041 · 12:48</span>
      </div>
      <div className="chat">
        <div className="bubble from-customer"><div className="avatar cust">客</div><div className="msg">您好，我上周买的吹风机用了三次就坏了，已经申请过售后了。</div></div>
        <div className="bubble from-agent"><div className="avatar agent">服</div><div className="msg">您好，麻烦提供一下订单号，我帮您查一下。</div></div>
        <div className="bubble from-customer"><div className="avatar cust">客</div><div className="msg">订单号 <span className="mono-inline">A2041</span>，<span className="hl-strong">这已经是我第三次反馈了</span>，每次都让我重新提交。</div></div>
        <div className="bubble from-agent"><div className="avatar agent">服</div><div className="msg">抱歉给您带来困扰，我这边再帮您加急一下。</div></div>
        <div className="bubble from-customer"><div className="avatar cust">客</div><div className="msg">不用加急了，<span className="hl-strong">我要求今天全额退款</span>，否则我会去<span className="hl-strong">黑猫和小红书公开投诉</span>。</div></div>
      </div>
    </div>
  )
  const output = (
    <OutputCard
      tags={<><Tag high>高风险</Tag><Tag color="#C49050">重复投诉 ×3</Tag><Tag color="#A85F38">退款诉求</Tag><Tag color="#B85C3E">公开投诉倾向</Tag></>}
      fields={[['情绪', '不满 → 愤怒'], ['问题', '售后未处理'], ['诉求', '全额退款']]}
      action="主管介入 + 启动退款审核 + 标记重点跟进"
    />
  )
  return <UseCaseShell num="SCENE 01" title="在线客服会话" source="电商在线客服系统 · 实时对话" input={input} output={output} />
}

function CallUseCase() {
  const input = (
    <div className="uc-input call-pane">
      <div className="call-recorder">
        <div className="call-meta">
          <span className="call-icon-wrap"><PhoneIcon /></span>
          <div>
            <div className="call-title">客户来电 · 13800****128</div>
            <div className="call-sub">通话时长 02:14 · 已完成第 4 次来电</div>
          </div>
        </div>
        <div className="waveform" aria-hidden="true">
          {[30, 70, 50, 90, 60, 80, 40, 75, 55, 88, 45, 65, 30, 80, 55, 70, 35, 62].map((height, index) => <span key={index} style={{ height: `${height}%` }}></span>)}
        </div>
      </div>
      <div className="call-transcript">
        <div className="call-tr-head">ASR 转写文本</div>
        <div className="call-line"><span className="ts">00:32</span><span className="who">客户</span><span className="line"><span className="hl-strong">这已经是我第四次打电话了</span>，每次都说会有人联系我，<span className="hl-strong">没人联系我</span>。</span></div>
        <div className="call-line"><span className="ts">01:05</span><span className="who">客服</span><span className="line">非常抱歉给您带来困扰，我先帮您记录一下情况……</span></div>
        <div className="call-line"><span className="ts">01:18</span><span className="who">客户</span><span className="line"><span className="hl-strong">我不想再听抱歉了</span>，给我<span className="hl-strong">找你们经理</span>，要不就退钱。</span></div>
        <div className="call-line"><span className="ts">01:46</span><span className="who">客户</span><span className="line">再处理不了我就去消协了，你们这种态度太离谱。</span></div>
      </div>
    </div>
  )
  const output = (
    <OutputCard
      tags={<><Tag high>高风险</Tag><Tag color="#C49050">重复投诉 ×4</Tag><Tag color="#A85F38">承诺未兑现</Tag><Tag color="#B85C3E">升级主管</Tag></>}
      fields={[['情绪', '不耐烦 → 愤怒'], ['问题', '反复来电 / 悬置'], ['诉求', '升级处理 / 退款']]}
      action="触发 SLA 告警 + 主管 30 分钟内回拨"
    />
  )
  return <UseCaseShell num="SCENE 02" title="电话转写 · 客服通话记录" source="语音转文字 (ASR) · 升级风险识别" input={input} output={output} />
}

function ReviewUseCase() {
  const input = (
    <div className="uc-input review-pane">
      <div className="review-card">
        <div className="review-platform">
          <span className="platform-pill">淘宝评价</span>
          <span className="stars"><span className="s">★</span><span className="s gray">★</span><span className="s gray">★</span><span className="s gray">★</span><span className="s gray">★</span><span className="rating">1.0</span></span>
        </div>
        <div className="review-meta"><span className="reviewer">用户 m***8</span><span className="dot-sep">·</span><span className="product">购买商品：吹风机 · 大功率款</span></div>
        <div className="review-body">包装严重破损，里面的产品也磕碰了。<span className="hl-strong">质量差</span>，<span className="hl-strong">客服一直踢皮球</span>，让我去找快递，快递让我找商家，已经准备 <span className="hl-strong">12315 投诉</span>了，<span className="hl-strong">提醒大家别买</span>。</div>
      </div>
      <div className="weibo-card">
        <div className="weibo-head">
          <div className="weibo-avatar">L</div>
          <div>
            <div className="weibo-user">小琳的日常 <span className="weibo-handle">@xiaolin_daily</span></div>
            <div className="weibo-time">微博 · 2 小时前 · 公开</div>
          </div>
        </div>
        <div className="weibo-body"><span className="mention">@品牌官方</span> 这种售后真的让人寒心，<span className="hl-strong">建议大家慎重购买</span>。同样的问题反馈了三次还是没人处理 😤</div>
        <div className="weibo-stats"><span>转发 248</span><span>评论 96</span><span>点赞 1.2k</span></div>
      </div>
    </div>
  )
  const output = (
    <OutputCard
      tags={<><Tag high>高风险</Tag><Tag color="#B85C3E">公开投诉</Tag><Tag color="#A85F38">产品质量</Tag><Tag color="#C49050">服务态度</Tag><Tag color="#B85C3E">舆情风险</Tag></>}
      fields={[['来源', '电商 + 微博'], ['影响', '公开传播 + @官方'], ['诉求', '赔偿 / 责任明确']]}
      action="品牌公关关注 + 24h 内主动联系客户"
    />
  )
  return <UseCaseShell num="SCENE 03" title="电商评论 / 社媒反馈" source="公开评论 + 社媒舆情 · 品牌风险识别" input={input} output={output} />
}

function Logic() {
  const steps = [
    ['客户反馈输入', '在线会话 · 电话转写 · 评论舆情'],
    ['AI 语义识别', '情绪 · 意图 · 实体 · 诉求'],
    ['风险信号判断', '升级 · 重复 · 公开投诉倾向'],
    ['标签 + 解释', '结构化标签 + 判断依据'],
    ['预警 / 工单建议', '进入客服处理闭环'],
  ]
  const principles = [
    ['PRINCIPLE 01', 'Detect', '识别', '从对话和文本中识别情绪走向、问题类型、客户真实诉求和升级信号，不依赖关键词命中。'],
    ['PRINCIPLE 02', 'Explain', '解释', '每条结果都附带触发依据和置信度，客服与主管能看懂"为什么这条是高风险"。'],
    ['PRINCIPLE 03', 'Act', '建议动作', '识别不是终点：直接输出可执行的下一步——转主管、退款审核、品牌公关或工单。'],
  ]

  return (
    <section id="logic" className="logic">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">03 · Product Logic</span>
          <h2>从一句客户反馈，<br />到一个可执行的工单</h2>
          <p>五个步骤，一条可解释的链路。识别不是终点，输出可执行的下一步才是。</p>
        </div>
        <div className="flow-line">
          <div className="flow-rail" aria-hidden="true"></div>
          {steps.map(([title, copy], index) => (
            <div className="flow-step" key={title}>
              <div className={`flow-dot${index === steps.length - 1 ? ' last' : ''}`}><span>{index + 1}</span></div>
              <div className="flow-card">
                <div className="flow-icon"><SparkIcon /></div>
                <h4>{title}</h4>
                <p>{copy}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="flow-divider"><span>设计原则</span></div>
        <div className="principles">
          {principles.map(([num, title, en, copy]) => (
            <div className="principle" key={num}>
              <div className="num">{num}</div>
              <h3>{title}</h3>
              <div className="en">{en}</div>
              <p>{copy}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Demo() {
  const [currentTpl, setCurrentTpl] = useState<TemplateKey>('chat')
  const [text, setText] = useState(templates.chat)
  const [result, setResult] = useState<AnalysisResult>(() => analyzeText(templates.chat))
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [ticketCreated, setTicketCreated] = useState(false)
  const resultRef = useRef<HTMLDivElement>(null)
  const actionButtonLabel = getActionButtonLabel(result)

  function selectTemplate(key: TemplateKey) {
    setCurrentTpl(key)
    setText(templates[key])
  }

  function analyze() {
    setIsAnalyzing(true)
    window.setTimeout(() => {
      setResult(analyzeText(text))
      setTicketCreated(false)
      setIsAnalyzing(false)
      resultRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }, 700)
  }

  return (
    <section id="demo" className="demo">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">04 · Try it</span>
          <h2>把一段真实客户文本<br />交给 AI 分析</h2>
          <p>选择一个场景模板，或直接粘贴你自己的客户对话、评论、转写文本。点击「开始分析」，看 AI 输出什么。</p>
        </div>
        <div className="demo-shell">
          <div className="template-row">
            <span className="lbl">场景模板</span>
            {[
              ['chat', '在线客服会话'],
              ['call', '电话转写'],
              ['review', '电商 / 社媒评论'],
              ['blank', '空白：自定义输入'],
            ].map(([key, label]) => (
              <button key={key} className={`tpl-btn${currentTpl === key ? ' active' : ''}`} onClick={() => selectTemplate(key as TemplateKey)}>
                {label}
              </button>
            ))}
          </div>
          <div className="composer">
            <textarea
              maxLength={MAX_LENGTH}
              value={text}
              placeholder="选择上方模板快速填充示例，或粘贴一段客服会话、电话转写、评论文本，测试 AI 如何识别升级风险。"
              onChange={(event) => setText(event.target.value.slice(0, MAX_LENGTH))}
            />
            <div className="composer-footer">
              <span className="composer-meta">{text.length} / {MAX_LENGTH} 字符</span>
              <button className="btn-analyze" disabled={isAnalyzing} onClick={analyze}>{isAnalyzing ? '分析中…' : '开始分析'}</button>
            </div>
          </div>
          <p className="demo-hint">适用于客服会话、电话转写、电商评论、社媒反馈等客户反馈文本。非客户反馈类内容可能无法生成有效风险判断。</p>
          <div className="result" ref={resultRef}>
            <div className="result-head">
              <div className="left">
                <span className="ai-mark"><SparkIcon /></span>
                <span className="title">AI 分析结果 · Feedback Insight</span>
              </div>
              <div className="result-badges">
                <span className={`risk-badge ${result.riskLevel}`}><span className="dot"></span>{riskLevelLabels[result.riskLevel]}</span>
                <span className={`type-badge ${result.analysisType}`}>{analysisTypeLabels[result.analysisType]}</span>
              </div>
            </div>
            <div className="result-body">
              <div className="result-col">
                <div className="r-block">
                  <div className="k">摘要 · Summary</div>
                  <div className="v result-summary">{result.summary}</div>
                </div>
                <div className="r-block">
                  <div className="k">标签维度 · Tags</div>
                  <TagGroups result={result} />
                </div>
                <div className="r-block">
                  <div className="k">置信度 · Confidence</div>
                  <div className="confidence">
                    <span>Confidence</span>
                    <div className="confidence-bar"><span style={{ width: `${result.confidence}%` }}></span></div>
                    <span>{result.confidence}%</span>
                  </div>
                </div>
              </div>
              <div className="result-col">
                <div className="r-block">
                  <div className="k">判断依据 · Evidence</div>
                  <EvidenceList evidence={result.evidence} />
                </div>
                <div className="r-block">
                  <div className="k">建议动作 · Recommended Actions</div>
                  <div className="action-list">
                    {result.recommendedActions.map((action, index) => <div className="action-item" key={action}><span className="num">{index + 1}</span><span>{action}</span></div>)}
                  </div>
                </div>
              </div>
            </div>
            <div className="result-footer">
              <div className="footer-left">
                <span className="meta">分析耗时 1.2s · 模型版本 v0.4</span>
                <span className="footer-note">仅 Demo 演示，不会保存数据</span>
              </div>
              {actionButtonLabel ? (
                <button className={`btn-ticket${ticketCreated ? ' success' : ''}`} onClick={() => setTicketCreated(true)}>
                  {ticketCreated ? `✓ 已处理 · ${actionButtonLabel}` : actionButtonLabel}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function TagGroups({ result }: { result: AnalysisResult }) {
  const groups = [
    ['关注对象', result.tags.focusObjects],
    ['情绪状态', result.tags.emotionStates],
    ['评价倾向', result.tags.evaluationTendencies],
    ['问题类型', result.tags.issueTypes],
    ['用户诉求', result.tags.userDemands],
    ['风险信号', result.tags.riskSignals],
    ['建议动作', result.tags.suggestedActions],
  ] as const

  return (
    <div className="tag-groups">
      {groups.map(([label, tags]) => (
        <div className="tag-group" key={label}>
          <div className="tag-group-label">{label}</div>
          <div className="tag-group-values">
            {tags.map((tag) => <span className="insight-tag" key={tag}>{tag}</span>)}
          </div>
        </div>
      ))}
    </div>
  )
}

function EvidenceList({ evidence }: { evidence: EvidenceItem[] }) {
  return (
    <div className="evidence-list">
      {evidence.map((item) => (
        <div className="evidence-item" key={`${item.text}-${item.reason}`}>
          <div className="evidence-hit">{item.text}</div>
          <div className="evidence-reason">{item.reason}</div>
        </div>
      ))}
    </div>
  )
}

function getActionButtonLabel(result: AnalysisResult) {
  if (result.analysisType === 'unclear') return ''
  if (result.analysisType === 'positive') return '沉淀为正向案例'
  if (result.riskLevel === 'high') return '创建高优先级工单'
  if (result.riskLevel === 'medium' || result.riskLevel === 'low') return '创建跟进任务'
  return '记录反馈'
}

function Footer() {
  return (
    <footer>
      <div className="container footer-inner">
        <div>AI 客户升级风险识别 · Case Study</div>
        <div className="credit">DESIGN PROTOTYPE · 2026 · NEXT.JS + TAILWIND READY</div>
      </div>
    </footer>
  )
}

function App() {
  return (
    <>
      <Header />
      <Hero />
      <UseCases />
      <Logic />
      <Demo />
      <Footer />
    </>
  )
}

export default App
