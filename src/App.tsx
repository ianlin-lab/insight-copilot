import { useEffect, useRef, useState, type ReactNode } from 'react'
import { analyzeFeedback } from './services/feedbackAnalyzer'
import type { AnalysisResult, AnalysisType, EvidenceItem, RiskLevel } from './types/analysis'
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
}

type TemplateKey = keyof typeof templates

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
          <img className="brand-mark" src="/favicon.png" alt="" />
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
        <a href="https://possible-polygon-620180.framer.app/" className="nav-cta">
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
    <section id="hero" className="hero reveal-section">
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
    <section id="usecases" className="usecases reveal-section">
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
  const principles = [
    ['Detect.', '不只判断情绪', '从对话和文本中识别情绪走向、问题类型、客户真实诉求和升级信号，不依赖关键词命中。'],
    ['Explain.', '不只输出标签', '每条结果都附带触发依据和置信度，客服与主管能看懂"为什么这条是高风险"。'],
    ['Act.', '不只做分析', '识别不是终点：直接输出可执行的下一步——转主管、退款审核、品牌公关或工单。'],
  ]
  const pipeline = [
    ['01', '客户反馈输入', 'INPUT'],
    ['02', 'AI 语义识别', 'DETECT'],
    ['03', '风险信号判断', 'SCORE'],
    ['04', '标签与解释输出', 'EXPLAIN'],
    ['05', '预警与工单建议', 'ACT'],
  ]

  return (
    <section id="logic" className="logic reveal-section">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">03 · Product Logic</span>
          <h2>从一句客户反馈，<br />到一个可执行的工单</h2>
          <p>五个步骤，一条可解释的链路。识别不是终点，输出可执行的下一步才是。</p>
        </div>
        <div className="logic-principles">
          {principles.map(([keyword, title, copy]) => (
            <div className="logic-principle-row" key={keyword}>
              <div className="logic-keyword">{keyword}</div>
              <div className="logic-copy">
                <h3>{title}</h3>
                <p>{copy}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="pipeline-head">分析链路 · Pipeline</div>
        <div className="pipeline-list">
          {pipeline.map(([num, title, role]) => (
            <div className="pipeline-row" key={num}>
              <span className="pipeline-num">{num}</span>
              <span className="pipeline-title">{title}</span>
              <span className="pipeline-role">{role}</span>
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
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [ticketCreated, setTicketCreated] = useState(false)
  const resultRef = useRef<HTMLDivElement>(null)
  const actionButtonLabel = result ? getActionButtonLabel(result) : ''

  useEffect(() => {
    let isMounted = true

    async function loadInitialResult() {
      const initialResult = await analyzeFeedback(templates.chat)
      if (isMounted) setResult(initialResult)
    }

    void loadInitialResult()

    return () => {
      isMounted = false
    }
  }, [])

  function selectTemplate(key: TemplateKey) {
    setCurrentTpl(key)
    setText(templates[key])
  }

  async function analyze() {
    setIsAnalyzing(true)
    try {
      const nextResult = await analyzeFeedback(text)
      setResult(nextResult)
      setTicketCreated(false)
      resultRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <section id="demo" className="demo reveal-section">
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
            ].map(([key, label]) => (
              <button type="button" key={key} className={`tpl-btn${currentTpl === key ? ' active' : ''}`} onClick={() => selectTemplate(key as TemplateKey)}>
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
          {result ? <div className="result" ref={resultRef}>
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
          </div> : null}
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
        <div className="credit">© 2026 iAN · Product Manager / AI Product Demo<br />Email: linxiayang65@gmail.com · Portfolio · GitHub</div>
      </div>
    </footer>
  )
}

function App() {
  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>('.reveal-section'))

    if (!sections.length) return

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
      sections.forEach((section) => section.classList.add('is-visible'))
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    )

    sections.forEach((section) => observer.observe(section))

    return () => observer.disconnect()
  }, [])

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
