// 单节重生成

import { NextRequest, NextResponse } from "next/server";
import { anthropic, DEFAULT_MODEL } from "@/lib/engine/llm";
import { buildRefineMessages, getSystemPrompt } from "@/lib/engine/prompt";

export async function POST(req: NextRequest) {
  const { sectionType, sectionTitle, currentContent, instruction, originalFragment } =
    await req.json();

  if (!sectionType || !instruction) {
    return NextResponse.json({ error: "sectionType and instruction are required" }, { status: 400 });
  }

  const messages = buildRefineMessages(
    sectionType,
    sectionTitle,
    currentContent,
    instruction,
    originalFragment
  );

  const message = await anthropic.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 1024,
    system: getSystemPrompt(),
    messages,
  });

  const content = message.content[0].type === "text" ? message.content[0].text : "";
  return NextResponse.json({ content });
}
