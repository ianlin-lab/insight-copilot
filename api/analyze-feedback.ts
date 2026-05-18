import { tagTaxonomy } from '../src/data/tagTaxonomy.js'
import type { AnalysisResult } from '../src/types/analysis.js'

type VercelRequest = {
  method?: string
  body?: unknown
}

type VercelResponse = {
  status: (code: number) => VercelResponse
  json: (body: unknown) => void
  setHeader: (name: string, value: string) => void
}

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string
    }
  }>
}

const DEFAULT_BASE_URL = 'https://api.gptsapi.net'
const DEFAULT_MODEL = 'gpt-4o-mini'

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/+$/, '')
}

function chatCompletionsUrl(baseUrl: string) {
  const normalized = normalizeBaseUrl(baseUrl)
  return normalized.endsWith('/v1') ? `${normalized}/chat/completions` : `${normalized}/v1/chat/completions`
}

function parseText(body: unknown) {
  if (typeof body === 'string') {
    try {
      const parsed = JSON.parse(body) as unknown
      return parseText(parsed)
    } catch {
      return ''
    }
  }

  if (typeof body === 'object' && body !== null && 'text' in body) {
    const text = (body as { text?: unknown }).text
    return typeof text === 'string' ? text : ''
  }

  return ''
}

function buildPrompt(text: string) {
  return `你是一个客户反馈洞察分析器。请分析用户输入的客户反馈文本，并返回严格 JSON。

要求：
1. 只能从下方现有标签体系中选择标签，不要创造新标签。
2. 如果没有命中，使用兜底标签，例如“无明确对象 / 无明显问题 / 无明确诉求 / 无明显风险”。
3. evidence 可以是判断依据，不要求必须逐字引用原文，但不能编造与输入无关的信息。
4. confidence 是 0 到 100 的数字。
5. 必须只返回 JSON，不要返回 markdown，不要包裹代码块，不要额外解释。

标签体系：
${JSON.stringify(tagTaxonomy, null, 2)}

JSON 结构必须完全符合：
{
  "analysisType": "positive" | "general" | "negative" | "risk" | "unclear",
  "riskLevel": "none" | "low" | "medium" | "high",
  "summary": "string",
  "tags": {
    "focusObjects": ["string"],
    "emotionStates": ["string"],
    "evaluationTendencies": ["string"],
    "issueTypes": ["string"],
    "userDemands": ["string"],
    "riskSignals": ["string"],
    "suggestedActions": ["string"]
  },
  "evidence": [
    { "text": "string", "reason": "string" }
  ],
  "recommendedActions": ["string"],
  "confidence": 0
}

客户反馈文本：
${text}`
}

function extractJson(content: string) {
  try {
    return JSON.parse(content) as AnalysisResult
  } catch {
    const match = content.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('Model did not return JSON')
    return JSON.parse(match[0]) as AnalysisResult
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store')

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const text = parseText(req.body).trim()
  if (!text) {
    return res.status(400).json({ error: 'Missing text' })
  }

  const apiKey = process.env.GPTS_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'Missing GPTS_API_KEY' })
  }

  const baseUrl = process.env.GPTS_BASE_URL || DEFAULT_BASE_URL
  const model = process.env.GPTS_MODEL || DEFAULT_MODEL

  try {
    const response = await fetch(chatCompletionsUrl(baseUrl), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        
        messages: [
          {
            role: 'system',
            content: '你只输出符合要求的 JSON。不要输出 markdown、代码块或额外解释。',
          },
          {
            role: 'user',
            content: buildPrompt(text),
          },
        ],
      }),
    })

    if (!response.ok) {
      const message = await response.text()
      return res.status(response.status).json({ error: 'LLM request failed', detail: message })
    }

    const data = (await response.json()) as ChatCompletionResponse
    const content = data.choices?.[0]?.message?.content
    if (!content) {
      return res.status(502).json({ error: 'LLM returned empty content' })
    }

    return res.status(200).json(extractJson(content))
  } catch (error) {
    console.error('Analyze feedback failed:', error)

    const err = error as Error & { cause?: unknown }

    return res.status(500).json({
      error: 'Analyze feedback failed',
      detail: err.message || 'Unknown error',
      cause: err.cause ? String(err.cause) : undefined,
    })
  }
}
