// 碎片 → PRD 草稿（流式），返回 JSON sections

import { NextRequest, NextResponse } from "next/server";
import { anthropic, DEFAULT_MODEL } from "@/lib/engine/llm";
import { buildGenerateMessages, getSystemPrompt } from "@/lib/engine/prompt";
import { nanoid } from "nanoid";
import type { PRD, PRDSection, SectionType } from "@/lib/engine/schema";

export async function POST(req: NextRequest) {
  const { fragment } = await req.json();
  if (!fragment?.trim()) {
    return NextResponse.json({ error: "fragment is required" }, { status: 400 });
  }

  const messages = buildGenerateMessages(fragment);
  const systemPrompt = getSystemPrompt();

  const message = await anthropic.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 4096,
    system: systemPrompt,
    messages,
  });

  const raw = message.content[0].type === "text" ? message.content[0].text : "";

  let parsed: { sections: Array<{ type: string; title: string; content: string }> };
  try {
    // 提取 JSON（模型偶尔会在前后加说明文字）
    const match = raw.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(match ? match[0] : raw);
  } catch {
    return NextResponse.json({ error: "LLM returned invalid JSON", raw }, { status: 500 });
  }

  const prd: PRD = {
    id: nanoid(),
    sourceFragment: fragment,
    template: "default",
    sections: parsed.sections.map((s) => ({
      id: nanoid(),
      title: s.title,
      type: s.type as SectionType,
      content: s.content,
      status: "draft",
    })) as PRDSection[],
    createdAt: new Date().toISOString(),
  };

  return NextResponse.json(prd);
}
