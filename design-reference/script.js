// === Templates ===
const TEMPLATES = {
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

  blank: ``
};

// === Result presets per template ===
const RESULTS = {
  chat: {
    risk: { label: '高风险 · High Risk', cls: 'high' },
    sentiment: '中性 → 不满 → 愤怒（情绪持续升级）',
    issue: '售后未处理 / 重复投诉',
    demand: '全额退款 + 主管介入',
    signals: [
      '提及"第三次反馈" → 重复投诉信号',
      '明确要求"全额退款" → 强诉求信号',
      '提及"黑猫 / 小红书公开投诉" → 公开投诉倾向',
      '使用"非常失望 / 敷衍"等强情绪词'
    ],
    explain: '客户在三句话内出现"重复反馈 + 退款 + 公开投诉"三类升级信号，且情绪从客观陈述快速转为强烈不满，符合高风险模式。',
    confidence: 88,
    actions: [
      '立即转主管介入，优先安抚客户情绪',
      '启动退款审核流程，承诺明确处理时间',
      '标记为重点跟进工单，48 小时内回访'
    ]
  },
  call: {
    risk: { label: '高风险 · High Risk', cls: 'high' },
    sentiment: '不耐烦 → 愤怒（已多次接触未解决）',
    issue: '反复来电 / 承诺未兑现',
    demand: '升级处理 或 退款',
    signals: [
      '"第四次打电话" → 重复投诉 ×4',
      '"没人联系我" → 承诺未兑现',
      '"找你们经理" → 主动要求升级',
      '"不想再听抱歉" → 拒绝标准话术'
    ],
    explain: '客户已四次来电，本次明确拒绝程式化道歉并主动要求升级主管，属于典型升级前一刻信号，必须由主管直接介入。',
    confidence: 91,
    actions: [
      '触发 SLA 告警，主管 30 分钟内回拨',
      '检查历史工单，找出之前未闭环的根因',
      '主动回访 + 补偿方案，避免监管投诉'
    ]
  },
  review: {
    risk: { label: '高风险 · High Risk', cls: 'high' },
    sentiment: '不满 + 公开表达 + 劝阻他人',
    issue: '产品质量 + 服务态度 + 公开投诉',
    demand: '退款 / 赔偿 + 责任明确',
    signals: [
      '★1.0 + "12315 投诉" → 监管投诉倾向',
      '"质量差 / 客服踢皮球" → 产品 + 服务双痛点',
      '"提醒大家别买" → 劝阻他人，品牌伤害',
      '社媒 @品牌官方 → 公开施压'
    ],
    explain: '内容已具备"低评分 + 监管投诉 + 公开劝退 + 社媒@官方"四个公开化信号，对品牌口碑有直接负面影响。',
    confidence: 85,
    actions: [
      '品牌公关 24h 内主动联系，私下处理',
      '确认快递责任并提供补偿方案',
      '监控该评论扩散情况，必要时官方回应'
    ]
  },
  blank: {
    risk: { label: '低风险 · Low', cls: 'high' },
    sentiment: '需要更多文本以判断',
    issue: '—',
    demand: '—',
    signals: ['当前未识别到明确升级信号'],
    explain: '文本过短或不属于客户反馈类内容，模型无法给出可靠判断。建议至少提供一轮完整对话或一条完整反馈。',
    confidence: 0,
    actions: ['粘贴客户原始文本', '或选择上方任一场景模板']
  }
};

// === DOM refs ===
const composer = document.getElementById('composer');
const meta = document.getElementById('metaCounter');
const tplRow = document.getElementById('templateRow');
const analyzeBtn = document.getElementById('analyzeBtn');
const result = document.getElementById('result');

const rSentiment = document.getElementById('rSentiment');
const rIssue = document.getElementById('rIssue');
const rDemand = document.getElementById('rDemand');
const rSignals = document.getElementById('rSignals');
const rExplain = document.getElementById('rExplain');
const riskBadge = document.getElementById('riskBadge');

let currentTpl = 'chat';
const MAX = 1000;

// init
composer.value = TEMPLATES.chat;
updateMeta();

function updateMeta() {
  const n = composer.value.length;
  meta.textContent = `${n} / ${MAX} 字符`;
}

composer.addEventListener('input', () => {
  if (composer.value.length > MAX) composer.value = composer.value.slice(0, MAX);
  updateMeta();
});

tplRow.addEventListener('click', (e) => {
  const btn = e.target.closest('.tpl-btn');
  if (!btn) return;
  document.querySelectorAll('.tpl-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentTpl = btn.dataset.tpl;
  composer.value = TEMPLATES[currentTpl] || '';
  updateMeta();
  composer.focus();
});

analyzeBtn.addEventListener('click', () => {
  const txt = composer.value.trim();
  let key = currentTpl;
  if (!txt) key = 'blank';
  else if (currentTpl === 'blank') key = 'chat';

  analyzeBtn.disabled = true;
  const original = analyzeBtn.textContent;
  analyzeBtn.textContent = '分析中…';

  setTimeout(() => {
    renderResult(RESULTS[key]);
    analyzeBtn.disabled = false;
    analyzeBtn.textContent = original;
    const rect = result.getBoundingClientRect();
    if (rect.top > window.innerHeight - 200) {
      window.scrollBy({ top: rect.top - 80, behavior: 'smooth' });
    }
  }, 700);
});

function renderResult(data) {
  riskBadge.className = `risk-badge ${data.risk.cls}`;
  riskBadge.innerHTML = `<span class="dot"></span>${data.risk.label}`;
  rSentiment.textContent = data.sentiment;
  rIssue.textContent = data.issue;
  rDemand.textContent = data.demand;
  rSignals.innerHTML = data.signals.map(s => `<li>${s}</li>`).join('');
  rExplain.textContent = data.explain;
  const bar = document.querySelector('.confidence-bar > span');
  const pct = document.querySelector('.confidence > span:last-child');
  if (bar) bar.style.width = `${data.confidence}%`;
  if (pct) pct.textContent = `${data.confidence}%`;
  const actionList = document.querySelector('.action-list');
  actionList.innerHTML = data.actions.map((a, i) =>
    `<div class="action-item"><span class="num">${i+1}</span><span>${a}</span></div>`
  ).join('');

  // Reset ticket button to default state on each new analysis
  const tBtn = document.getElementById('ticketBtn');
  tBtn.classList.remove('success');
  tBtn.textContent = '创建高优先级工单';
  tBtn.disabled = false;
}

document.getElementById('ticketBtn').addEventListener('click', (e) => {
  const btn = e.currentTarget;
  if (btn.classList.contains('success')) return;
  btn.classList.add('success');
  btn.textContent = '✓ 工单已创建 · Ticket #ESC-2026-0481';
});
