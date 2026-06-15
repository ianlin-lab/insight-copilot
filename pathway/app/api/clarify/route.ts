// 信息不足时返回澄清问题

import { NextRequest, NextResponse } from "next/server";
import { anthropic, FAST_MODEL } from "@/lib/engine/llm";

const CLARIFY_SYSTEM = `你是一位资深产品经理。用户给了你一段需求碎片，但信息可能不足以生成完整 PRD。
请判断是否需要澄清，如需要，返回 JSON：
{ "needsClarification": true, "questions": ["问题1", "问题2", "问题3"] }
如信息充足，返回：
{ "needsClarification": false, "questions": [] }
最多提 3 个最关键的问题，不要凑数。只输出 JSON，不要其他内容。`;

export async function POST(req: NextRequest) {
  const { fragment } = await req.json();
  if (!fragment?.trim()) {
    return NextResponse.json({ error: "fragment is required" }, { status: 400 });
  }

  const message = await anthropic.messages.create({
    model: FAST_MODEL,
    max_tokens: 512,
    system: CLARIFY_SYSTEM,
    messages: [{ role: "user", content: fragment }],
  });

  const raw = message.content[0].type === "text" ? message.content[0].text : "{}";
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    const result = JSON.parse(match ? match[0] : raw);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ needsClarification: false, questions: [] });
  }
}
